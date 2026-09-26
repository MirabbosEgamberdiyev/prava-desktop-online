/**
 * Desktop exam engine (PART B): shortcuts, real-exam mistake limit, survival mode,
 * media preload queue, TTS voice selection, debounced saves, timer warnings.
 */
import { describe, expect, it, vi } from "vitest";
import { resolveExamShortcut } from "../src/hooks/useExamShortcuts";
import {
  applySurvivalAnswer,
  clampSplit,
  countResults,
  createSurvivalState,
  isMistakeLimitExceeded,
  isSurvivalComplete,
  navCellState,
  readSurvivalBest,
  shuffle,
  writeSurvivalBest,
  SPLIT_MAX,
  SPLIT_MIN,
} from "../src/features/ExamDesktop/logic";
import { createDebouncer } from "../src/features/ExamDesktop/useDebouncedSave";
import { DEFAULT_EXAM_RULES, isExamPassed, maxWrongFor } from "../src/services/examRules";
import { MediaPreloadQueue, type PreloadDeps } from "../src/services/offlineMediaManagerPreload";
import { selectVoice } from "../src/services/tts";
import { crossedWarnings } from "../src/components/quiz/ExamTimerDisplay";

const k = (key: string, code = "", mods: Partial<Record<"shiftKey" | "ctrlKey" | "metaKey" | "altKey", boolean>> = {}) =>
  resolveExamShortcut({ key, code, ...mods });

describe("exam shortcut mapping", () => {
  it("digits and numpad 1–5 select", () => {
    for (let i = 1; i <= 5; i++) {
      expect(k(String(i), `Digit${i}`)).toEqual({ type: "select", index: i - 1 });
      expect(k(String(i), `Numpad${i}`)).toEqual({ type: "select", index: i - 1 });
    }
    expect(k("6", "Numpad6")).toBeNull();
    expect(k("0", "Digit0")).toBeNull();
  });

  it("letters A–E no longer select; B / Ctrl+D bookmark on any layout", () => {
    expect(k("a", "KeyA")).toBeNull();
    expect(k("c", "KeyC")).toBeNull();
    expect(k("b", "KeyB")).toEqual({ type: "bookmark" });
    expect(k("и", "KeyB")).toEqual({ type: "bookmark" }); // Cyrillic layout
    expect(k("B", "KeyB", { shiftKey: true })).toEqual({ type: "bookmark" });
    expect(k("d", "KeyD", { ctrlKey: true })).toEqual({ type: "bookmark" });
    expect(k("d", "KeyD", { metaKey: true })).toEqual({ type: "bookmark" });
    expect(k("d", "KeyD")).toBeNull();
  });

  it("Z zoom, T speak, M mute; Space next, Enter confirm", () => {
    expect(k("z", "KeyZ")).toEqual({ type: "zoom" });
    expect(k("я", "KeyZ")).toEqual({ type: "zoom" });
    expect(k("t", "KeyT")).toEqual({ type: "speak" });
    expect(k("m", "KeyM")).toEqual({ type: "mute" });
    expect(k(" ", "Space")).toEqual({ type: "space" });
    expect(k("Enter", "Enter")).toEqual({ type: "confirm" });
    expect(k("Enter", "NumpadEnter")).toEqual({ type: "confirm" });
    expect(k("Escape", "Escape")).toEqual({ type: "escape" });
    expect(k("ArrowLeft", "ArrowLeft")).toEqual({ type: "prev" });
    expect(k("ArrowRight", "ArrowRight")).toEqual({ type: "next" });
  });

  it("leaves other modifier combos to the webview", () => {
    expect(k("c", "KeyC", { ctrlKey: true })).toBeNull();
    expect(k("r", "KeyR", { ctrlKey: true })).toBeNull();
    expect(k("1", "Digit1", { ctrlKey: true })).toBeNull();
    expect(k("z", "KeyZ", { altKey: true })).toBeNull();
    expect(k("t", "KeyT", { shiftKey: true })).toBeNull();
  });

  it("falls back to `key` when `code` is missing", () => {
    expect(resolveExamShortcut({ key: "3" })).toEqual({ type: "select", index: 2 });
    expect(resolveExamShortcut({ key: "b" })).toEqual({ type: "bookmark" });
  });
});

describe("real exam: 20 questions, up to 3 mistakes, the 4th ends it", () => {
  const rules = DEFAULT_EXAM_RULES;
  it("default rules allow 3 mistakes for 20 questions", () => {
    expect(rules.real.questionCount).toBe(20);
    expect(rules.real.maxWrong).toBe(3);
    expect(maxWrongFor(20, rules)).toBe(3);
  });

  it("the 4th mistake exceeds the limit (ends the exam), the 3rd does not", () => {
    const maxWrong = maxWrongFor(20, rules);
    const answers: Record<number, { selected: number; correct: number }> = {};
    const outcomes: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      answers[i] = { selected: 1, correct: 0 };
      outcomes.push(isMistakeLimitExceeded(countResults(answers).wrong, maxWrong));
    }
    expect(outcomes).toEqual([false, false, false, true]);
  });

  it("PASSED with 3 mistakes, FAILED with 4", () => {
    expect(isExamPassed({ mode: "real", total: 20, correct: 17, wrong: 3, unanswered: 0 }, rules)).toBe(true);
    expect(isExamPassed({ mode: "real", total: 20, correct: 16, wrong: 4, unanswered: 0 }, rules)).toBe(false);
  });
});

describe("survival mode (Xatogacha marafon)", () => {
  it("counts the streak and ends on the first mistake", () => {
    let s = createSurvivalState(0);
    s = applySurvivalAnswer(s, true);
    s = applySurvivalAnswer(s, true);
    expect(s).toMatchObject({ streak: 2, ended: false });
    s = applySurvivalAnswer(s, false);
    expect(s).toMatchObject({ streak: 2, ended: true });
    // further answers are ignored once ended
    expect(applySurvivalAnswer(s, true)).toBe(s);
    expect(isSurvivalComplete(s, 100)).toBe(true);
  });

  it("tracks the best streak and flags a new record", () => {
    let s = createSurvivalState(3);
    for (let i = 0; i < 3; i++) s = applySurvivalAnswer(s, true);
    expect(s).toMatchObject({ streak: 3, best: 3, newRecord: false });
    s = applySurvivalAnswer(s, true);
    expect(s).toMatchObject({ streak: 4, best: 4, newRecord: true });
    s = applySurvivalAnswer(s, false);
    expect(s).toMatchObject({ best: 4, newRecord: true, ended: true });
  });

  it("completes when every question is answered correctly", () => {
    let s = createSurvivalState(0);
    s = applySurvivalAnswer(s, true);
    s = applySurvivalAnswer(s, true);
    expect(isSurvivalComplete(s, 2)).toBe(true);
    expect(isSurvivalComplete(createSurvivalState(0), 2)).toBe(false);
  });

  it("persists the best streak per user and never lowers it", () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (key: string) => mem.get(key) ?? null, setItem: (key: string, v: string) => void mem.set(key, v) };
    expect(readSurvivalBest(42, storage)).toBe(0);
    expect(writeSurvivalBest(42, 7, storage)).toBe(7);
    expect(writeSurvivalBest(42, 5, storage)).toBe(7);
    expect(readSurvivalBest(42, storage)).toBe(7);
    expect(readSurvivalBest("guest", storage)).toBe(0); // separate scope
    expect(mem.has("prava_survival_best_u42")).toBe(true);
  });

  it("shuffle keeps every question exactly once", () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffle(input);
    expect(out).toHaveLength(50);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input[0]).toBe(0); // input untouched
  });
});

describe("media preload queue", () => {
  function makeDeps(cached: Set<string>, opts: Partial<PreloadDeps> = {}) {
    const fetched: string[] = [];
    const deps: PreloadDeps = {
      isCached: async (p) => cached.has(p),
      cache: async (p) => {
        fetched.push(p);
        if (p.includes("broken")) return false;
        cached.add(p);
        return true;
      },
      canFetch: () => true,
      scheduleIdle: (cb) => cb(),
      throttleMs: 0,
      concurrency: 1,
      ...opts,
    };
    return { deps, fetched };
  }

  it("skips already-cached images, dedupes and caches the rest", async () => {
    const cached = new Set(["a.jpg"]);
    const { deps, fetched } = makeDeps(cached);
    const q = new MediaPreloadQueue(deps);
    q.enqueue(["a.jpg", "b.jpg", "b.jpg", null, "", "c.jpg"]);
    await q.whenIdle();
    expect(fetched).toEqual(["b.jpg", "c.jpg"]);
    expect(q.getStats()).toMatchObject({ cached: 2, skipped: 1, failed: 0, pending: 0 });
    // re-enqueue after completion does nothing (resumable: handled items are remembered)
    q.enqueue(["b.jpg", "c.jpg"]);
    await q.whenIdle();
    expect(fetched).toEqual(["b.jpg", "c.jpg"]);
  });

  it("priority items jump the queue", async () => {
    const cached = new Set<string>();
    const idle: Array<() => void> = [];
    const { deps, fetched } = makeDeps(cached, { scheduleIdle: (cb) => idle.push(cb) });
    const q = new MediaPreloadQueue(deps);
    q.enqueue(["bg1.jpg", "bg2.jpg", "bg3.jpg"]);
    q.enqueue(["next.jpg"], true);
    await vi.waitFor(() => expect(fetched).toContain("next.jpg"));
    expect(fetched[0]).toBe("next.jpg");
    await vi.waitFor(() => {
      while (idle.length) idle.shift()!();
      expect(fetched).toHaveLength(4);
    });
    await q.whenIdle();
  });

  it("counts failures and does not retry them in the background until reset", async () => {
    const { deps, fetched } = makeDeps(new Set());
    const q = new MediaPreloadQueue(deps);
    q.enqueue(["broken.jpg", "ok.jpg"]);
    await q.whenIdle();
    expect(q.getStats().failed).toBe(1);
    q.enqueue(["broken.jpg"]);
    await q.whenIdle();
    expect(fetched.filter((p) => p === "broken.jpg")).toHaveLength(1);
    q.resetFailed();
    q.enqueue(["broken.jpg"]);
    await q.whenIdle();
    expect(fetched.filter((p) => p === "broken.jpg")).toHaveLength(2);
  });

  it("pauses background work while offline and resumes later", async () => {
    let online = false;
    const { deps, fetched } = makeDeps(new Set(), { canFetch: () => online });
    const q = new MediaPreloadQueue(deps);
    q.enqueue(["x.jpg", "y.jpg"]);
    await q.whenIdle();
    expect(fetched).toEqual([]);
    expect(q.getStats().pending).toBe(2);
    online = true;
    q.resume();
    await vi.waitFor(() => expect(fetched).toEqual(["x.jpg", "y.jpg"]));
  });
});

describe("TTS voice selection", () => {
  const voices = [
    { lang: "en-US", name: "Microsoft David", default: true },
    { lang: "ru-RU", name: "Microsoft Irina" },
    { lang: "ru-UA", name: "Other ru" },
  ];

  it("picks ru-RU for Russian", () => {
    const c = selectVoice("ru", voices);
    expect(c.voice?.name).toBe("Microsoft Irina");
    expect(c.fallback).toBe(false);
  });

  it("falls back to the default voice when no Uzbek voice is installed", () => {
    for (const lang of ["uzl", "uzc"]) {
      const c = selectVoice(lang, voices);
      expect(c.fallback).toBe(true);
      expect(c.voice?.name).toBe("Microsoft David");
    }
  });

  it("uses an installed uz voice (Latin / Cyrillic preference)", () => {
    const withUz = [...voices, { lang: "uz-Cyrl-UZ", name: "Uz Cyrl" }, { lang: "uz-Latn-UZ", name: "Uz Latn" }];
    expect(selectVoice("uzl", withUz)).toMatchObject({ fallback: false, voice: { name: "Uz Latn" } });
    expect(selectVoice("uzc", withUz)).toMatchObject({ fallback: false, voice: { name: "Uz Cyrl" } });
    expect(selectVoice("uzl", [{ lang: "uz_UZ", name: "Plain uz" }])).toMatchObject({ fallback: false });
  });

  it("handles an empty voice list", () => {
    expect(selectVoice("uzl", [])).toEqual({ voice: null, lang: "uz-Latn-UZ", fallback: true });
  });
});

describe("helpers", () => {
  it("debouncer keeps only the latest payload and supports flush/cancel", () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn();
      const d = createDebouncer<number>(run, 500);
      d.schedule(1);
      d.schedule(2);
      vi.advanceTimersByTime(499);
      expect(run).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(run).toHaveBeenCalledTimes(1);
      expect(run).toHaveBeenLastCalledWith(2);
      d.schedule(3);
      d.flush();
      expect(run).toHaveBeenLastCalledWith(3);
      d.schedule(4);
      d.cancel();
      vi.advanceTimersByTime(1000);
      expect(run).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("timer warnings fire once when crossing 5 min and 1 min", () => {
    expect(crossedWarnings(301, 300)).toEqual([300]);
    expect(crossedWarnings(300, 299)).toEqual([]);
    expect(crossedWarnings(61, 60)).toEqual([60]);
    expect(crossedWarnings(1200, 1199)).toEqual([]);
    expect(crossedWarnings(400, 30)).toEqual([300, 60]); // resumed from sleep
  });

  it("navigator cell state and split clamp", () => {
    expect(navCellState(undefined, true)).toBe("idle");
    expect(navCellState({ selected: 1, correct: 1 }, true)).toBe("correct");
    expect(navCellState({ selected: 0, correct: 1 }, true)).toBe("wrong");
    expect(navCellState({ selected: 0, correct: 1 }, false)).toBe("answered");
    expect(clampSplit(0.01)).toBe(SPLIT_MIN);
    expect(clampSplit(5)).toBe(SPLIT_MAX);
    expect(clampSplit("abc")).toBeGreaterThan(SPLIT_MIN);
  });
});
