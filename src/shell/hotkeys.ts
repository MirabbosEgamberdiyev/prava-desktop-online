/**
 * Global desktop hotkeys — pure dispatcher (unit tested in tests/shellHotkeys.test.ts).
 * `GlobalHotkeys.tsx` owns the single window keydown listener and executes the action.
 *
 * Rules:
 *  - F11 and zoom (Ctrl+= / Ctrl+- / Ctrl+0) work everywhere (also in inputs and modals).
 *  - With a modal / palette open nothing else fires (the modal owns the keyboard).
 *  - While typing in an input/textarea/contenteditable only the above work.
 *  - On exam / quiz routes (or shell focus mode) shortcuts that would leave the exam
 *    (Ctrl+, settings, Ctrl+F search) or toggle the hidden sidebar are ignored.
 *  - Ctrl+F on Learn (curriculum) pages is left to the page's own in-page search.
 *  - Keys are matched by `code` first so Ctrl+L / Ctrl+B work on the Cyrillic layout too.
 */
import { isExamPath, isLearnPath } from "./routes";

export type HotkeyAction =
  | "toggleFullscreen"
  | "cycleLanguage"
  | "openSearch"
  | "toggleSidebar"
  | "openSettings"
  | "zoomIn"
  | "zoomOut"
  | "zoomReset";

export interface KeyInput {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat?: boolean;
}

export interface HotkeyContext {
  pathname: string;
  typing: boolean;
  modalOpen: boolean;
  focusMode: boolean;
}

export { isExamPath, isLearnPath };

function codeIs(e: KeyInput, codes: string[], keys: string[]): boolean {
  return codes.includes(e.code) || keys.includes(e.key);
}

export function resolveHotkey(e: KeyInput, ctx: HotkeyContext): HotkeyAction | null {
  const mod = e.ctrlKey || e.metaKey;

  if (e.key === "F11" && !mod && !e.altKey && !e.shiftKey) {
    return e.repeat ? null : "toggleFullscreen";
  }
  if (!mod || e.altKey) return null;

  // Zoom: allowed everywhere (Shift is tolerated: Ctrl+Shift+= is "Ctrl++" on many layouts).
  if (codeIs(e, ["Equal", "NumpadAdd"], ["=", "+"])) return "zoomIn";
  if (codeIs(e, ["Minus", "NumpadSubtract"], ["-", "_"])) return "zoomOut";
  if (codeIs(e, ["Digit0", "Numpad0"], ["0"])) return e.shiftKey ? null : "zoomReset";

  if (e.shiftKey || e.repeat) return null;
  if (ctx.modalOpen || ctx.typing) return null;

  const locked = ctx.focusMode || isExamPath(ctx.pathname);

  if (codeIs(e, ["Comma"], [","])) return locked ? null : "openSettings";
  if (e.code === "KeyL" || (!e.code && e.key.toLowerCase() === "l")) return "cycleLanguage";
  if (e.code === "KeyB" || (!e.code && e.key.toLowerCase() === "b")) return locked ? null : "toggleSidebar";
  if (e.code === "KeyF" || (!e.code && e.key.toLowerCase() === "f")) {
    if (locked || isLearnPath(ctx.pathname)) return null;
    return "openSearch";
  }
  return null;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== "string") return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = ((el as HTMLInputElement).type || "text").toLowerCase();
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"].includes(type);
  }
  return el.isContentEditable === true;
}

/** Mantine modals/drawers, legacy `.modal-overlay` dialogs and the Ctrl+K palette. */
export const MODAL_SELECTOR = '[aria-modal="true"], .modal-overlay, [data-global-search-open]';

export function isModalOpen(doc: Pick<Document, "querySelector"> = document): boolean {
  return doc.querySelector(MODAL_SELECTOR) !== null;
}

/** Ctrl+L / status-bar language cycle: uzl → uzc → ru → uzl. */
export const LANGUAGE_CYCLE = ["uzl", "uzc", "ru"] as const;
export type CycleLanguage = (typeof LANGUAGE_CYCLE)[number];

export function nextLanguage(current: string): CycleLanguage {
  const idx = (LANGUAGE_CYCLE as readonly string[]).indexOf(current);
  return LANGUAGE_CYCLE[(idx + 1) % LANGUAGE_CYCLE.length];
}
