import { useEffect, useRef } from "react";

/**
 * Unified desktop keyboard shortcuts for EVERY exam type (real, ticket, marathon, survival, wrong, topic):
 *   1–5, Numpad 1–5   → select option (digits only — letters are reserved for commands)
 *   Space             → next question
 *   Enter             → confirm (pending selection / dialog), otherwise next
 *   ← / →  (PgUp/PgDn) → previous / next question
 *   Esc               → close zoom / modal (never exits the exam without a confirmation)
 *   B or Ctrl+D       → bookmark (Shift+B / Ctrl+B also accepted)
 *   Z                 → zoom image
 *   T                 → read aloud
 *   M                 → mute / unmute sound effects
 * Letter keys use `event.code`, so they work on Latin AND Cyrillic keyboard layouts.
 */
export type ExamShortcutAction =
  | { type: "select"; index: number }
  | { type: "prev" }
  | { type: "next" }
  | { type: "space" }
  | { type: "confirm" }
  | { type: "escape" }
  | { type: "bookmark" }
  | { type: "zoom" }
  | { type: "speak" }
  | { type: "mute" };

export interface ShortcutKeyEvent {
  key: string;
  code?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

const DIGIT_CODES = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"];
const NUMPAD_CODES = ["Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5"];

function isLetter(e: ShortcutKeyEvent, code: string, latin: string): boolean {
  if (e.code) return e.code === code;
  return e.key === latin || e.key === latin.toUpperCase();
}

/** Pure key → action mapping (unit-tested). */
export function resolveExamShortcut(e: ShortcutKeyEvent): ExamShortcutAction | null {
  const code = e.code ?? "";
  const mod = !!(e.ctrlKey || e.metaKey);

  if (e.altKey) return null;

  // Bookmark: B, Shift+B, Ctrl/Cmd+B, Ctrl/Cmd+D
  if (isLetter(e, "KeyB", "b")) return { type: "bookmark" };
  if (mod && isLetter(e, "KeyD", "d")) return { type: "bookmark" };
  if (mod) return null; // leave other Ctrl/Cmd combos (copy, reload…) to the webview

  if (e.key === "Escape") return { type: "escape" };
  if (e.key === "Enter" || code === "NumpadEnter") return { type: "confirm" };
  if (e.key === "ArrowLeft" || e.key === "PageUp") return { type: "prev" };
  if (e.key === "ArrowRight" || e.key === "PageDown") return { type: "next" };
  if (e.key === " " || code === "Space") return { type: "space" };
  if (e.shiftKey) return null;

  if (isLetter(e, "KeyZ", "z")) return { type: "zoom" };
  if (isLetter(e, "KeyT", "t")) return { type: "speak" };
  if (isLetter(e, "KeyM", "m")) return { type: "mute" };

  let idx = DIGIT_CODES.indexOf(code);
  if (idx < 0) idx = NUMPAD_CODES.indexOf(code);
  // Numpad with NumLock off reports navigation keys but keeps the Numpad code — handled above.
  if (idx < 0 && !code && /^[1-5]$/.test(e.key)) idx = Number(e.key) - 1;
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
  onZoom?: () => void;
  onSpeak?: () => void;
  onMute?: () => void;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el.isContentEditable;
}

function isKeyboardFocusedButton(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || el.tagName !== "BUTTON") return false;
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

/** Attach the unified exam shortcuts while `enabled` is true. Handlers may change every render. */
export function useExamShortcuts(enabled: boolean, handlers: ExamShortcutHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isEditableTarget(e.target)) return;
      const action = resolveExamShortcut(e);
      if (!action) return;
      // Keyboard-focused button (Tab navigation): let Enter/Space activate it natively.
      if ((action.type === "confirm" || action.type === "space") && isKeyboardFocusedButton(e.target)) return;
      const h = ref.current;
      const run = (fn?: () => void, allowRepeat = false) => {
        if (!fn) return;
        e.preventDefault();
        if (e.repeat && !allowRepeat) return;
        fn();
      };
      switch (action.type) {
        case "select":
          run(h.onSelect ? () => h.onSelect!(action.index) : undefined);
          break;
        case "prev":
          run(h.onPrev, true);
          break;
        case "next":
          run(h.onNext, true);
          break;
        case "space":
          run(h.onSpace ?? h.onNext);
          break;
        case "confirm":
          run(h.onConfirm);
          break;
        case "escape":
          run(h.onEscape);
          break;
        case "bookmark":
          run(h.onBookmark);
          break;
        case "zoom":
          run(h.onZoom);
          break;
        case "speak":
          run(h.onSpeak);
          break;
        case "mute":
          run(h.onMute);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
