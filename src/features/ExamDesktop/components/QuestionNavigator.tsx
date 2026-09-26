import { memo, useEffect, useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { navCellState, type AnswerMap, type NavCellState } from "../logic";

interface NavCellProps {
  index: number;
  state: NavCellState;
  active: boolean;
  flagged: boolean;
  onGoto: (index: number) => void;
}

const NavCell = memo(function NavCell({ index, state, active, flagged, onGoto }: NavCellProps) {
  return (
    <button
      type="button"
      className={`xd-nav__cell xd-nav__cell--${state}${active ? " is-current" : ""}${flagged ? " is-flagged" : ""}`}
      onClick={() => onGoto(index)}
      onMouseDown={(e) => e.preventDefault()}
      aria-current={active ? "step" : undefined}
      data-state={state}
    >
      {index + 1}
    </button>
  );
});

interface QuestionNavigatorProps {
  total: number;
  current: number;
  answers: AnswerMap;
  /** Indices of bookmarked questions. */
  flagged: ReadonlySet<number>;
  revealResults: boolean;
  onGoto: (index: number) => void;
  pageLabel: (from: number, to: number, total: number) => string;
  legend: { current: string; answered: string; correct: string; wrong: string; flagged: string };
}

/** 1..N question grid. Long sets (marathon: up to ~1200) are paged, 100 cells per page. */
export const QuestionNavigator = memo(function QuestionNavigator({
  total,
  current,
  answers,
  flagged,
  revealResults,
  onGoto,
  pageLabel,
  legend,
}: QuestionNavigatorProps) {
  const PAGE = 100;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const currentPage = Math.floor(current / PAGE);
  const [page, setPage] = useState(currentPage);
  useEffect(() => setPage(currentPage), [currentPage]);

  const from = page * PAGE;
  const to = Math.min(total, from + PAGE);
  const indices = useMemo(() => Array.from({ length: to - from }, (_, i) => from + i), [from, to]);

  return (
    <nav className="xd-nav" aria-label={legend.current}>
      {pages > 1 && (
        <div className="xd-nav__pager">
          <button
            type="button"
            className="xd-iconbtn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="‹"
          >
            <IconChevronLeft size={16} />
          </button>
          <span className="xd-nav__range">{pageLabel(from + 1, to, total)}</span>
          <button
            type="button"
            className="xd-iconbtn"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={page >= pages - 1}
            aria-label="›"
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      )}
      <div className="xd-nav__grid">
        {indices.map((i) => (
          <NavCell
            key={i}
            index={i}
            state={navCellState(answers[i], revealResults)}
            active={i === current}
            flagged={flagged.has(i)}
            onGoto={onGoto}
          />
        ))}
      </div>
      <div className="xd-nav__legend" aria-hidden="true">
        <span className="xd-legend xd-legend--current">{legend.current}</span>
        {revealResults ? (
          <>
            <span className="xd-legend xd-legend--correct">{legend.correct}</span>
            <span className="xd-legend xd-legend--wrong">{legend.wrong}</span>
          </>
        ) : (
          <span className="xd-legend xd-legend--answered">{legend.answered}</span>
        )}
        <span className="xd-legend xd-legend--flagged">{legend.flagged}</span>
      </div>
    </nav>
  );
});

export default QuestionNavigator;
