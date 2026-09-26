/**
 * P0: locally graded exams must reach the server via POST /api/v2/exams/record-offline
 * (never /api/v2/exams/submit with a fake Date.now() session id).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildRecordOfflinePayload,
  convertLegacySubmitItem,
  isFakeLocalSessionId,
  isRecordablePayload,
  normalizeClientSessionId,
  RECORD_OFFLINE_URL,
} from "../src/services/offlineExamRecord";
import { reportExamResult } from "../src/services/desktopAdapter";
import { OutboxQueue } from "../src/sync/outboxQueue";
import { networkModeManager } from "../src/sync/networkModeManager";
import api from "../src/api/api";
import type { DbExamSession, DbOutboxItem } from "../src/database/schema";

const qs = (n: number, start = 100) => Array.from({ length: n }, (_, i) => ({ id: start + i }));

describe("buildRecordOfflinePayload", () => {
  it("includes ALL questions in exam order; unanswered → selectedOptionIndex null", () => {
    const p = buildRecordOfflinePayload({
      clientSessionId: "3f0c2a6e-1111-4222-8333-944455556666",
      examType: "real",
      durationSeconds: 612.4,
      completedAt: 1_760_000_000_000,
      questions: qs(5),
      answers: { 0: { selected: 1 }, 2: { selected: 0 }, 4: { selected: 3 } },
    });

    expect(p.totalQuestions).toBe(5);
    expect(p.answers).toEqual([
      { questionId: 100, selectedOptionIndex: 1, timeSpentSeconds: 0 },
      { questionId: 101, selectedOptionIndex: null, timeSpentSeconds: 0 },
      { questionId: 102, selectedOptionIndex: 0, timeSpentSeconds: 0 },
      { questionId: 103, selectedOptionIndex: null, timeSpentSeconds: 0 },
      { questionId: 104, selectedOptionIndex: 3, timeSpentSeconds: 0 },
    ]);
    expect(p).toMatchObject({
      examType: "real",
      targetId: null,
      durationSeconds: 612,
      completedAt: 1_760_000_000_000,
    });
  });

  it("an exam with zero answers still sends every question as unanswered", () => {
    const p = buildRecordOfflinePayload({
      clientSessionId: "s-empty",
      examType: "marathon",
      durationSeconds: 1200,
      completedAt: 1,
      questions: qs(20),
      answers: {},
    });
    expect(p.totalQuestions).toBe(20);
    expect(p.answers.every((a) => a.selectedOptionIndex === null)).toBe(true);
  });

  it("clientSessionId is stable: same local session → same id (retries are idempotent)", () => {
    const input = {
      clientSessionId: "local-uuid-42",
      examType: "ticket" as const,
      targetId: 7,
      durationSeconds: 100,
      completedAt: 5,
      questions: qs(3),
      answers: { 1: { selected: 2 } },
    };
    const a = buildRecordOfflinePayload(input);
    const b = buildRecordOfflinePayload({ ...input, completedAt: 999 });
    expect(a.clientSessionId).toBe("local-uuid-42");
    expect(b.clientSessionId).toBe(a.clientSessionId);
    expect(a.targetId).toBe(7);
  });

  it("clientSessionId is trimmed and capped at 100 chars", () => {
    expect(normalizeClientSessionId("  abc  ")).toBe("abc");
    expect(normalizeClientSessionId("x".repeat(150))).toHaveLength(100);
    expect(normalizeClientSessionId("").length).toBeGreaterThan(0);
  });

  it("drops duplicate question ids (first wins) and invalid selections", () => {
    const p = buildRecordOfflinePayload({
      clientSessionId: "dup",
      examType: "wrong",
      durationSeconds: -5,
      completedAt: 10,
      questions: [{ id: 1 }, { id: 2 }, { id: 1 }],
      answers: { 0: { selected: -1 }, 1: { selected: 1.5 }, 2: { selected: 2 } },
      timeSpent: { 0: 12.6, 1: -3 },
    });
    expect(p.answers).toEqual([
      { questionId: 1, selectedOptionIndex: null, timeSpentSeconds: 13 },
      { questionId: 2, selectedOptionIndex: null, timeSpentSeconds: 0 },
    ]);
    expect(p.durationSeconds).toBe(0);
  });

  it("> 200 questions is not recordable (backend limit)", () => {
    const big = buildRecordOfflinePayload({
      clientSessionId: "big",
      examType: "marathon",
      durationSeconds: 1,
      completedAt: 1,
      questions: qs(201),
      answers: {},
    });
    expect(isRecordablePayload(big)).toBe(false);
    const ok = buildRecordOfflinePayload({ ...big, questions: qs(200), clientSessionId: "ok", examType: "marathon", answers: {} });
    expect(isRecordablePayload(ok)).toBe(true);
  });
});

describe("reportExamResult", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    networkModeManager.setMode("OFFLINE_ONLY");
  });

  it("locally graded exam → outbox RECORD_OFFLINE_EXAM to /api/v2/exams/record-offline (no /submit)", async () => {
    const enqueueSpy = vi.spyOn(OutboxQueue, "enqueue").mockResolvedValue("id-1");
    const postSpy = vi.spyOn(api, "post");

    const via = await reportExamResult({
      serverSessionId: null,
      localSessionId: "local-abc",
      examType: "real",
      questions: qs(3),
      answers: { 0: { selected: 0 } },
      durationSeconds: 90,
      completedAt: 1234,
    });

    expect(via).toBe("record-offline");
    expect(postSpy).not.toHaveBeenCalled();
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const [action, url, method, payload] = enqueueSpy.mock.calls[0] as any[];
    expect(action).toBe("RECORD_OFFLINE_EXAM");
    expect(url).toBe(RECORD_OFFLINE_URL);
    expect(method).toBe("POST");
    expect(payload).toMatchObject({ clientSessionId: "local-abc", examType: "real", totalQuestions: 3 });
    expect(payload.answers.map((a: any) => a.selectedOptionIndex)).toEqual([0, null, null]);
  });

  it("a fake Date.now() session id is never treated as a server session", async () => {
    const enqueueSpy = vi.spyOn(OutboxQueue, "enqueue").mockResolvedValue("id-2");
    const via = await reportExamResult({
      serverSessionId: Date.now(),
      localSessionId: "local-def",
      examType: "marathon",
      questions: qs(2),
      answers: {},
      durationSeconds: 10,
    });
    expect(via).toBe("record-offline");
    expect(enqueueSpy.mock.calls[0][1]).toBe(RECORD_OFFLINE_URL);
  });

  it("real server session keeps using /api/v2/exams/submit", async () => {
    const enqueueSpy = vi.spyOn(OutboxQueue, "enqueue").mockResolvedValue("id-3");
    const via = await reportExamResult({
      serverSessionId: 4321,
      localSessionId: "local-ghi",
      examType: "ticket",
      questions: qs(2),
      answers: { 1: { selected: 2 } },
      durationSeconds: 10,
    });
    expect(via).toBe("submit");
    // OFFLINE_ONLY → queued for later, but on the /submit contract with the real id
    expect(enqueueSpy).toHaveBeenCalledWith(
      "SUBMIT_EXAM",
      "/api/v2/exams/submit",
      "POST",
      expect.objectContaining({ sessionId: 4321 })
    );
  });
});

describe("legacy dead-letter conversion", () => {
  const legacyItem = (payload: unknown, extra: Partial<DbOutboxItem> = {}): DbOutboxItem => ({
    id: "row-1",
    user_id: 5,
    action_type: "SUBMIT_EXAM",
    endpoint: "/api/v2/exams/submit",
    http_method: "POST",
    payload_json: JSON.stringify(payload),
    status: "FAILED",
    retry_count: 10,
    last_error: "Client error 404",
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
    ...extra,
  });

  it("detects fake Date.now() ids only", () => {
    expect(isFakeLocalSessionId(1_700_000_000_000)).toBe(true);
    expect(isFakeLocalSessionId(98765)).toBe(false);
    expect(isFakeLocalSessionId("abc")).toBe(false);
  });

  it("converts a dead-lettered fake-session submit into a PENDING record-offline row", () => {
    const fakeId = 1_700_000_000_123;
    const session: DbExamSession = {
      local_id: "sess-uuid",
      server_id: fakeId,
      exam_type: "ticket_12",
      status: "COMPLETED",
      total_questions: 3,
      correct_answers: 1,
      score: 33,
      duration_seconds: 321,
      time_remaining_seconds: 0,
      started_at: 1,
      completed_at: 1_700_000_500_000,
      answers_json: "{}",
      synced: 0,
    };
    const item = legacyItem({
      sessionId: fakeId,
      answers: [
        { questionId: 1, selectedOptionIndex: 2, timeSpentSeconds: 4 },
        { questionId: 2, selectedOptionIndex: null, timeSpentSeconds: 0 },
        { questionId: 3, selectedOptionIndex: 0, timeSpentSeconds: 0 },
      ],
    });

    const next = convertLegacySubmitItem(item, session)!;
    expect(next).not.toBeNull();
    expect(next.id).toBe("row-1");
    expect(next.action_type).toBe("RECORD_OFFLINE_EXAM");
    expect(next.endpoint).toBe(RECORD_OFFLINE_URL);
    expect(next.status).toBe("PENDING");
    expect(next.retry_count).toBe(0);
    const p = JSON.parse(next.payload_json);
    expect(p).toMatchObject({
      clientSessionId: "sess-uuid",
      examType: "ticket",
      targetId: 12,
      durationSeconds: 321,
      completedAt: 1_700_000_500_000,
      totalQuestions: 3,
    });
    expect(p.answers[1]).toEqual({ questionId: 2, selectedOptionIndex: null, timeSpentSeconds: 0 });
  });

  it("without a local session falls back to a deterministic clientSessionId", () => {
    const fakeId = 1_700_000_000_999;
    const next = convertLegacySubmitItem(
      legacyItem({ sessionId: fakeId, answers: [{ questionId: 9, selectedOptionIndex: 1 }] }),
      null
    )!;
    const p = JSON.parse(next.payload_json);
    expect(p.clientSessionId).toBe(`desktop-legacy-${fakeId}`);
    expect(p.examType).toBe("marathon");
    expect(p.completedAt).toBe(1_700_000_000_000);
  });

  it("leaves real server-session submits and other actions untouched", () => {
    expect(convertLegacySubmitItem(legacyItem({ sessionId: 555, answers: [] }), null)).toBeNull();
    expect(
      convertLegacySubmitItem(legacyItem({ questionId: 1 }, { action_type: "SAVE_QUESTION" }), null)
    ).toBeNull();
  });
});
