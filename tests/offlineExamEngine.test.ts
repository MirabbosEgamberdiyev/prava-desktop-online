/**
 * PRAVA DESKTOP ONLINE — OFFLINE EXAM ENGINE & ZERO-NETWORK INVARIANT TEST SUITE
 * Verifies:
 * 1. ZERO network calls during exam question fetching in OFFLINE mode.
 * 2. Ticket exam loading from local SQLite/IndexedDB in OFFLINE mode.
 * 3. Exam session completion enqueues to OutboxQueue with ZERO network calls in OFFLINE mode.
 * 4. Offline media path normalization and strict zero-network fallback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getExamQuestions,
  getQuestionsByTicket,
  getMarathonQuestions,
  submitExamSession,
} from "../src/services/desktopAdapter";
import { networkModeManager } from "../src/sync/networkModeManager";
import { questionRepository } from "../src/database/repositories/questionRepository";
import { dbClient } from "../src/database/dbClient";
import { OutboxQueue } from "../src/sync/outboxQueue";
import api from "../src/api/api";
import {
  normalizeMediaPath,
  getRemoteMediaUrl,
  offlineMediaManager,
} from "../src/services/offlineMediaManager";

describe("Offline Exam Engine — Zero-Network Invariant Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    networkModeManager.setMode("OFFLINE_ONLY");
  });

  it("1. Strict OFFLINE mode: getExamQuestions returns 20 local questions with ZERO network calls", async () => {
    const apiPostSpy = vi.spyOn(api, "post");
    const apiGetSpy = vi.spyOn(api, "get");

    const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      ticket_id: 1,
      topic_id: 1,
      order_num: i + 1,
      text_uzl: `Savol #${i + 1}`,
      text_uzc: null,
      text_ru: null,
      explanation_uzl: "Tushuntirish",
      explanation_uzc: null,
      explanation_ru: null,
      image_url: null,
      options_json: JSON.stringify([
        { index: 0, uzl: "Variant A" },
        { index: 1, uzl: "Variant B" },
      ]),
      correct_option: 0,
      updated_at: Date.now(),
    }));

    vi.spyOn(questionRepository, "getRandomQuestions").mockResolvedValue(mockQuestions as any);

    const questions = await getExamQuestions(20);

    expect(questions.length).toBe(20);
    expect(questions[0].text_uzl).toBe("Savol #1");
    // CRITICAL: Remote API calls must be STRICTLY ZERO
    expect(apiPostSpy).not.toHaveBeenCalled();
    expect(apiGetSpy).not.toHaveBeenCalled();
  });

  it("2. Strict OFFLINE mode: getQuestionsByTicket returns ticket questions with ZERO network calls", async () => {
    const apiPostSpy = vi.spyOn(api, "post");
    const apiGetSpy = vi.spyOn(api, "get");

    const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
      id: i + 100,
      ticket_id: 2,
      topic_id: 1,
      order_num: i + 1,
      text_uzl: `Bilet 2 Savol #${i + 1}`,
      text_uzc: null,
      text_ru: null,
      explanation_uzl: null,
      explanation_uzc: null,
      explanation_ru: null,
      image_url: "/uploads/general/test.png",
      options_json: JSON.stringify([
        { index: 0, uzl: "A" },
        { index: 1, uzl: "B" },
      ]),
      correct_option: 1,
      updated_at: Date.now(),
    }));

    vi.spyOn(questionRepository, "getQuestionsByTicket").mockResolvedValue(mockQuestions as any);

    const questions = await getQuestionsByTicket(2);

    expect(questions.length).toBe(20);
    expect(questions[0].text_uzl).toBe("Bilet 2 Savol #1");
    // Remote API calls must be STRICTLY ZERO
    expect(apiPostSpy).not.toHaveBeenCalled();
    expect(apiGetSpy).not.toHaveBeenCalled();
  });

  it("3. Strict OFFLINE mode: submitExamSession skips HTTP, completes locally, and enqueues to OutboxQueue", async () => {
    const apiPostSpy = vi.spyOn(api, "post");
    const enqueueSpy = vi.spyOn(OutboxQueue, "enqueue").mockResolvedValue({} as any);
    const completeSessionSpy = vi.spyOn(dbClient, "completeExamSession").mockResolvedValue();

    const sessionId = 9999;
    const answers = [
      { questionId: 1, selectedOptionIndex: 0, timeSpentSeconds: 15 },
      { questionId: 2, selectedOptionIndex: 1, timeSpentSeconds: 20 },
    ];

    const success = await submitExamSession(sessionId, answers);

    expect(success).toBe(true);
    // CRITICAL: ZERO remote HTTP requests in offline mode
    expect(apiPostSpy).not.toHaveBeenCalled();
    // Must enqueue mutation to OutboxQueue for deferred sync
    expect(enqueueSpy).toHaveBeenCalledWith(
      "SUBMIT_EXAM",
      "/api/v2/exams/submit",
      "POST",
      expect.objectContaining({
        sessionId: 9999,
        answers: expect.any(Array),
      })
    );
    // Must complete session in local database
    expect(completeSessionSpy).toHaveBeenCalledWith(
      "9999",
      expect.objectContaining({ status: "COMPLETED" })
    );
  });

  it("4. Offline Media Manager: correctly normalizes media paths", () => {
    expect(normalizeMediaPath("uploads/general/9219a07f.png")).toBe("/uploads/general/9219a07f.png");
    expect(normalizeMediaPath("general/9219a07f.png")).toBe("/uploads/general/9219a07f.png");
    expect(normalizeMediaPath("https://pravaonline.uz/uploads/general/9219a07f.png")).toBe(
      "/uploads/general/9219a07f.png"
    );
    expect(normalizeMediaPath(null)).toBeNull();
    expect(normalizeMediaPath("")).toBeNull();
  });

  it("5. Offline Media Manager: constructs valid remote URL for preloading", () => {
    const remoteUrl = getRemoteMediaUrl("/uploads/general/sign.png");
    expect(remoteUrl).toContain("/uploads/general/sign.png");
    expect(remoteUrl.startsWith("http")).toBe(true);
  });

  it("6. Offline Media Manager: refuses network downloads in OFFLINE mode", async () => {
    networkModeManager.setMode("OFFLINE_ONLY");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const cached = await offlineMediaManager.cacheImage("/uploads/general/sign.png");

    expect(cached).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
