import { useEffect, useRef } from "react";

/**
 * Unified desktop keyboard shortcuts for EVERY exam type (real, ticket, marathon, wrong):
 *   1–5 / A–E (also F1–F5, numpad) → select option
 *   ← / →  (also PageUp / PageDown) → previous / next question
 *   Space                          → next question (after answering)
 *   Enter                          → confirm (finish / confirm dialog)
 *   Esc                            → close the topmost modal
 *   Shift+B or Ctrl/Cmd+B          → bookmark (plain B is option "B")
 * Letters/digits use `event.code`, so they work on Latin AND Cyrillic keyboard layouts.
 */
export type ExamShortcutAction =
  | { type: "select"; index: number }
  | { type: "prev" }
  | { type: "next" }
  | { type: "space" }
  | { type: "confirm" }
  | { type: "escape" }
  | { type: "bookmark" };

export interface ShortcutKeyEvent {
  key: string;
  code?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

const LETTER_CODES = ["KeyA", "KeyB", "KeyC", "KeyD", "KeyE"];
const DIGIT_CODES = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"];
const NUMPAD_CODES = ["Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5"];
const F_KEYS = ["F1", "F2", "F3", "F4", "F5"];

/** Pure key → action mapping (unit-tested). */
export function resolveExamShortcut(e: ShortcutKeyEvent): ExamShortcutAction | null {
  const code = e.code ?? "";
  const mod = !!(e.ctrlKey || e.metaKey);

  if (e.altKey) return null;

  // Bookmark: Shift+B or Ctrl/Cmd+B
  if ((code === "KeyB" || e.key === "b" || e.key === "B") && (e.shiftKey || mod)) {
    return { type: "bookmark" };
  }
  if (mod) return null; // leave other Ctrl/Cmd combos (copy, reload…) to the webview

  if (e.key === "Escape") return { type: "escape" };
  if (e.key === "Enter" || code === "NumpadEnter") return { type: "confirm" };
  if (e.key === "ArrowLeft" || e.key === "PageUp") return { type: "prev" };
  if (e.key === "ArrowRight" || e.key === "PageDown") return { type: "next" };
  if (e.key === " " || code === "Space") return { type: "space" };

  const fIdx = F_KEYS.indexOf(e.key);
  if (fIdx >= 0) return { type: "select", index: fIdx };
  if (e.shiftKey) return null;

  let idx = DIGIT_CODES.indexOf(code);
  if (idx < 0) idx = NUMPAD_CODES.indexOf(code);
  if (idx < 0) idx = LETTER_CODES.indexOf(code);
  if (idx < 0 && /^[1-5]$/.test(e.key)) idx = Number(e.key) - 1;
  if (idx < 0 && /^[a-eA-E]$/.test(e.key)) idx = e.key.toLowerCase().charCodeAt(0) - 97;
  if (idx >= 0) return { type: "select", index: idx };
  return null;
}

export interface ExamShortcutHandlers {
  onSelect?: (index: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSpace?: () => void;
  onConfirm?: () => void;
  onEscape?: () => void;
  onBookmark?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el.isContentEditable;
}

/** Attach the unified exam shortcuts while `enabled` is true. Handlers may change every render. */
export function useExamShortcuts(enabled: boolean, handlers: ExamShortcutHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const action = resolveExamShortcut(e);
      if (!action) return;
      const h = ref.current;
      const run = (fn?: () => void) => {
        if (!fn) return;
        e.preventDefault();
        fn();
      };
      switch (action.type) {
        case "select":
          if (e.repeat) return;
          run(h.onSelect ? () => h.onSelect!(action.index) : undefined);
          break;
        case "prev":
          run(h.onPrev);
          break;
        case "next":
          run(h.onNext);
          break;
        case "space":
          run(h.onSpace ?? h.onNext);
          break;
        case "confirm":
          if (e.repeat) return;
          run(h.onConfirm);
          break;
        case "escape":
          run(h.onEscape);
          break;
        case "bookmark":
          if (e.repeat) return;
          run(h.onBookmark);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
