/**
 * Pure exam-engine helpers shared by every desktop exam mode (unit-tested).
 */
import { scopedStorageKey } from "../../utils/userScope";

export interface ExamAnswer {
  selected: number;
  correct: number;
}

export type AnswerMap = Record<number, ExamAnswer>;

export function countResults(answers: AnswerMap): { correct: number; wrong: number; answered: number } {
  let correct = 0;
  let answered = 0;
  for (const a of Object.values(answers)) {
    answered++;
    if (a.selected === a.correct) correct++;
  }
  return { correct, wrong: answered - correct, answered };
}

/**
 * Real exam: up to `maxWrong` mistakes are allowed; the (maxWrong + 1)-th mistake ends the exam.
 * With the default rules (maxWrong = 3) the 4th mistake ends it.
 */
export function isMistakeLimitExceeded(wrong: number, maxWrong: number): boolean {
  return wrong > maxWrong;
}

// ── Survival ("Xatogacha marafon") ──────────────────────────────────────────
export interface SurvivalState {
  streak: number;
  best: number;
  ended: boolean;
  /** True once the current run beat the stored best. */
  newRecord: boolean;
}

export function createSurvivalState(best: number): SurvivalState {
  return { streak: 0, best: Math.max(0, Math.floor(best) || 0), ended: false, newRecord: false };
}

/** Apply one answer: correct → streak+1 (and maybe a new best); wrong → the run ends. */
export function applySurvivalAnswer(state: SurvivalState, isCorrect: boolean): SurvivalState {
  if (state.ended) return state;
  if (!isCorrect) return { ...state, ended: true };
  const streak = state.streak + 1;
  const beat = streak > state.best;
  return { streak, best: beat ? streak : state.best, ended: false, newRecord: state.newRecord || beat };
}

/** Survival also ends (as a win) when every question was answered correctly. */
export function isSurvivalComplete(state: SurvivalState, total: number): boolean {
  return state.ended || (total > 0 && state.streak >= total);
}

export const SURVIVAL_BEST_BASE_KEY = "prava_survival_best";

export function readSurvivalBest(userId: unknown, storage: Pick<Storage, "getItem"> | null = safeStorage()): number {
  try {
    const raw = storage?.getItem(scopedStorageKey(SURVIVAL_BEST_BASE_KEY, userId));
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/** Persist `value` if it beats the stored best. Returns the stored best afterwards. */
export function writeSurvivalBest(
  userId: unknown,
  value: number,
  storage: Pick<Storage, "getItem" | "setItem"> | null = safeStorage()
): number {
  const prev = readSurvivalBest(userId, storage);
  if (value <= prev) return prev;
  try {
    storage?.setItem(scopedStorageKey(SURVIVAL_BEST_BASE_KEY, userId), String(Math.floor(value)));
  } catch {
    // ignore
  }
  return Math.floor(value);
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** Fisher–Yates (returns a new array). `rand` injectable for tests. */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Navigator ──────────────────────────────────────────────────────────────
export type NavCellState = "idle" | "answered" | "correct" | "wrong";

export function navCellState(answer: ExamAnswer | undefined, revealResults: boolean): NavCellState {
  if (!answer) return "idle";
  if (!revealResults) return "answered";
  return answer.selected === answer.correct ? "correct" : "wrong";
}

// ── Split pane ─────────────────────────────────────────────────────────────
export const SPLIT_STORAGE_KEY = "prava_exam_split";
export const SPLIT_MIN = 0.3;
export const SPLIT_MAX = 0.6;
export const SPLIT_DEFAULT = 0.42;

/** Clamp the answer-pane fraction of the width. */
export function clampSplit(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return SPLIT_DEFAULT;
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, n));
}
