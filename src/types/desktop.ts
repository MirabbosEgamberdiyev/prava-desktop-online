export interface DesktopUser {
  id: number;
  name: string;
  last_name: string | null;
  group_name: string | null;
  avatar: string | null;
  created_at?: string;
  last_active?: string;
}

export interface UserStats {
  user_id: number;
  total_exams: number;
  total_correct: number;
  total_wrong: number;
  best_score: number;
  last_exam_date: string | null;
}

export interface ExamResult {
  id: number;
  user_id: number;
  score: number;
  total_questions: number;
  correct_answers: number;
  duration_seconds: number;
  exam_type: string;
  created_at: string;
}

export interface OfflineTopic {
  id: number;
  code: string | null;
  name_uzl: string;
  name_uzc: string | null;
  name_en: string | null;
  name_ru: string | null;
  question_count: number;
}

export interface OfflineQuestion {
  id: number;
  topic_id: number | null;
  order_num: number;
  text_uzl: string;
  text_uzc: string | null;
  text_en: string | null;
  text_ru: string | null;
  image_path: string | null;
  options_json: string;
  correct_option: number;
  explanation_uzl: string | null;
  explanation_uzc: string | null;
  explanation_en: string | null;
  explanation_ru: string | null;
}

export interface QuestionOption {
  index: number;
  uzl: string;
  uzc: string;
  en?: string;
  ru: string;
}

export interface OfflineTicket {
  id: number;
  topic_id: number | null;
  ticket_number: number;
  name_uzl: string;
  name_uzc: string | null;
  name_en: string | null;
  name_ru: string | null;
  duration_minutes: number;
  passing_score: number;
  question_count: number;
  is_blocked?: boolean;
}

export interface TicketStat {
  ticket_id: number;
  times_done: number;
  times_passed: number;
  total_seconds: number;
  best_correct: number;
  last_score: number | null;
  last_done_at: string | null;
}

export interface WrongAnswerEntry {
  wrong_count: number;
  last_seen: string;
  question: OfflineQuestion;
}

export interface SavedQuestionEntry {
  saved_at: string;
  question: OfflineQuestion;
}

export interface AdminSavedQuestionEntry {
  user_id: number;
  user_name: string;
  saved_at: string;
  question: OfflineQuestion;
}

export interface TopicReadiness {
  topic_id: number;
  name_uzl: string;
  name_uzc: string | null;
  name_en: string | null;
  name_ru: string | null;
  total: number;
  seen: number;
  known: number;
  mastered: number;
}

export interface ReadinessStats {
  total_questions: number;
  seen_questions: number;
  known_questions: number;
  mastered_questions: number;
  wrong_questions: number;
  readiness_pct: number;
  topics: TopicReadiness[];
}

export interface TicketReadinessStat {
  ticket_id: number;
  ticket_number: number;
  name_uzl: string;
  name_uzc: string | null;
  name_en: string | null;
  name_ru: string | null;
  times_done: number;
  fast_perfect_count: number;
  mid_good_count: number;
  slow_poor_count: number;
  last_score: number | null;
  last_duration: number | null;
  readiness: "ready" | "average" | "not_ready" | "untouched";
}

export interface QuestionReadinessStat {
  total: number;
  ready: number;
  average: number;
  weak: number;
  untouched: number;
}

export interface QuestionStatDetail {
  question_id: number;
  order_num: number;
  text_uzl: string;
  text_uzc: string | null;
  text_en: string | null;
  text_ru: string | null;
  topic_id: number | null;
  topic_name_uzl: string | null;
  topic_name_uzc: string | null;
  topic_name_en: string | null;
  topic_name_ru: string | null;
  correct_count: number;
  total_attempts: number;
  readiness: "ready" | "average" | "weak" | "untouched";
}

export interface FullStats {
  ticket_stats: TicketReadinessStat[];
  ticket_total: number;
  ticket_ready: number;
  ticket_average: number;
  ticket_not_ready: number;
  ticket_untouched: number;
  question_readiness: QuestionReadinessStat;
  topic_readiness: TopicReadiness[];
}

export type AppScreen =
  | "users"
  | "home"
  | "exam"
  | "marathon"
  | "topics"
  | "topic-detail"
  | "stats"
  | "biletlar"
  | "ticket-exam"
  | "wrong-answers"
  | "wrong-exam"
  | "saved-questions"
  | "leaderboard"
  | "history"
  | "admin-login"
  | "admin-dashboard";
