/**
 * PRAVA DESKTOP ONLINE — OUTBOX REPOSITORY
 * Persistent Sync Queue for Offline Mutations with Idempotency & Crash Safety
 */

import { dbClient } from "../dbClient";
import type { DbOutboxItem, OutboxAction } from "../schema";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const outboxRepository = {
  /**
   * Enqueue a new mutation into the outbox queue
   */
  async enqueue(
    actionType: OutboxAction,
    endpoint: string,
    httpMethod: "POST" | "PUT" | "DELETE" | "PATCH",
    payload: any,
    idempotencyKey?: string
  ): Promise<string> {
    const id = idempotencyKey || generateUUID();
    const item: DbOutboxItem = {
      id,
      action_type: actionType,
      endpoint,
      http_method: httpMethod,
      payload_json: typeof payload === "string" ? payload : JSON.stringify(payload),
      status: "PENDING",
      retry_count: 0,
      last_error: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await dbClient.enqueueOutbox(item);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("prava-storage-changed"));
    }
    return id;
  },

  /**
   * Get all PENDING mutation items ready to push
   */
  async getPending(): Promise<DbOutboxItem[]> {
    return dbClient.getPendingOutbox();
  },

  /**
   * Mark an item as in-flight
   */
  async markInFlight(id: string): Promise<void> {
    await dbClient.updateOutboxItem(id, { status: "IN_FLIGHT" });
  },

  /**
   * Mark an item as synced and delete from queue
   */
  async markSynced(id: string): Promise<void> {
    await dbClient.removeOutboxItem(id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("prava-storage-changed"));
    }
  },

  /**
   * Mark an item as failed with error and increment retry count
   */
  async markFailed(id: string, errorMessage: string, retryCount: number): Promise<void> {
    const maxRetries = 5;
    const nextStatus = retryCount >= maxRetries ? "FAILED" : "PENDING";
    await dbClient.updateOutboxItem(id, {
      status: nextStatus,
      retry_count: retryCount + 1,
      last_error: errorMessage,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("prava-storage-changed"));
    }
  },

  /**
   * Reset all stuck IN_FLIGHT items back to PENDING (Crash Recovery)
   */
  async recoverStuckItems(): Promise<number> {
    const pending = await dbClient.getPendingOutbox();
    let recovered = 0;
    for (const item of pending) {
      if (item.status === "IN_FLIGHT") {
        await dbClient.updateOutboxItem(item.id, { status: "PENDING" });
        recovered++;
      }
    }
    return recovered;
  },
};
