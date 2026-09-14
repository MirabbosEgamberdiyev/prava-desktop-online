/**
 * PRAVA DESKTOP ONLINE — CONFLICT RESOLUTION ENGINE
 * Deterministic conflict resolution strategies across distributed offline/online states.
 *
 * Strategies:
 * 1. Exam Results: Monotonic Best-Score & Multi-Session Retention.
 * 2. User Progress: Timestamp LWW with Monotonic Completion Invariant.
 * 3. Bookmarks (Saved Questions): Tombstone Set Union with Deletion Priority.
 * 4. User Profile / Settings: Server-Authoritative (Subscription/Identity) + Local-Authoritative (Preferences).
 */

import type { DbUserProgress, DbSavedQuestion } from "../database/schema";

export interface ServerExamResult {
  id: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  durationSeconds: number;
  completedAt: string | number;
}

export interface LocalExamResult {
  localId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  durationSeconds: number;
  completedAt: number;
}

export interface ResolvedExamConflict {
  winningScore: number;
  winningCorrectAnswers: number;
  action: "KEEP_LOCAL" | "KEEP_SERVER" | "MERGE_BEST";
  mergedSummary: {
    bestScore: number;
    totalAttempts: number;
  };
}

export interface ServerProgressRecord {
  key: string;
  type: "TICKET" | "TOPIC" | "MARATHON";
  totalItems: number;
  completedItems: number;
  correctCount: number;
  bestScore: number;
  passed: boolean;
  updatedAt: number;
}

export interface ServerBookmark {
  questionId: number;
  savedAt: number;
}

export class ConflictResolver {
  /**
   * 1. EXAM CONFLICT RESOLUTION
   * Invariant: Learning progress is monotonic; a user's true best score should never regress due to a network lag.
   */
  static resolveExamSession(
    local: LocalExamResult,
    server: ServerExamResult | null
  ): ResolvedExamConflict {
    if (!server) {
      return {
        winningScore: local.score,
        winningCorrectAnswers: local.correctAnswers,
        action: "KEEP_LOCAL",
        mergedSummary: {
          bestScore: local.score,
          totalAttempts: 1,
        },
      };
    }

    const bestScore = Math.max(local.score, server.score);
    const bestCorrect = Math.max(local.correctAnswers, server.correctAnswers);

    return {
      winningScore: bestScore,
      winningCorrectAnswers: bestCorrect,
      action: local.score >= server.score ? "KEEP_LOCAL" : "KEEP_SERVER",
      mergedSummary: {
        bestScore,
        totalAttempts: 2,
      },
    };
  }

  /**
   * 2. PROGRESS CONFLICT RESOLUTION
   * Invariant: Progress never shrinks; whichever record contains more completed items or higher score is preserved.
   */
  static resolveProgress(
    local: DbUserProgress,
    server: ServerProgressRecord
  ): DbUserProgress {
    // Monotonic invariants: progress cannot decrease
    const totalItems = Math.max(local.total_items, server.totalItems);
    const completedItems = Math.max(local.completed_items, server.completedItems);
    const correctCount = Math.max(local.correct_count, server.correctCount);
    const bestScore = Math.max(local.best_score, server.bestScore);
    const passed = local.passed === 1 || server.passed ? 1 : 0;
    const updatedAt = Math.max(local.updated_at, server.updatedAt);

    return {
      progress_key: local.progress_key,
      progress_type: local.progress_type,
      total_items: totalItems,
      completed_items: completedItems,
      correct_count: correctCount,
      best_score: bestScore,
      passed,
      updated_at: updatedAt,
    };
  }

  /**
   * 3. BOOKMARK / SAVED QUESTIONS CONFLICT RESOLUTION (Tombstone Set Union)
   * Resolves discrepancies between local bookmarks (including pending offline deletions) and remote bookmarks.
   *
   * @param localItems Local list containing both active items and tombstones (is_deleted === 1)
   * @param serverItems Remote list of active bookmarks from backend
   * @returns Array of questions to save to server, array to delete from server, and final local active list
   */
  static resolveBookmarks(
    localItems: DbSavedQuestion[],
    serverItems: ServerBookmark[]
  ): {
    toSyncToServer: number[];
    toDeleteOnServer: number[];
    finalLocalActiveIds: number[];
  } {
    const localMap = new Map<number, DbSavedQuestion>();
    for (const item of localItems) {
      localMap.set(item.question_id, item);
    }

    const serverMap = new Map<number, ServerBookmark>();
    for (const item of serverItems) {
      serverMap.set(item.questionId, item);
    }

    const toSyncToServer: number[] = [];
    const toDeleteOnServer: number[] = [];
    const finalActiveSet = new Set<number>();

    // Process all local items
    for (const [qid, localItem] of localMap.entries()) {
      const serverItem = serverMap.get(qid);

      if (localItem.is_deleted === 1) {
        // Local tombstone (user unsaved offline)
        if (serverItem) {
          // If deleted locally after server saved timestamp -> tombstone wins
          if (localItem.saved_at >= serverItem.savedAt) {
            toDeleteOnServer.push(qid);
          } else {
            // Server was saved after local deletion -> resurrect
            finalActiveSet.add(qid);
          }
        }
      } else {
        // Local active bookmark
        finalActiveSet.add(qid);
        if (!serverItem) {
          toSyncToServer.push(qid);
        }
      }
    }

    // Process server items that were not present locally
    for (const [qid] of serverMap.entries()) {
      if (!localMap.has(qid)) {
        finalActiveSet.add(qid);
      }
    }

    return {
      toSyncToServer,
      toDeleteOnServer,
      finalLocalActiveIds: Array.from(finalActiveSet),
    };
  }

  /**
   * 4. PROFILE & PREFERENCES CONFLICT RESOLUTION
   * Split-brain prevention:
   * - Identity & Subscription: Server is strictly authoritative.
   * - Local UX Preferences: Client is strictly authoritative.
   */
  static resolveProfileAndPreferences<
    TServerUser extends Record<string, unknown>,
    TLocalPrefs extends Record<string, unknown>
  >(
    serverUser: TServerUser,
    localPreferences: TLocalPrefs
  ): { user: TServerUser; preferences: TLocalPrefs } {
    return {
      user: { ...serverUser },
      preferences: { ...localPreferences },
    };
  }
}
