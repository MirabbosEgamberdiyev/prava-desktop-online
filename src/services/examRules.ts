/**
 * Exam rules (durations, pass thresholds, max wrong answers).
 *
 * Source of truth: GET /api/v1/public/exam-rules → ApiResponse.data (see ExamRules).
 * Fetched at most once per app session, cached in localStorage so the rules also
 * apply offline. Until the first successful fetch the built-in defaults are used.
 *
 * Business rule: every mode is 1 minute (60 s) per question — e.g. a 20-question
 * marathon lasts 20 minutes (it used to default to 30).
 */
import api from "../api/api";

export interface ExamRules {
  version: string;
  real: {
    questionCount: number;
    secondsPerQuestion: number;
    maxWrong: number;
    unansweredCountsAsWrong: boolean;
  };
  ticket: { secondsPerQuestion: number; passPercent: number };
  marathon: { secondsPerQuestion: number; passPercent: number };
}

export type ExamRulesMode = "real" | "ticket" | "marathon";

export const EXAM_RULES_URL = "/api/v1/public/exam-rules";
const STORAGE_KEY = "prava_exam_rules_v1";

export const DEFAULT_EXAM_RULES: ExamRules = Object.freeze({
  version: "default",
  real: { questionCount: 20, secondsPerQuestion: 60, maxWrong: 3, unansweredCountsAsWrong: true },
  ticket: { secondsPerQuestion: 60, passPercent: 90 },
  marathon: { secondsPerQuestion: 60, passPercent: 90 },
}) as ExamRules;

function num(v: unknown, fallback: number, min = 0): number {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= min ? n : fallback;
}

/** Merge an untrusted payload over the defaults, field by field. */
function sanitize(raw: any): ExamRules {
  const d = DEFAULT_EXAM_RULES;
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    version: r.version != null ? String(r.version) : d.version,
    real: {
      questionCount: Math.round(num(r.real?.questionCount, d.real.questionCount, 1)),
      secondsPerQuestion: num(r.real?.secondsPerQuestion, d.real.secondsPerQuestion, 1),
      maxWrong: Math.round(num(r.real?.maxWrong, d.real.maxWrong, 0)),
      unansweredCountsAsWrong:
        typeof r.real?.unansweredCountsAsWrong === "boolean"
          ? r.real.unansweredCountsAsWrong
          : d.real.unansweredCountsAsWrong,
    },
    ticket: {
      secondsPerQuestion: num(r.ticket?.secondsPerQuestion, d.ticket.secondsPerQuestion, 1),
      passPercent: num(r.ticket?.passPercent, d.ticket.passPercent, 0),
    },
    marathon: {
      secondsPerQuestion: num(r.marathon?.secondsPerQuestion, d.marathon.secondsPerQuestion, 1),
      passPercent: num(r.marathon?.passPercent, d.marathon.passPercent, 0),
    },
  };
}

let memo: ExamRules | null = null;
let inflight: Promise<ExamRules> | null = null;
let fetchedThisSession = false;

function readCache(): ExamRules | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(rules: ExamRules): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // storage unavailable — in-memory copy still works
  }
}

/**
 * Synchronous accessor: cached rules (or defaults). Kicks off a one-time
 * background refresh from the server; the new values apply to the next exam.
 */
export function getExamRules(): ExamRules {
  if (!memo) memo = readCache() ?? DEFAULT_EXAM_RULES;
  if (!fetchedThisSession) void loadExamRules();
  return memo;
}

/** Fetch rules from the server once per session (use `force` to refetch). Never throws. */
export function loadExamRules(force = false): Promise<ExamRules> {
  if (inflight) return inflight;
  if (fetchedThisSession && !force) return Promise.resolve(memo ?? DEFAULT_EXAM_RULES);
  fetchedThisSession = true;
  inflight = (async () => {
    try {
      const res = await api.get<{ data?: unknown }>(EXAM_RULES_URL);
      const payload = (res.data as any)?.data ?? res.data;
      if (payload && typeof payload === "object") {
        memo = sanitize(payload);
        writeCache(memo);
      }
    } catch {
      // offline / old backend — keep cached or default rules
    } finally {
      inflight = null;
    }
    return memo ?? readCache() ?? DEFAULT_EXAM_RULES;
  })();
  return inflight;
}

export function secondsPerQuestion(mode: ExamRulesMode, rules: ExamRules = getExamRules()): number {
  return rules[mode].secondsPerQuestion;
}

/** Total time limit in seconds for `questionCount` questions. */
export function durationSecondsFor(mode: ExamRulesMode, questionCount: number, rules: ExamRules = getExamRules()): number {
  return Math.max(1, Math.round(questionCount * secondsPerQuestion(mode, rules)));
}

/** Time limit in whole minutes (for server APIs that take `durationMinutes`). */
export function durationMinutesFor(mode: ExamRulesMode, questionCount: number, rules: ExamRules = getExamRules()): number {
  return Math.max(1, Math.ceil(durationSecondsFor(mode, questionCount, rules) / 60));
}

/**
 * Max wrong answers allowed in the real exam. For the official question count
 * this is `real.maxWrong`; other counts scale proportionally (20→2, 40→4, 100→10).
 */
export function maxWrongFor(questionCount: number, rules: ExamRules = getExamRules()): number {
  const { questionCount: base, maxWrong } = rules.real;
  if (questionCount === base) return maxWrong;
  return Math.floor((questionCount * maxWrong) / base);
}

export function passPercentFor(mode: "ticket" | "marathon", rules: ExamRules = getExamRules()): number {
  return rules[mode].passPercent;
}

/** Every exam flavour the desktop grades (mirrors the web `ExamMode`). */
export type ExamMode = "real" | "ticket" | "marathon" | "wrong" | "package";

export interface ExamOutcome {
  mode: ExamMode;
  /** Total questions in the exam, INCLUDING unanswered ones. */
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
}

/**
 * Unified pass/fail rule (identical to web `isExamPassed`):
 *  - real: (wrong + unanswered) <= floor(maxWrong × total / real.questionCount)
 *          (unanswered only counts when `unansweredCountsAsWrong`);
 *  - ticket / marathon / wrong / package: percent correct >= passPercent.
 * An exam without questions never passes.
 */
export function isExamPassed(outcome: ExamOutcome, rules: ExamRules = getExamRules()): boolean {
  const total = Math.max(0, Math.round(outcome.total));
  if (total <= 0) return false;
  const correct = Math.max(0, outcome.correct);
  const wrong = Math.max(0, outcome.wrong);
  const unanswered = Math.max(0, outcome.unanswered);

  if (outcome.mode === "real") {
    const mistakes = wrong + (rules.real.unansweredCountsAsWrong ? unanswered : 0);
    return mistakes <= maxWrongFor(total, rules);
  }
  const passPercent = outcome.mode === "marathon" ? rules.marathon.passPercent : rules.ticket.passPercent;
  return (correct / total) * 100 >= passPercent;
}

/** Merge an untrusted rules payload over the defaults (exported for tests / callers). */
export const normalizeExamRules = sanitize;
