import { useCallback, useEffect, useRef, type PointerEvent as RPointerEvent } from "react";
import { SPLIT_DEFAULT, SPLIT_STORAGE_KEY, clampSplit } from "./logic";

function readSplit(): number {
  try {
    const raw = localStorage.getItem(SPLIT_STORAGE_KEY);
    return raw == null ? SPLIT_DEFAULT : clampSplit(Number(raw));
  } catch {
    return SPLIT_DEFAULT;
  }
}

/**
 * Resizable split between the question pane and the answer pane. The width lives in the CSS
 * variable `--xd-right` on the container and is updated directly during the drag (no React
 * re-render); the final value is persisted in localStorage `prava_exam_split`.
 */
export function useSplitPane() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fraction = useRef(readSplit());
  const dragging = useRef<number | null>(null);

  const write = useCallback((f: number) => {
    fraction.current = clampSplit(f);
    containerRef.current?.style.setProperty("--xd-right", `${(fraction.current * 100).toFixed(2)}%`);
  }, []);

  useEffect(() => {
    write(fraction.current);
  }, [write]);

  const persist = useCallback(() => {
    try {
      localStorage.setItem(SPLIT_STORAGE_KEY, fraction.current.toFixed(3));
    } catch {
      // ignore
    }
  }, []);

  const onPointerDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    containerRef.current?.classList.add("is-resizing");
  }, []);

  const onPointerMove = useCallback(
    (e: RPointerEvent<HTMLDivElement>) => {
      if (dragging.current !== e.pointerId) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      write((rect.right - e.clientX) / rect.width);
    },
    [write]
  );

  const onPointerUp = useCallback(
    (e: RPointerEvent<HTMLDivElement>) => {
      if (dragging.current !== e.pointerId) return;
      dragging.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      containerRef.current?.classList.remove("is-resizing");
      persist();
    },
    [persist]
  );

  const onDoubleClick = useCallback(() => {
    write(SPLIT_DEFAULT);
    persist();
  }, [write, persist]);

  return {
    containerRef,
    splitterProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onDoubleClick },
  };
}
