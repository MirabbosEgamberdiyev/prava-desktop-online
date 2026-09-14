import { describe, it, expect, beforeEach } from "vitest";

class LocalStorageMock {
  store: Record<string, string> = {};
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

if (typeof (globalThis as any).localStorage === "undefined") {
  (globalThis as any).localStorage = new LocalStorageMock();
}
if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = { dispatchEvent: () => {} };
}

import storageService from "../src/services/storageService";

describe("Multi-Account Storage Isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isolates wrong answers between Account A and Account B", () => {
    // 1. Account A logs in
    localStorage.setItem("userData", JSON.stringify({ id: 101, fullName: "User A" }));
    const question1 = {
      id: 1,
      textUzl: "Savol 1",
      options: [{ uzl: "A" }, { uzl: "B" }],
      correctOption: 0,
    };
    storageService.addWrongAnswer(question1);
    expect(storageService.getWrongAnswers().length).toBe(1);
    expect(storageService.getWrongAnswers()[0].question.id).toBe(1);

    // 2. Switch to Account B
    localStorage.setItem("userData", JSON.stringify({ id: 202, fullName: "User B" }));
    expect(storageService.getWrongAnswers().length).toBe(0);

    // Account B adds question 2
    const question2 = {
      id: 2,
      textUzl: "Savol 2",
      options: [{ uzl: "C" }, { uzl: "D" }],
      correctOption: 1,
    };
    storageService.addWrongAnswer(question2);
    expect(storageService.getWrongAnswers().length).toBe(1);
    expect(storageService.getWrongAnswers()[0].question.id).toBe(2);

    // 3. Switch back to Account A
    localStorage.setItem("userData", JSON.stringify({ id: 101, fullName: "User A" }));
    expect(storageService.getWrongAnswers().length).toBe(1);
    expect(storageService.getWrongAnswers()[0].question.id).toBe(1);
  });

  it("isolates saved questions (bookmarks) between Account A and Account B", () => {
    // Account A saves question 15
    localStorage.setItem("userData", JSON.stringify({ id: 101, fullName: "User A" }));
    const q15 = {
      id: 15,
      textUzl: "Savol 15",
      options: [{ uzl: "A" }],
      correctOption: 0,
    };
    storageService.toggleSavedQuestion(q15);
    expect(storageService.isSaved(15)).toBe(true);

    // Account B checks question 15
    localStorage.setItem("userData", JSON.stringify({ id: 202, fullName: "User B" }));
    expect(storageService.isSaved(15)).toBe(false);
  });
});