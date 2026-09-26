/**
 * Pure status-bar helpers (unit tested in tests/shellStatusBar.test.ts).
 */
import type { ExamStatus } from "../state/statusBarStore";

/** Countdown turns red below this many milliseconds. */
export const CRITICAL_MS = 60_000;

/** Whole seconds left until `deadline` (ceil, so "00:01" is shown until the very end). */
export function secondsLeft(deadline: number, now: number): number {
  const ms = deadline - now;
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 1000);
}

/** mm:ss (or h:mm:ss for ≥ 1 hour). Negative / NaN → "00:00". */
export function formatCountdown(totalSeconds: number): string {
  const s = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function isCritical(totalSeconds: number): boolean {
  return totalSeconds * 1000 < CRITICAL_MS;
}

/** Delay until the next whole-second boundary of the countdown (keeps ticks aligned, no drift). */
export function msToNextTick(deadline: number, now: number): number {
  const ms = deadline - now;
  if (ms <= 0) return 1000;
  const rem = ms % 1000;
  return rem === 0 ? 1000 : rem;
}

export interface ExamStatusParts {
  label: string;
  /** "8/20" — clamped to 1..total. */
  progress: string;
  /** "2/3" for the real exam (mistakes / allowed), else null. */
  mistakes: string | null;
  /** True when mistakes exceed the allowed limit (exam already failed). */
  mistakesOver: boolean;
}

export function examStatusParts(status: ExamStatus): ExamStatusParts {
  const total = Math.max(0, Math.floor(status.totalQuestions || 0));
  const n = Math.min(Math.max(1, Math.floor(status.questionNumber || 1)), Math.max(1, total));
  const hasMistakes =
    typeof status.mistakes === "number" && typeof status.maxMistakes === "number" && status.maxMistakes >= 0;
  return {
    label: status.label,
    progress: `${n}/${total}`,
    mistakes: hasMistakes ? `${status.mistakes}/${status.maxMistakes}` : null,
    mistakesOver: hasMistakes ? (status.mistakes as number) > (status.maxMistakes as number) : false,
  };
}

/** Pending outbox count is shown only when > 0; huge numbers are capped ("99+"). */
export function formatPending(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(Math.floor(count));
}
