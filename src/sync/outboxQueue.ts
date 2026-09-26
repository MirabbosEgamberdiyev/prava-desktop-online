import { dbClient } from "../database/dbClient";
import { getActiveUserId } from "../utils/userScope";
import type { DbOutboxItem, OutboxAction } from "../database/schema";

// Helper to determine currently active user ID for outbox isolation
export function getCurrentUserId(): string | number | null {
  return getActiveUserId();
}

// Deterministic UUID v4 generator without external dependency
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class OutboxQueue {
  /**
   * Yangi mutatsiyani navbatga qo'shish (Offline rejimda yoki onlayn vaqtinchalik xatoda).
   * Foydalanuvchi hisobi bo'yicha avtomatik izolyatsiya qilinadi.
   */
  static async enqueue<T>(
    actionType: OutboxAction,
    endpoint: string,
    httpMethod: "POST" | "PUT" | "DELETE" | "PATCH",
    payload: T,
    explicitUserId?: string | number | null
  ): Promise<string> {
    const id = generateUUID();
    const now = Date.now();
    const userId = explicitUserId !== undefined ? explicitUserId : getCurrentUserId();

    // Outbox mutation collapsing for opposing SAVE / UNSAVE questions
    if (actionType === "SAVE_QUESTION" || actionType === "UNSAVE_QUESTION") {
      const opposingType: OutboxAction = actionType === "SAVE_QUESTION" ? "UNSAVE_QUESTION" : "SAVE_QUESTION";
      try {
        const pending = await dbClient.getPendingOutbox(userId);
        const opposingItem = pending.find(
          (p) => p.action_type === opposingType && p.endpoint === endpoint
        );
        if (opposingItem) {
          await dbClient.removeOutboxItem(opposingItem.id);
          return opposingItem.id;
        }
      } catch (err) {
        console.warn("[OutboxQueue] Mutation collapse error:", err);
      }
    }

    // Locally graded exam results: one outbox row per clientSessionId (server is idempotent too).
    if (actionType === "RECORD_OFFLINE_EXAM") {
      const csid = (payload as { clientSessionId?: string } | null)?.clientSessionId;
      if (csid) {
        try {
          const all = await dbClient.getAllOutbox();
          const dup = all.find((p) => {
            if (p.action_type !== "RECORD_OFFLINE_EXAM" || p.status === "FAILED") return false;
            try {
              return JSON.parse(p.payload_json)?.clientSessionId === csid;
            } catch {
              return false;
            }
          });
          if (dup) return dup.id;
        } catch (err) {
          console.warn("[OutboxQueue] Dedupe check error:", err);
        }
      }
    }

    const item: DbOutboxItem = {
      id,
      user_id: userId,
      action_type: actionType,
      endpoint,
      http_method: httpMethod,
      payload_json: JSON.stringify(payload),
      status: "PENDING",
      retry_count: 0,
      last_error: null,
      created_at: now,
      updated_at: now,
    };

    await dbClient.enqueueOutbox(item);
    if (typeof window !== "undefined") {
      // Lets the sync engine flush right away instead of waiting for its next tick.
      window.dispatchEvent(new Event("prava-outbox-enqueued"));
    }
    return id;
  }

  /**
   * Barcha kutilayotgan (PENDING) mutatsiyalarni olish (ixtiyoriy userId bo'yicha filtrlangan).
   */
  static async getPending(userId?: string | number | null): Promise<DbOutboxItem[]> {
    // undefined → logged-in user; null → guest. Never another user's rows.
    return dbClient.getPendingOutbox(userId);
  }

  /**
   * Mutatsiyani ishlov berilayotgan (IN_FLIGHT) holatiga o'tkazish.
   */
  static async markInFlight(id: string): Promise<void> {
    await dbClient.updateOutboxItem(id, { status: "IN_FLIGHT" });
  }

  /**
   * Muvaffaqiyatli sinxronlangan mutatsiyani tozalash.
   */
  static async markSynced(id: string): Promise<void> {
    await dbClient.removeOutboxItem(id);
  }

  /**
   * Xatolikka uchragan mutatsiyani qayta urinish holatiga qaytarish (exponential backoff).
   */
  static async markFailed(id: string, errorMessage: string, currentRetryCount: number): Promise<void> {
    const nextRetry = currentRetryCount + 1;
    // Agar 10 martadan ko'p xato bersa, FAILED holatida qoldiramiz (dead-letter queue)
    const status = nextRetry >= 10 ? "FAILED" : "PENDING";

    await dbClient.updateOutboxItem(id, {
      status,
      retry_count: nextRetry,
      last_error: errorMessage,
    });
  }
}
