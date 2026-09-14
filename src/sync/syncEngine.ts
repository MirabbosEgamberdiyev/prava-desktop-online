/**
 * PRAVA DESKTOP ONLINE — BACKGROUND BIDIRECTIONAL SYNCHRONIZATION ENGINE
 * Orchestrates Local -> Server (Push Outbox) and Server -> Local (Pull Updates)
 * with Mutex Lock, Conflict Resolution, and Crash Recovery.
 */

import api from "../api/api";
import { OutboxQueue } from "./outboxQueue";
import { networkHeartbeat } from "./networkHeartbeat";
import { dbClient } from "../database/dbClient";
import { ConflictResolver } from "./conflictResolver";
import {
  SEED_QUESTIONS,
  SEED_TICKETS,
  SEED_TOPICS,
} from "../services/offlineSeedData";
import type { DbOutboxItem, DbTicket, DbTopic } from "../database/schema";

export type SyncState = "IDLE" | "SYNCING" | "OFFLINE" | "ERROR";

export interface SyncMetrics {
  state: SyncState;
  isRunning: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  localQuestionsCount: number;
  lastError: string | null;
}

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  error?: string;
}

export class SyncEngine {
  private isRunning: boolean = false;
  private state: SyncState = "IDLE";
  private activeSyncPromise: Promise<SyncResult> | null = null;
  private syncIntervalTimer: any = null;
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30s background sweep

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // 1. Initialize local database
      await dbClient.init();

      // 2. Crash recovery: reset any stuck IN_FLIGHT items from previous session
      await this.recoverStuckInFlightItems();

      // 3. Seed initial offline dataset if database is brand new/empty
      await this.ensureSeedDataLoaded();

      // 4. Load last sync metadata
      const storedLastSync = await dbClient.getSyncMeta("last_sync_at");
      if (storedLastSync) {
        this.lastSyncAt = parseInt(storedLastSync, 10) || null;
      }

      // 5. React to network status changes
      networkHeartbeat.subscribe((isOnline) => {
        if (isOnline) {
          // Immediate bidirectional sync upon reconnection
          this.triggerSync().catch(() => {});
        } else {
          this.state = "OFFLINE";
          this.broadcastStatus();
        }
      });

      // 6. React to successful re-authentication or token refresh
      if (typeof window !== "undefined") {
        window.addEventListener("desktop-auth-success", () => {
          this.triggerSync().catch(() => {});
        });
        window.addEventListener("auth-refresh-end", () => {
          this.triggerSync().catch(() => {});
        });
      }

      // 7. Periodic background sweep
      this.syncIntervalTimer = setInterval(() => {
        const { isOnline } = networkHeartbeat.getStatus();
        if (isOnline && !this.isRunning) {
          this.triggerSync().catch(() => {});
        }
      }, this.SYNC_INTERVAL_MS);

      // 8. Initial sync if already online
      if (networkHeartbeat.getStatus().isOnline) {
        this.triggerSync().catch(() => {});
      }
    } catch (err) {
      console.error("[SyncEngine] Initialization error:", err);
    }
  }

  /**
   * Ensure local database has questions, tickets, and topics on first install
   */
  private async ensureSeedDataLoaded(): Promise<void> {
    try {
      const { seeded, questionCount } = await dbClient.seedInitialDataIfEmpty(
        SEED_QUESTIONS,
        SEED_TICKETS,
        SEED_TOPICS
      );
      if (seeded) {
        console.info(`[SyncEngine] Preloaded ${questionCount} offline questions for zero-internet readiness.`);
      }
    } catch (err) {
      console.warn("[SyncEngine] Failed to seed offline data:", err);
    }
  }

  /**
   * Crash Recovery: if the app crashed during an in-flight mutation, restore to PENDING
   */
  private async recoverStuckInFlightItems(): Promise<void> {
    try {
      const pending = await OutboxQueue.getPending();
      for (const item of pending) {
        if (item.status === "IN_FLIGHT") {
          await dbClient.updateOutboxItem(item.id, { status: "PENDING" });
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * Manually or reactively trigger a bidirectional synchronization round.
   * Mutex lock: guarantees only ONE sync cycle executes at any time.
   */
  public async triggerSync(): Promise<SyncResult> {
    // If a sync is already running, join the existing promise
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    const { isOnline } = networkHeartbeat.getStatus();
    if (!isOnline) {
      this.state = "OFFLINE";
      this.broadcastStatus();
      return { success: false, pushedCount: 0, pulledCount: 0, error: "Offline" };
    }

    this.activeSyncPromise = this.executeSyncCycle();
    try {
      return await this.activeSyncPromise;
    } finally {
      this.activeSyncPromise = null;
    }
  }

  /**
   * Internal execution of Push + Pull synchronization
   */
  private async executeSyncCycle(): Promise<SyncResult> {
    this.isRunning = true;
    this.state = "SYNCING";
    this.lastError = null;
    this.broadcastStatus();

    let pushedCount = 0;
    let pulledCount = 0;

    try {
      // ═════════════════════════════════════════════════════════════
      // PHASE 1: PUSH (Local -> Server)
      // ═════════════════════════════════════════════════════════════
      const pendingItems = await OutboxQueue.getPending();
      if (pendingItems.length > 0) {
        console.info(`[SyncEngine] Pushing ${pendingItems.length} pending local outbox mutation(s)...`);

        for (const item of pendingItems) {
          if (!networkHeartbeat.getStatus().isOnline) {
            this.state = "OFFLINE";
            break;
          }

          const success = await this.processPushItem(item);
          if (success) {
            pushedCount++;
          } else {
            // Stop processing further push items if network or auth dropped
            break;
          }
        }
      }

      // ═════════════════════════════════════════════════════════════
      // PHASE 2: PULL (Server -> Local)
      // ═════════════════════════════════════════════════════════════
      if (networkHeartbeat.getStatus().isOnline) {
        pulledCount = await this.pullServerChanges();
      }

      this.lastSyncAt = Date.now();
      await dbClient.setSyncMeta("last_sync_at", this.lastSyncAt.toString());
      this.state = "IDLE";
      this.broadcastStatus();

      // Trigger UI cache invalidation so all components read fresh local DB data
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("prava-storage-changed"));
      }

      return { success: true, pushedCount, pulledCount };
    } catch (err: any) {
      console.error("[SyncEngine] Sync cycle error:", err);
      this.lastError = err?.message || "Sync failed";
      this.state = "ERROR";
      this.broadcastStatus();
      return { success: false, pushedCount, pulledCount, error: this.lastError || undefined };
    } finally {
      this.isRunning = false;
      this.broadcastStatus();
    }
  }

  /**
   * PUSH: Process a single queued outbox mutation item with idempotency
   */
  private async processPushItem(item: DbOutboxItem): Promise<boolean> {
    await OutboxQueue.markInFlight(item.id);

    try {
      let payload: any = null;
      try {
        payload = JSON.parse(item.payload_json);
      } catch {
        payload = {};
      }

      // Network mutation with UUID idempotency key
      const response = await api.request({
        url: item.endpoint,
        method: item.http_method,
        data: payload,
        headers: {
          "X-Idempotency-Key": item.id,
        },
      });

      // Post-sync local state resolution
      await this.handlePostSyncSuccess(item, response.data);

      // Successfully synced
      await OutboxQueue.markSynced(item.id);
      return true;
    } catch (err: any) {
      const status = err.response?.status;
      const errorMessage = err.message || "Network error";

      // 401 Unauthorized — halt until re-login
      if (status === 401) {
        console.warn("[SyncEngine] 401 Unauthorized encountered. Halting outbox sync.");
        await OutboxQueue.markFailed(item.id, "Unauthorized - token expired", item.retry_count);
        return false;
      }

      // 400 or 422 Client validation errors — dead-letter, don't block rest of queue
      if (status && status >= 400 && status < 500) {
        console.error(`[SyncEngine] Client error ${status} for item ${item.id}. Moving to dead-letter.`);
        await OutboxQueue.markFailed(item.id, `Client error ${status}: ${errorMessage}`, 10);
        return true;
      }

      // Transient errors — backoff and retry later
      await OutboxQueue.markFailed(item.id, errorMessage, item.retry_count);
      return false;
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
   * PULL: Fetch server updates and reconcile into local database
   */
  private async pullServerChanges(): Promise<number> {
    let count = 0;

    // 1. Pull Tickets
    try {
      const ticketsRes = await api.get<{ data: { content?: any[]; tickets?: any[] } }>(
        "/api/v2/tickets?page=0&size=100&sortBy=ticketNumber&direction=ASC"
      );
      const ticketList = ticketsRes.data?.data?.content || ticketsRes.data?.data?.tickets || [];
      if (ticketList.length > 0) {
        const dbTickets: DbTicket[] = ticketList.map((tk: any) => ({
          id: tk.id,
          ticket_number: tk.ticketNumber ?? tk.number ?? tk.id,
          question_count: tk.questionCount ?? 20,
          updated_at: Date.now(),
        }));
        await dbClient.saveTickets(dbTickets);
        count += dbTickets.length;
      }
    } catch {
      // Non-blocking: keep local tickets
    }

    // 2. Pull Topics
    try {
      const topicsRes = await api.get<{ data: any[] }>("/api/v1/admin/topics/active");
      const topicList = topicsRes.data?.data || [];
      if (topicList.length > 0) {
        const dbTopics: DbTopic[] = topicList.map((tp: any) => ({
          id: tp.id,
          code: tp.code || `topic_${tp.id}`,
          name_uzl: typeof tp.name === "object" ? tp.name?.uzl : (tp.name || tp.nameUzl || ""),
          name_uzc: typeof tp.name === "object" ? tp.name?.uzc : (tp.nameUzc || ""),
          name_ru: typeof tp.name === "object" ? tp.name?.ru : (tp.nameRu || ""),
          order_num: tp.id,
          question_count: tp.questionCount ?? tp.questionsCount ?? 20,
          updated_at: Date.now(),
        }));
        await dbClient.saveTopics(dbTopics);
        count += dbTopics.length;
      }
    } catch {
      // Non-blocking
    }

    // 3. Pull Saved Questions (Bookmarks) & Resolve Tombstones
    try {
      const savedRes = await api.get<{ data: any[] }>("/api/v1/app/saved-questions");
      const serverBookmarks = (savedRes.data?.data || []).map((b: any) => ({
        questionId: b.questionId ?? b.id,
        savedAt: b.savedAt ? new Date(b.savedAt).getTime() : Date.now(),
      }));

      // In-memory or local reconciliation
      const localActiveIds = await dbClient.getActiveSavedQuestions();
      const localSavedList = localActiveIds.map((id) => ({
        question_id: id,
        saved_at: Date.now(),
        is_deleted: 0,
        synced: 1,
      }));

      const resolved = ConflictResolver.resolveBookmarks(localSavedList, serverBookmarks);
      for (const activeId of resolved.finalLocalActiveIds) {
        await dbClient.setQuestionSaved(activeId, true);
      }
    } catch {
      // Non-blocking
    }

    return count;
  }

  /**
   * Broadcast sync state and progress to entire frontend application
   */
  private broadcastStatus(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sync-status-changed", {
          detail: {
            state: this.state,
            isRunning: this.isRunning,
            lastSyncAt: this.lastSyncAt,
            lastError: this.lastError,
          },
        })
      );
    }
  }

  /**
   * Developer / UI Observability metrics
   */
  public async getSyncMetrics(): Promise<SyncMetrics> {
    const pending = await OutboxQueue.getPending();
    const questionsCount = await dbClient.getQuestionCount();

    return {
      state: this.state,
      isRunning: this.isRunning,
      lastSyncAt: this.lastSyncAt,
      pendingCount: pending.length,
      localQuestionsCount: questionsCount,
      lastError: this.lastError,
    };
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
