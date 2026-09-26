/**
 * Resume card data: picks the newest resumable crash-recovery session (IndexedDB exam_sessions,
 * current user only) and maps it to the route whose page auto-restores it on open.
 * Pure — unit tested in tests/nextBestAction.test.ts.
 */
import type { DbExamSession } from "../../database/schema";

/** Same window the exam pages use for crash recovery. */
export const RESUME_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type ResumeKind = "exam" | "marathon" | "ticket" | "wrong";

export interface ResumableSession {
  localId: string;
  kind: ResumeKind;
  route: string;
  answered: number;
  total: number;
  /** Ticket number for ticket sessions (from the local tickets store), if known. */
  ticketNumber: number | null;
  deadline: number | null;
}

function countAnswers(json: string | undefined): number {
  if (!json) return 0;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? Object.keys(parsed).length : 0;
  } catch {
    return 0;
  }
}

function questionCount(s: DbExamSession): number {
  if (s.questions_json) {
    try {
      const qs = JSON.parse(s.questions_json);
      if (Array.isArray(qs)) return qs.length;
    } catch {
      // fall through
    }
  }
  return s.total_questions || 0;
}

export function describeSession(
  s: DbExamSession,
  ticketNumberById?: ReadonlyMap<number, number>
): ResumableSession | null {
  const total = questionCount(s);
  if (total <= 0) return null;
  const base = {
    localId: s.local_id,
    answered: Math.min(total, countAnswers(s.answers_json)),
    total,
    deadline: s.deadline_at ?? null,
    ticketNumber: null as number | null,
  };
  const type = String(s.exam_type);
  if (type === "EXAM") return { ...base, kind: "exam", route: `/exam?count=${total}` };
  if (type === "MARATHON") return { ...base, kind: "marathon", route: "/marafon" };
  if (type === "WRONG_EXAM") return { ...base, kind: "wrong", route: "/wrong-exam" };
  const m = /^ticket_(\d+)$/.exec(type);
  if (m) {
    const id = Number(m[1]);
    return { ...base, kind: "ticket", route: `/tickets/${id}`, ticketNumber: ticketNumberById?.get(id) ?? null };
  }
  return null; // unknown / legacy types have no auto-restoring page
}

/** Newest IN_PROGRESS session with saved questions, started within RESUME_MAX_AGE_MS. */
export function pickResumableSession(
  sessions: readonly DbExamSession[],
  now: number,
  ticketNumberById?: ReadonlyMap<number, number>
): ResumableSession | null {
  const candidates = sessions
    .filter((s) => s.status === "IN_PROGRESS" && !!s.questions_json && now - s.started_at < RESUME_MAX_AGE_MS)
    .sort((a, b) => b.started_at - a.started_at);
  for (const s of candidates) {
    const d = describeSession(s, ticketNumberById);
    if (d) return d;
  }
  return null;
}
