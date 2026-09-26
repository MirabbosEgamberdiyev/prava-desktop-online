import { useEffect, useSyncExternalStore } from "react";

/**
 * Shell focus mode: hides the sidebar so an exam / test page gets the whole window.
 *
 * Public API for exam pages (Part B):
 *   - `setFocusMode(true|false)` — imperative toggle.
 *   - `useFocusModeWhile(active)` — declarative: on while `active` and the component is mounted,
 *     released automatically on unmount (no stale focus mode after navigating away).
 *   - `useShellFocusMode()` — read the current value (the shell uses it).
 *
 * The shell additionally hides the sidebar on its own while an exam status is published via
 * `setExamStatus()` (src/state/statusBarStore.ts), so pages that only publish status work too.
 */
let explicit = false;
let requests = 0;
const listeners = new Set<() => void>();

function snapshot(): boolean {
  return explicit || requests > 0;
}

let last = snapshot();
function emit() {
  const next = snapshot();
  if (next === last) return;
  last = next;
  listeners.forEach((l) => l());
}

export function setFocusMode(on: boolean): void {
  explicit = on;
  emit();
}

export function getFocusMode(): boolean {
  return last;
}

/** Reference-counted request; returns a release function (idempotent). */
export function requestFocusMode(): () => void {
  requests += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    requests = Math.max(0, requests - 1);
    emit();
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useShellFocusMode(): boolean {
  return useSyncExternalStore(subscribe, getFocusMode, getFocusMode);
}

export function useFocusModeWhile(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return requestFocusMode();
  }, [active]);
}

/** Test helper. */
export function __resetFocusModeForTests(): void {
  explicit = false;
  requests = 0;
  last = false;
}
