/**
 * PRAVA DESKTOP ONLINE — BACKGROUND SYNCHRONIZATION ENGINE
 * Process outbox queue with exponential backoff, rate limiting, and conflict handling.
 */

import api from "../api/api";
import { OutboxQueue } from "./outboxQueue";
import { networkHeartbeat } from "./networkHeartbeat";
import { dbClient } from "../database/dbClient";
import type { DbOutboxItem } from "../database/schema";

export type SyncState = "IDLE" | "SYNCING" | "OFFLINE" | "ERROR";

export class SyncEngine {
  private isRunning: boolean = false;
  private state: SyncState = "IDLE";
  private syncIntervalTimer: any = null;
  private readonly SYNC_INTERVAL_MS = 30000; // Run sync every 30 seconds if online

  constructor() {
    this.init();
  }

  private init(): void {
    // 1. Initialize local database
    dbClient.init().catch(console.error);

    // 2. React to network status changes
    networkHeartbeat.subscribe((isOnline) => {
      if (isOnline) {
        // Immediate sync upon reconnection
        this.triggerSync();
      } else {
        this.state = "OFFLINE";
        this.broadcastStatus();
      }
    });

    // 3. React to successful re-authentication
    if (typeof window !== "undefined") {
      window.addEventListener("desktop-auth-success", () => {
        this.triggerSync();
      });
      window.addEventListener("auth-refresh-end", () => {
        this.triggerSync();
      });
    }

    // 4. Start periodic background sweep
    this.syncIntervalTimer = setInterval(() => {
      const { isOnline } = networkHeartbeat.getStatus();
      if (isOnline && !this.isRunning) {
        this.triggerSync();
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Manually or reactively trigger a synchronization round.
   */
  public async triggerSync(): Promise<void> {
    const { isOnline } = networkHeartbeat.getStatus();
    if (!isOnline || this.isRunning) return;

    this.isRunning = true;
    this.state = "SYNCING";
    this.broadcastStatus();

    try {
      const pendingItems = await OutboxQueue.getPending();
      if (pendingItems.length === 0) {
        this.state = "IDLE";
        this.broadcastStatus();
        return;
      }

      console.info(`[SyncEngine] Processing ${pendingItems.length} outbox item(s)...`);

      for (const item of pendingItems) {
        // Check if we lost connection mid-cycle
        if (!networkHeartbeat.getStatus().isOnline) {
          this.state = "OFFLINE";
          break;
        }

        const success = await this.processItem(item);
        if (!success) {
          // If a network-related failure occurred, pause queue processing
          break;
        }
      }

      this.state = "IDLE";
    } catch (err) {
      console.error("[SyncEngine] Sync error:", err);
      this.state = "ERROR";
    } finally {
      this.isRunning = false;
      this.broadcastStatus();
    }
  }

  /**
   * Process a single queued outbox mutation item
   */
  private async processItem(item: DbOutboxItem): Promise<boolean> {
    await OutboxQueue.markInFlight(item.id);

    try {
      let payload: any = null;
      try {
        payload = JSON.parse(item.payload_json);
      } catch {
        payload = {};
      }

      // Execute network mutation
      const response = await api.request({
        url: item.endpoint,
        method: item.http_method,
        data: payload,
        headers: {
          "X-Idempotency-Key": item.id,
        },
      });

      // Post-sync state resolution
      await this.handlePostSyncSuccess(item, response.data);

      // Successfully synced
      await OutboxQueue.markSynced(item.id);
      return true;
    } catch (err: any) {
      const status = err.response?.status;
      const errorMessage = err.message || "Network error";

      // 1. Authentication failure — pause sync until re-login
      if (status === 401) {
        console.warn("[SyncEngine] 401 Unauthorized encountered. Halting sync until re-authentication.");
        await OutboxQueue.markFailed(item.id, "Unauthorized - token expired", item.retry_count);
        return false;
      }

      // 2. Fatal client validation errors (400, 422) — do not retry indefinitely
      if (status && status >= 400 && status < 500) {
        console.error(`[SyncEngine] Fatal client error ${status} for item ${item.id}. Moving to dead-letter.`);
        await OutboxQueue.markFailed(item.id, `Client error ${status}: ${errorMessage}`, 10);
        return true; // continue next items
      }

      // 3. Transient errors (5xx or network dropped) — retry with backoff
      await OutboxQueue.markFailed(item.id, errorMessage, item.retry_count);
      return false; // stop queue processing for this cycle
    }
  }

  /**
   * Update local database records once remote mutation succeeds
   */
  private async handlePostSyncSuccess(item: DbOutboxItem, responseData: any): Promise<void> {
    switch (item.action_type) {
      case "SUBMIT_EXAM": {
        const payload = JSON.parse(item.payload_json || "{}");
        if (payload.local_id) {
          const serverId = responseData?.data?.id || responseData?.id || null;
          await dbClient.completeExamSession(payload.local_id, {
            server_id: serverId,
            synced: 1,
          });
        }
        break;
      }

      case "SAVE_QUESTION": {
        const payload = JSON.parse(item.payload_json || "{}");
        if (payload.questionId) {
          await dbClient.setQuestionSaved(payload.questionId, true);
        }
        break;
      }

      case "UNSAVE_QUESTION": {
        const payload = JSON.parse(item.payload_json || "{}");
        if (payload.questionId) {
          await dbClient.setQuestionSaved(payload.questionId, false);
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Broadcast sync state to entire frontend application
   */
  private broadcastStatus(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sync-status-changed", {
          detail: {
            state: this.state,
            isRunning: this.isRunning,
          },
        })
      );
    }
  }

  public getState(): SyncState {
    return this.state;
  }

  public destroy(): void {
    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer);
    }
  }
}

export const syncEngine = new SyncEngine();
