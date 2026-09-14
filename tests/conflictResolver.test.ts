import { describe, it, expect } from "vitest";
import { ConflictResolver } from "../src/sync/conflictResolver";
import type { DbUserProgress, DbSavedQuestion } from "../src/database/schema";

describe("ConflictResolver Engine", () => {
  describe("Exam Session Resolution (Monotonic Best-Score)", () => {
    it("preserves local score when no server score exists", () => {
      const local = {
        localId: "uuid-1",
        score: 95,
        correctAnswers: 19,
        totalQuestions: 20,
        durationSeconds: 600,
        completedAt: Date.now(),
      };
      const res = ConflictResolver.resolveExamSession(local, null);
      expect(res.winningScore).toBe(95);
      expect(res.winningCorrectAnswers).toBe(19);
      expect(res.action).toBe("KEEP_LOCAL");
    });

    it("favors higher local score over lower server score", () => {
      const local = {
        localId: "uuid-1",
        score: 100,
        correctAnswers: 20,
        totalQuestions: 20,
        durationSeconds: 500,
        completedAt: Date.now(),
      };
      const server = {
        id: 123,
        score: 85,
        correctAnswers: 17,
        totalQuestions: 20,
        durationSeconds: 700,
        completedAt: Date.now() - 10000,
      };
      const res = ConflictResolver.resolveExamSession(local, server);
      expect(res.winningScore).toBe(100);
      expect(res.winningCorrectAnswers).toBe(20);
      expect(res.action).toBe("KEEP_LOCAL");
    });

    it("favors higher server score if server is superior", () => {
      const local = {
        localId: "uuid-1",
        score: 75,
        correctAnswers: 15,
        totalQuestions: 20,
        durationSeconds: 800,
        completedAt: Date.now(),
      };
      const server = {
        id: 123,
        score: 90,
        correctAnswers: 18,
        totalQuestions: 20,
        durationSeconds: 650,
        completedAt: Date.now() - 5000,
      };
      const res = ConflictResolver.resolveExamSession(local, server);
      expect(res.winningScore).toBe(90);
      expect(res.winningCorrectAnswers).toBe(18);
      expect(res.action).toBe("KEEP_SERVER");
    });
  });

  describe("Progress Resolution (Monotonic Completion Invariant)", () => {
    it("never regresses completed items or scores", () => {
      const local: DbUserProgress = {
        progress_key: "ticket_1",
        progress_type: "TICKET",
        total_items: 20,
        completed_items: 20,
        correct_count: 19,
        best_score: 95,
        passed: 1,
        updated_at: 1000,
      };
      const server = {
        key: "ticket_1",
        type: "TICKET" as const,
        totalItems: 20,
        completedItems: 15,
        correctCount: 14,
        bestScore: 70,
        passed: false,
        updatedAt: 2000,
      };
      const res = ConflictResolver.resolveProgress(local, server);
      expect(res.completed_items).toBe(20);
      expect(res.correct_count).toBe(19);
      expect(res.best_score).toBe(95);
      expect(res.passed).toBe(1);
    });
  });

  describe("Bookmarks Resolution (Tombstone Set Union)", () => {
    it("honors offline deletion tombstone when newer than server", () => {
      const local: DbSavedQuestion[] = [
        { question_id: 42, saved_at: 5000, is_deleted: 1, synced: 0 },
      ];
      const server = [{ questionId: 42, savedAt: 2000 }];

      const res = ConflictResolver.resolveBookmarks(local, server);
      expect(res.toDeleteOnServer).toContain(42);
      expect(res.finalLocalActiveIds).not.toContain(42);
    });

    it("resurrects bookmark if saved on server after local deletion", () => {
      const local: DbSavedQuestion[] = [
        { question_id: 42, saved_at: 2000, is_deleted: 1, synced: 0 },
      ];
      const server = [{ questionId: 42, savedAt: 8000 }];

      const res = ConflictResolver.resolveBookmarks(local, server);
      expect(res.finalLocalActiveIds).toContain(42);
    });

    it("unions new remote bookmarks without duplicates", () => {
      const local: DbSavedQuestion[] = [
        { question_id: 10, saved_at: 1000, is_deleted: 0, synced: 1 },
      ];
      const server = [
        { questionId: 10, savedAt: 1000 },
        { questionId: 20, savedAt: 2000 },
      ];

      const res = ConflictResolver.resolveBookmarks(local, server);
      expect(res.finalLocalActiveIds).toHaveLength(2);
      expect(res.finalLocalActiveIds).toContain(10);
      expect(res.finalLocalActiveIds).toContain(20);
    });
  });
});