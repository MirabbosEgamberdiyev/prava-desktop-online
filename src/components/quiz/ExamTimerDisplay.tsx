import { useState, useEffect, useRef, memo } from "react";

interface ExamTimerDisplayProps {
  /**
   * Absolute deadline (epoch ms). Remaining time is always derived from the wall clock,
   * so it stays correct after sleep/resume, window blur and crash recovery.
   */
  deadline: number;
  onTimeUp: () => void;
}

export function remainingSecondsUntil(deadline: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatClock(s: number): string {
  const safe = Math.max(0, Math.floor(s));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const sec = safe % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Self-ticking countdown (re-renders only itself, not the exam page).
 * Calls `onTimeUp` exactly once when the deadline passes.
 */
export const ExamTimerDisplay = memo(function ExamTimerDisplay({ deadline, onTimeUp }: ExamTimerDisplayProps) {
  const [remaining, setRemaining] = useState(() => remainingSecondsUntil(deadline));
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    let fired = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      const rem = remainingSecondsUntil(deadline);
      setRemaining(rem);
      if (rem <= 0 && !fired) {
        fired = true;
        if (timer) clearInterval(timer);
        onTimeUpRef.current();
      }
    };

    tick();
    timer = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    window.addEventListener("system-resumed-from-sleep", tick);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", tick);
      window.removeEventListener("system-resumed-from-sleep", tick);
    };
  }, [deadline]);

  const timerIsRed = remaining <= 120; // 2 min
  const timerIsYellow = remaining > 120 && remaining <= 300; // 5 min

  return (
    <span
      className={`exam-timer${timerIsRed ? " red" : timerIsYellow ? " yellow" : ""}`}
      role="timer"
      aria-live="off"
    >
      {formatClock(remaining)}
    </span>
  );
});

export default ExamTimerDisplay;
