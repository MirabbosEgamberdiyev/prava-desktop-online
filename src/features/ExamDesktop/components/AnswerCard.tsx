import { memo } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";

/**
 *  idle     — selectable
 *  pending  — picked, waiting for Enter (confirm-selection modes)
 *  chosen   — answered, results hidden (no reveal)
 *  correct  — the correct option (after answering)
 *  wrong    — the user's wrong pick
 *  dim      — any other option after answering
 */
export type AnswerCardState = "idle" | "pending" | "chosen" | "correct" | "wrong" | "dim";

interface AnswerCardProps {
  index: number;
  text: string;
  state: AnswerCardState;
  disabled: boolean;
  /** Stable callback (receives the option index). */
  onPick: (index: number) => void;
  correctLabel: string;
  wrongLabel: string;
}

/** Large desktop answer card with a visible [1]–[5] key badge. Memoized: only changed cards re-render. */
export const AnswerCard = memo(function AnswerCard({
  index,
  text,
  state,
  disabled,
  onPick,
  correctLabel,
  wrongLabel,
}: AnswerCardProps) {
  return (
    <button
      type="button"
      className={`xd-answer xd-answer--${state}`}
      onClick={() => onPick(index)}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      aria-pressed={state === "pending" || state === "chosen"}
    >
      <kbd className="xd-answer__key" aria-hidden="true">
        {index + 1}
      </kbd>
      <span className="xd-answer__text">{text}</span>
      {state === "correct" && (
        <span className="xd-answer__status xd-answer__status--correct">
          <IconCheck size={18} stroke={2.5} aria-hidden="true" />
          <span className="xd-answer__label">{correctLabel}</span>
        </span>
      )}
      {state === "wrong" && (
        <span className="xd-answer__status xd-answer__status--wrong">
          <IconX size={18} stroke={2.5} aria-hidden="true" />
          <span className="xd-answer__label">{wrongLabel}</span>
        </span>
      )}
    </button>
  );
});

export default AnswerCard;
