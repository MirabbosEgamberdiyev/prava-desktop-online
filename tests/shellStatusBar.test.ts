import { describe, it, expect, beforeEach } from "vitest";
import {
  examStatusParts,
  formatCountdown,
  formatPending,
  isCritical,
  msToNextTick,
  secondsLeft,
} from "../src/shell/statusFormat";
import { parseUiScale, stepUiScale, formatUiScale } from "../src/shell/zoom";
import {
  __resetFocusModeForTests,
  getFocusMode,
  requestFocusMode,
  setFocusMode,
} from "../src/shell/focusMode";

describe("status bar countdown", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(59)).toBe("00:59");
    expect(formatCountdown(20 * 60)).toBe("20:00");
    expect(formatCountdown(3599)).toBe("59:59");
    expect(formatCountdown(3600)).toBe("1:00:00");
    expect(formatCountdown(-5)).toBe("00:00");
    expect(formatCountdown(Number.NaN)).toBe("00:00");
  });

  it("counts whole seconds up (ceil) and clamps at zero", () => {
    const deadline = 100_000;
    expect(secondsLeft(deadline, 100_000)).toBe(0);
    expect(secondsLeft(deadline, 99_999)).toBe(1);
    expect(secondsLeft(deadline, 99_000)).toBe(1);
    expect(secondsLeft(deadline, 98_999)).toBe(2);
    expect(secondsLeft(deadline, 200_000)).toBe(0);
  });

  it("is critical (red) under one minute", () => {
    expect(isCritical(60)).toBe(false);
    expect(isCritical(59)).toBe(true);
    expect(isCritical(0)).toBe(true);
  });

  it("schedules ticks on whole-second boundaries", () => {
    expect(msToNextTick(10_000, 9_000)).toBe(1000);
    expect(msToNextTick(10_000, 9_250)).toBe(750);
    expect(msToNextTick(10_000, 10_500)).toBe(1000);
  });
});

describe("exam status parts", () => {
  it("builds ticket status without mistakes", () => {
    const p = examStatusParts({ mode: "ticket", label: "Bilet #14", questionNumber: 8, totalQuestions: 20, deadline: null });
    expect(p).toEqual({ label: "Bilet #14", progress: "8/20", mistakes: null, mistakesOver: false });
  });

  it("shows mistakes x/3 for the real exam and flags the 4th mistake", () => {
    const base = { mode: "real" as const, label: "Real imtihon", questionNumber: 5, totalQuestions: 20, deadline: 1 };
    expect(examStatusParts({ ...base, mistakes: 2, maxMistakes: 3 }).mistakes).toBe("2/3");
    expect(examStatusParts({ ...base, mistakes: 3, maxMistakes: 3 }).mistakesOver).toBe(false);
    expect(examStatusParts({ ...base, mistakes: 4, maxMistakes: 3 }).mistakesOver).toBe(true);
  });

  it("clamps the question number into 1..total", () => {
    expect(examStatusParts({ mode: "topic", label: "M", questionNumber: 0, totalQuestions: 10, deadline: null }).progress).toBe("1/10");
    expect(examStatusParts({ mode: "topic", label: "M", questionNumber: 99, totalQuestions: 10, deadline: null }).progress).toBe("10/10");
  });

  it("formats the pending outbox count", () => {
    expect(formatPending(0)).toBeNull();
    expect(formatPending(3)).toBe("3");
    expect(formatPending(250)).toBe("99+");
  });
});

describe("ui scale steps", () => {
  it("parses stored values and migrates the legacy text size", () => {
    expect(parseUiScale("1.25")).toBe(1.25);
    expect(parseUiScale("1.3")).toBe(1);
    expect(parseUiScale(null, "small")).toBe(0.9);
    expect(parseUiScale(null, "large")).toBe(1.1);
    expect(parseUiScale(null, null)).toBe(1);
  });

  it("steps exactly 90 -> 100 -> 110 -> 125 and clamps", () => {
    expect(stepUiScale(1, 1)).toBe(1.1);
    expect(stepUiScale(1.1, 1)).toBe(1.25);
    expect(stepUiScale(1.25, 1)).toBe(1.25);
    expect(stepUiScale(1, -1)).toBe(0.9);
    expect(stepUiScale(0.9, -1)).toBe(0.9);
    expect(stepUiScale(1.2, 1)).toBe(1.25); // unknown value snaps to nearest
    expect(formatUiScale(1.25)).toBe("125%");
  });
});

describe("shell focus mode", () => {
  beforeEach(() => __resetFocusModeForTests());

  it("combines the explicit flag with ref-counted requests", () => {
    expect(getFocusMode()).toBe(false);
    const release = requestFocusMode();
    expect(getFocusMode()).toBe(true);
    setFocusMode(false);
    expect(getFocusMode()).toBe(true); // still requested
    release();
    release(); // idempotent
    expect(getFocusMode()).toBe(false);
    setFocusMode(true);
    expect(getFocusMode()).toBe(true);
  });
});
