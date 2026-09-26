import { describe, it, expect } from "vitest";
import { isTypingTarget, isModalOpen, nextLanguage, resolveHotkey, type HotkeyContext, type KeyInput } from "../src/shell/hotkeys";

const key = (k: Partial<KeyInput> & { key: string }): KeyInput => ({
  code: "",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...k,
});
const ctrl = (code: string, k: string) => key({ key: k, code, ctrlKey: true });
const ctx = (over: Partial<HotkeyContext> = {}): HotkeyContext => ({
  pathname: "/me",
  typing: false,
  modalOpen: false,
  focusMode: false,
  ...over,
});

describe("global hotkey dispatcher", () => {
  it("maps the global shortcuts", () => {
    expect(resolveHotkey(key({ key: "F11", code: "F11" }), ctx())).toBe("toggleFullscreen");
    expect(resolveHotkey(ctrl("KeyL", "l"), ctx())).toBe("cycleLanguage");
    expect(resolveHotkey(ctrl("KeyF", "f"), ctx())).toBe("openSearch");
    expect(resolveHotkey(ctrl("KeyB", "b"), ctx())).toBe("toggleSidebar");
    expect(resolveHotkey(ctrl("Comma", ","), ctx())).toBe("openSettings");
    expect(resolveHotkey(ctrl("Equal", "="), ctx())).toBe("zoomIn");
    expect(resolveHotkey(ctrl("NumpadAdd", "+"), ctx())).toBe("zoomIn");
    expect(resolveHotkey(ctrl("Minus", "-"), ctx())).toBe("zoomOut");
    expect(resolveHotkey(ctrl("Digit0", "0"), ctx())).toBe("zoomReset");
  });

  it("works on the Cyrillic layout (matches by code)", () => {
    expect(resolveHotkey(ctrl("KeyL", "д"), ctx())).toBe("cycleLanguage");
    expect(resolveHotkey(ctrl("KeyB", "и"), ctx())).toBe("toggleSidebar");
    expect(resolveHotkey(ctrl("KeyF", "а"), ctx())).toBe("openSearch");
  });

  it("ignores unrelated or modified combos", () => {
    expect(resolveHotkey(key({ key: "l", code: "KeyL" }), ctx())).toBeNull();
    expect(resolveHotkey(key({ key: "l", code: "KeyL", ctrlKey: true, altKey: true }), ctx())).toBeNull();
    expect(resolveHotkey(key({ key: "L", code: "KeyL", ctrlKey: true, shiftKey: true }), ctx())).toBeNull();
    expect(resolveHotkey(ctrl("KeyK", "k"), ctx())).toBeNull(); // owned by GlobalSearchHost
    expect(resolveHotkey({ ...ctrl("KeyB", "b"), repeat: true }, ctx())).toBeNull();
  });

  it("respects inputs: only F11 and zoom while typing", () => {
    const typing = ctx({ typing: true });
    expect(resolveHotkey(ctrl("KeyL", "l"), typing)).toBeNull();
    expect(resolveHotkey(ctrl("KeyF", "f"), typing)).toBeNull();
    expect(resolveHotkey(ctrl("KeyB", "b"), typing)).toBeNull();
    expect(resolveHotkey(ctrl("Comma", ","), typing)).toBeNull();
    expect(resolveHotkey(ctrl("Equal", "="), typing)).toBe("zoomIn");
    expect(resolveHotkey(key({ key: "F11", code: "F11" }), typing)).toBe("toggleFullscreen");
  });

  it("respects open modals", () => {
    const modal = ctx({ modalOpen: true });
    expect(resolveHotkey(ctrl("KeyF", "f"), modal)).toBeNull();
    expect(resolveHotkey(ctrl("KeyL", "l"), modal)).toBeNull();
    expect(resolveHotkey(ctrl("Digit0", "0"), modal)).toBe("zoomReset");
  });

  it("keeps Ctrl+F for in-page search on Learn pages", () => {
    expect(resolveHotkey(ctrl("KeyF", "f"), ctx({ pathname: "/signs" }))).toBeNull();
    expect(resolveHotkey(ctrl("KeyF", "f"), ctx({ pathname: "/rules" }))).toBeNull();
    expect(resolveHotkey(ctrl("KeyF", "f"), ctx({ pathname: "/topics" }))).toBe("openSearch");
  });

  it("does not leave an exam by accident", () => {
    for (const pathname of ["/exam", "/tickets/501", "/packages/3", "/wrong-exam", "/marafon"]) {
      expect(resolveHotkey(ctrl("Comma", ","), ctx({ pathname }))).toBeNull();
      expect(resolveHotkey(ctrl("KeyF", "f"), ctx({ pathname }))).toBeNull();
      expect(resolveHotkey(ctrl("KeyB", "b"), ctx({ pathname }))).toBeNull();
      expect(resolveHotkey(ctrl("KeyL", "l"), ctx({ pathname }))).toBe("cycleLanguage");
    }
    expect(resolveHotkey(ctrl("Comma", ","), ctx({ focusMode: true }))).toBeNull();
    expect(resolveHotkey(ctrl("Comma", ","), ctx({ pathname: "/exam/result/abc" }))).toBe("openSettings");
  });

  it("cycles languages uzl -> uzc -> ru -> uzl", () => {
    expect(nextLanguage("uzl")).toBe("uzc");
    expect(nextLanguage("uzc")).toBe("ru");
    expect(nextLanguage("ru")).toBe("uzl");
    expect(nextLanguage("xx")).toBe("uzl");
  });

  it("detects typing targets and modals", () => {
    expect(isTypingTarget({ tagName: "INPUT", type: "text" } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "INPUT", type: "checkbox" } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isModalOpen({ querySelector: () => null } as unknown as Document)).toBe(false);
    expect(isModalOpen({ querySelector: () => ({}) } as unknown as Document)).toBe(true);
  });
});
