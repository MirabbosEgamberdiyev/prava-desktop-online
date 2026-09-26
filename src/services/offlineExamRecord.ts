/**
 * Locally graded exams → POST /api/v2/exams/record-offline (via the outbox).
 *
 * Every desktop exam that is graded on the client (questions came from the local
 * IndexedDB, no server session exists) is reported with this contract:
 *   { clientSessionId, examType, targetId, durationSeconds, completedAt,
 *     totalQuestions, answers: [{ questionId, selectedOptionIndex|null, timeSpentSeconds }] }
 * ALL questions are included — unanswered ones with selectedOptionIndex = null — so the
 * server (which re-grades against DB answers) computes the same percentage as the client.
 * The endpoint is idempotent by clientSessionId, so retries / duplicates are harmless.
 *
 * Only exams that truly started a server session keep using /api/v2/exams/submit.
 */
import type { DbExamSession, DbOutboxItem } from "../database/schema";

export const RECORD_OFFLINE_URL = "/api/v2/exams/record-offline";
export const LEGACY_SUBMIT_URL = "/api/v2/exams/submit";
/** Backend validation: @Size(max = 200) on answers, @Max(200) on totalQuestions. */
export const RECORD_OFFLINE_MAX_QUESTIONS = 200;
const CLIENT_SESSION_ID_MAX = 100;

export type OfflineExamType = "ticket" | "real" | "marathon" | "package" | "wrong";

export interface RecordOfflineAnswer {
  questionId: number;
  selectedOptionIndex: number | null;
  timeSpentSeconds: number;
}

export interface RecordOfflinePayload {
  clientSessionId: string;
  examType: OfflineExamType;
  targetId: number | null;
  durationSeconds: number;
  completedAt: number;
  totalQuestions: number;
  answers: RecordOfflineAnswer[];
}

/** Answer shapes used by the exam pages: `{ selected }` keyed by question index. */
export type IndexedAnswers = Record<number, { selected: number | null | undefined } | undefined>;

export interface BuildRecordOfflineInput {
  /** Stable local session id (the crash-recovery exam_sessions.local_id). */
  clientSessionId: string;
  examType: OfflineExamType;
  targetId?: number | null;
  durationSeconds: number;
  completedAt: number;
  /** Questions in exam order. */
  questions: ReadonlyArray<{ id: number }>;
  /** Answers keyed by question index. */
  answers: IndexedAnswers;
  /** Optional seconds spent per question index. */
  timeSpent?: Record<number, number | undefined>;
}

function toNonNegativeInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** Normalise a client session id to the backend contract (non-empty, ≤ 100 chars). */
export function normalizeClientSessionId(id: string): string {
  const trimmed = String(id ?? "").trim();
  return (trimmed || "desktop-session").slice(0, CLIENT_SESSION_ID_MAX);
}

/**
 * Pure payload builder. Includes EVERY question (unanswered → null), keeps exam order,
 * drops duplicate question ids (first occurrence wins, same as the server).
 */
export function buildRecordOfflinePayload(input: BuildRecordOfflineInput): RecordOfflinePayload {
  const seen = new Set<number>();
  const answers: RecordOfflineAnswer[] = [];
  input.questions.forEach((q, idx) => {
    if (q == null || typeof q.id !== "number" || seen.has(q.id)) return;
    seen.add(q.id);
    const sel = input.answers?.[idx]?.selected;
    answers.push({
      questionId: q.id,
      selectedOptionIndex: typeof sel === "number" && Number.isInteger(sel) && sel >= 0 ? sel : null,
      timeSpentSeconds: toNonNegativeInt(input.timeSpent?.[idx]),
    });
  });

  return {
    clientSessionId: normalizeClientSessionId(input.clientSessionId),
    examType: input.examType,
    targetId: typeof input.targetId === "number" && Number.isFinite(input.targetId) ? input.targetId : null,
    durationSeconds: toNonNegativeInt(input.durationSeconds),
    completedAt: toNonNegativeInt(input.completedAt) || Date.now(),
    totalQuestions: answers.length,
    answers,
  };
}

/** The backend rejects > 200 answers; such exams (e.g. "all questions" marathon) stay local-only. */
export function isRecordablePayload(p: RecordOfflinePayload): boolean {
  return p.answers.length > 0 && p.answers.length <= RECORD_OFFLINE_MAX_QUESTIONS;
}

// ── Legacy dead-letter conversion ─────────────────────────────────────────────

/** Fake "server" session ids used to be Date.now() values (epoch ms ≥ 1e12). */
export function isFakeLocalSessionId(sessionId: unknown): boolean {
  const n = Number(sessionId);
  return Number.isFinite(n) && n >= 1e12;
}

export function examTypeFromLocalSession(examType: string | null | undefined): OfflineExamType | null {
  if (!examType) return null;
  if (examType === "EXAM") return "real";
  if (examType === "MARATHON" || examType === "TOPIC") return "marathon";
  if (examType === "WRONG_EXAM") return "wrong";
  if (examType === "TICKET" || examType.startsWith("ticket_")) return "ticket";
  return null;
}

function ticketIdFromLocalSession(session: DbExamSession | null): number | null {
  if (!session) return null;
  if (typeof session.target_id === "number") return session.target_id;
  const m = /^ticket_(\d+)$/.exec(String(session.exam_type));
  return m ? Number(m[1]) : null;
}

/**
 * Legacy outbox row (SUBMIT_EXAM → /api/v2/exams/submit with a fake Date.now() session id)
 * → record-offline row. Returns null when the row is not a legacy fake-session submit.
 * `session` is the local exam_sessions row whose server_id equals the fake id (if found).
 */
export function convertLegacySubmitItem(
  item: DbOutboxItem,
  session: DbExamSession | null
): DbOutboxItem | null {
  if (item.action_type !== "SUBMIT_EXAM" || item.endpoint !== LEGACY_SUBMIT_URL) return null;
  let payload: any;
  try {
    payload = JSON.parse(item.payload_json || "{}");
  } catch {
    return null;
  }
  if (!isFakeLocalSessionId(payload?.sessionId) || !Array.isArray(payload?.answers)) return null;

  const examType = examTypeFromLocalSession(session?.exam_type) ?? "marathon";
  // Same index space as `answers` below; invalid ids are skipped by the builder.
  const questions = payload.answers.map((a: any) => ({ id: a?.questionId }));
  const answers: IndexedAnswers = {};
  const timeSpent: Record<number, number> = {};
  payload.answers.forEach((a: any, idx: number) => {
    answers[idx] = { selected: a?.selectedOptionIndex ?? null };
    timeSpent[idx] = a?.timeSpentSeconds ?? 0;
  });

  const converted = buildRecordOfflinePayload({
    clientSessionId: session?.local_id || `desktop-legacy-${payload.sessionId}`,
    examType,
    targetId: examType === "ticket" ? ticketIdFromLocalSession(session) : null,
    durationSeconds: session?.duration_seconds ?? 0,
    completedAt: session?.completed_at ?? item.created_at,
    questions,
    answers,
    timeSpent,
  });
  if (!isRecordablePayload(converted)) return null;

  return {
    ...item,
    action_type: "RECORD_OFFLINE_EXAM",
    endpoint: RECORD_OFFLINE_URL,
    http_method: "POST",
    payload_json: JSON.stringify(converted),
    status: "PENDING",
    retry_count: 0,
    last_error: null,
    updated_at: Date.now(),
  };
}
