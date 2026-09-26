import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXAM_RULES,
  durationSecondsFor,
  isExamPassed,
  maxWrongFor,
  normalizeExamRules,
} from "../src/services/examRules";

describe("exam timing", () => {
  it("marathon is TIMED: 1 min per question by default", () => {
    expect(DEFAULT_EXAM_RULES.marathon.secondsPerQuestion).toBe(60);
    expect(durationSecondsFor("marathon", 20, DEFAULT_EXAM_RULES)).toBe(1200);
    expect(durationSecondsFor("marathon", 50, normalizeExamRules({ marathon: { secondsPerQuestion: 90 } }))).toBe(4500);
  });

  it("real exam duration comes from rules.real.secondsPerQuestion (not a hard-coded 60)", () => {
    const rules = normalizeExamRules({ real: { secondsPerQuestion: 45 } });
    expect(durationSecondsFor("real", 20, rules)).toBe(900);
  });
});

describe("isExamPassed", () => {
  const R = DEFAULT_EXAM_RULES;

  it("real: passes when wrong + unanswered <= floor(maxWrong × count / questionCount)", () => {
    expect(maxWrongFor(20, R)).toBe(2);
    expect(isExamPassed({ mode: "real", total: 20, correct: 18, wrong: 2, unanswered: 0 }, R)).toBe(true);
    expect(isExamPassed({ mode: "real", total: 20, correct: 18, wrong: 1, unanswered: 1 }, R)).toBe(true);
    expect(isExamPassed({ mode: "real", total: 20, correct: 17, wrong: 3, unanswered: 0 }, R)).toBe(false);
    expect(isExamPassed({ mode: "real", total: 20, correct: 17, wrong: 1, unanswered: 2 }, R)).toBe(false);
    expect(isExamPassed({ mode: "real", total: 10, correct: 9, wrong: 1, unanswered: 0 }, R)).toBe(true);
    expect(isExamPassed({ mode: "real", total: 10, correct: 8, wrong: 2, unanswered: 0 }, R)).toBe(false);
    expect(isExamPassed({ mode: "real", total: 15, correct: 13, wrong: 2, unanswered: 0 }, R)).toBe(false); // floor(1.5)=1
  });

  it("real: unanswered ignored when unansweredCountsAsWrong=false", () => {
    const rules = normalizeExamRules({ real: { unansweredCountsAsWrong: false } });
    expect(isExamPassed({ mode: "real", total: 20, correct: 15, wrong: 2, unanswered: 3 }, rules)).toBe(true);
  });

  it("ticket / marathon / wrong / package: percent >= passPercent (90)", () => {
    for (const mode of ["ticket", "marathon", "wrong", "package"] as const) {
      expect(isExamPassed({ mode, total: 10, correct: 9, wrong: 1, unanswered: 0 }, R)).toBe(true);
      expect(isExamPassed({ mode, total: 10, correct: 8, wrong: 1, unanswered: 1 }, R)).toBe(false);
      expect(isExamPassed({ mode, total: 20, correct: 18, wrong: 0, unanswered: 2 }, R)).toBe(true);
    }
  });

  it("uses the server-provided pass percent per mode", () => {
    const rules = normalizeExamRules({ marathon: { passPercent: 80 } });
    expect(isExamPassed({ mode: "marathon", total: 10, correct: 8, wrong: 2, unanswered: 0 }, rules)).toBe(true);
    expect(isExamPassed({ mode: "ticket", total: 10, correct: 8, wrong: 2, unanswered: 0 }, rules)).toBe(false);
  });

  it("an exam without questions never passes", () => {
    expect(isExamPassed({ mode: "ticket", total: 0, correct: 0, wrong: 0, unanswered: 0 }, R)).toBe(false);
    expect(isExamPassed({ mode: "real", total: 0, correct: 0, wrong: 0, unanswered: 0 }, R)).toBe(false);
  });
});
