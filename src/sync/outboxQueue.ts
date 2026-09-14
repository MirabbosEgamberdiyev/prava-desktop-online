/**
 * PRAVA DESKTOP ONLINE — OUTBOX QUEUE MANAGER
 * Outbox pattern implementation for offline mutations with idempotency.
 */

import { dbClient } from "../database/dbClient";
import type { DbOutboxItem, OutboxAction } from "../database/schema";

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
   */
  static async enqueue<T>(
    actionType: OutboxAction,
    endpoint: string,
    httpMethod: "POST" | "PUT" | "DELETE" | "PATCH",
    payload: T
  ): Promise<string> {
    const id = generateUUID();
    const now = Date.now();

    const item: DbOutboxItem = {
      id,
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
    return id;
  }

  /**
   * Barcha kutilayotgan (PENDING) mutatsiyalarni olish.
   */
  static async getPending(): Promise<DbOutboxItem[]> {
    return dbClient.getPendingOutbox();
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
