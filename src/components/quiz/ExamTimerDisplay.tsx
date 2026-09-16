import { useState, useEffect, useRef, memo } from "react";

interface ExamTimerDisplayProps {
  initialSeconds: number;
  onTimeUp: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export const ExamTimerDisplay = memo(function ExamTimerDisplay({
  initialSeconds,
  onTimeUp,
}: ExamTimerDisplayProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(initialSeconds);
    const startSnapshot = Date.now();
    const startRemaining = initialSeconds;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startSnapshot) / 1000);
      const rem = Math.max(0, startRemaining - elapsed);
      setRemaining(rem);
      if (rem <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        onTimeUpRef.current();
      }
    };

    timerRef.current = setInterval(tick, 1000);

    const handleFocus = () => tick();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("system-resumed-from-sleep", handleFocus);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("system-resumed-from-sleep", handleFocus);
    };
  }, [initialSeconds]);

  const timerIsRed = remaining <= 120; // 2 min
  const timerIsYellow = remaining > 120 && remaining <= 300; // 5 min

  return (
    <span
      className={`exam-timer${timerIsRed ? " red" : timerIsYellow ? " yellow" : ""}`}
    >
      {formatTime(remaining)}
    </span>
  );
});

export default ExamTimerDisplay;
