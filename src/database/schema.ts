/**
 * PRAVA DESKTOP ONLINE — DATABASE SCHEMA & TYPES
 * SQLite DDL & TypeScript Data Interfaces for Offline-First Architecture
 */

export interface DbQuestion {
  id: number;
  ticket_id: number | null;
  topic_id: number | null;
  order_num: number;
  text_uzl: string;
  text_uzc: string | null;
  text_ru: string | null;
  explanation_uzl: string | null;
  explanation_uzc: string | null;
  explanation_ru: string | null;
  image_url: string | null;
  options_json: string; // JSON: Array<{ uzl: string; uzc?: string; ru?: string; is_correct?: boolean }>
  correct_option: number;
  updated_at: number;
  version?: number;
  is_deleted?: number;
}

export interface DbTopic {
  id: number;
  code: string;
  name_uzl: string;
  name_uzc: string | null;
  name_ru: string | null;
  order_num: number;
  question_count: number;
  updated_at: number;
}

export interface DbTicket {
  id: number;
  ticket_number: number;
  question_count: number;
  updated_at: number;
}

export interface DbExamSession {
  local_id: string; // UUID v4
  server_id: number | null;
  user_id?: string | number | null;
  exam_type: "EXAM" | "TICKET" | "MARATHON" | "TOPIC" | "WRONG_EXAM";
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  total_questions: number;
  correct_answers: number;
  score: number;
  duration_seconds: number;
  time_remaining_seconds: number;
  started_at: number;
  completed_at: number | null;
  answers_json: string; // JSON: Record<number, { selected: number; correct: number }>
  questions_json?: string; // JSON: Array<OfflineQuestion>
  current_index?: number;
  synced: number; // 0 = not synced, 1 = synced
}

export interface DbUserProgress {
  progress_key: string; // e.g. "ticket_1" or "topic_12"
  user_id?: string | number | null;
  progress_type: "TICKET" | "TOPIC" | "MARATHON";
  total_items: number;
  completed_items: number;
  correct_count: number;
  best_score: number;
  passed: number; // 0 or 1
  updated_at: number;
}

export interface DbSavedQuestion {
  question_id: number;
  user_id?: string | number | null;
  saved_at: number;
  is_deleted: number; // 0 = active, 1 = tombstone (deleted offline, to be synced)
  synced: number; // 0 = pending sync, 1 = synced
}

export interface DbWrongAnswer {
  question_id: number;
  user_id?: string | number | null;
  wrong_count: number;
  last_wrong_at: number;
}

export type OutboxAction =
  | "SUBMIT_EXAM"
  | "SAVE_QUESTION"
  | "UNSAVE_QUESTION"
  | "UPDATE_PROGRESS"
  | "UPDATE_SETTINGS";

export interface DbOutboxItem {
  id: string; // UUID v4
  user_id?: string | number | null;
  action_type: OutboxAction;
  endpoint: string;
  http_method: "POST" | "PUT" | "DELETE" | "PATCH";
  payload_json: string;
  status: "PENDING" | "IN_FLIGHT" | "FAILED" | "SYNCED";
  retry_count: number;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

export interface DbSyncMeta {
  key: string;
  value: string;
  updated_at: number;
}

/**
 * SQLite DDL (Data Definition Language) table creation statements
 */
export const SQLITE_INIT_SCRIPTS: string[] = [
  // 1. Questions Table
  `CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY,
    ticket_id INTEGER,
    topic_id INTEGER,
    order_num INTEGER DEFAULT 0,
    text_uzl TEXT NOT NULL,
    text_uzc TEXT,
    text_ru TEXT,
    explanation_uzl TEXT,
    explanation_uzc TEXT,
    explanation_ru TEXT,
    image_url TEXT,
    options_json TEXT NOT NULL,
    correct_option INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_questions_ticket ON questions(ticket_id);`,
  `CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);`,

  // 2. Topics Table
  `CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_uzl TEXT NOT NULL,
    name_uzc TEXT,
    name_ru TEXT,
    order_num INTEGER DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
  );`,

  // 3. Tickets Table
  `CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY,
    ticket_number INTEGER NOT NULL UNIQUE,
    question_count INTEGER DEFAULT 20,
    updated_at INTEGER NOT NULL
  );`,

  // 4. Exam Sessions Table (WAL-safe crash recovery)
  `CREATE TABLE IF NOT EXISTS exam_sessions (
    local_id TEXT PRIMARY KEY,
    server_id INTEGER,
    exam_type TEXT NOT NULL,
    status TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    time_remaining_seconds INTEGER NOT NULL DEFAULT 1200,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    answers_json TEXT NOT NULL DEFAULT '{}',
    questions_json TEXT,
    current_index INTEGER NOT NULL DEFAULT 0,
    synced INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);`,

  // 5. User Progress Table
  `CREATE TABLE IF NOT EXISTS user_progress (
    progress_key TEXT PRIMARY KEY,
    progress_type TEXT NOT NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    completed_items INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    best_score INTEGER NOT NULL DEFAULT 0,
    passed INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );`,

  // 6. Saved Questions Table (Bookmarks with tombstone support)
  `CREATE TABLE IF NOT EXISTS saved_questions (
    question_id INTEGER PRIMARY KEY,
    saved_at INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    synced INTEGER NOT NULL DEFAULT 0
  );`,

  // 7. Wrong Answers Table
  `CREATE TABLE IF NOT EXISTS wrong_answers (
    question_id INTEGER PRIMARY KEY,
    wrong_count INTEGER NOT NULL DEFAULT 1,
    last_wrong_at INTEGER NOT NULL
  );`,

  // 8. Outbox Queue Table (For Offline-First Mutations)
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action_type TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    http_method TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id);`,

  // 9. Sync Metadata Table (Bidirectional sync cursors & versions)
  `CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`
];
