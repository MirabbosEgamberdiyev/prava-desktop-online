import { useEffect, useMemo, useRef } from "react";

export interface Debouncer<T> {
  schedule(payload: T): void;
  /** Run the pending save now (if any). */
  flush(): void;
  cancel(): void;
}

/** Trailing debounce that keeps only the latest payload. */
export function createDebouncer<T>(run: (payload: T) => void, ms: number): Debouncer<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { payload: T } | null = null;
  const fire = () => {
    timer = null;
    const p = pending;
    pending = null;
    if (p) run(p.payload);
  };
  return {
    schedule(payload: T) {
      pending = { payload };
      if (timer) clearTimeout(timer);
      timer = setTimeout(fire, ms);
    },
    flush() {
      if (timer) clearTimeout(timer);
      fire();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

/**
 * Debounced crash-recovery progress save (~500 ms): rapid answering produces one IndexedDB
 * write instead of one per click. Pending saves are flushed on unmount and on page hide.
 */
export function useDebouncedSave<T>(save: (payload: T) => void, ms = 500): Debouncer<T> {
  const saveRef = useRef(save);
  saveRef.current = save;
  const debouncer = useMemo(() => createDebouncer<T>((p) => saveRef.current(p), ms), [ms]);

  useEffect(() => {
    const onHide = () => debouncer.flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      debouncer.flush();
    };
  }, [debouncer]);

  return debouncer;
}
