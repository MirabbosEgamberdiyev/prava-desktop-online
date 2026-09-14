/**
 * PRAVA DESKTOP ONLINE — BACKGROUND BIDIRECTIONAL SYNCHRONIZATION ENGINE
 * Orchestrates Local -> Server (Push Outbox) and Server -> Local (Pull Updates)
 * with Mutex Lock, Incremental Sync, Crash Recovery, and Zero Hardcoded Data.
 */

import api from "../api/api";
import { OutboxQueue, getCurrentUserId } from "./outboxQueue";
import { networkHeartbeat } from "./networkHeartbeat";
import { networkModeManager } from "./networkModeManager";
import { dbClient } from "../database/dbClient";
import { ConflictResolver } from "./conflictResolver";
import {
  questionRepository,
  ticketRepository,
  topicRepository,
} from "../database/repositories";
import type { DbOutboxItem, DbQuestion, DbTicket, DbTopic } from "../database/schema";

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

/**
 * Normalizes backend question payload into clean SQLite / IndexedDB schema.
 */
export function normalizeServerQuestion(q: any, defaultTicketId?: number | null): DbQuestion {
  const textUzl = typeof q.text === "object" ? q.text?.uzl || "" : q.text_uzl || q.text || "";
  const textUzc = typeof q.text === "object" ? q.text?.uzc || null : q.text_uzc || null;
  const textRu = typeof q.text === "object" ? q.text?.ru || null : q.text_ru || null;

  let optionsJson = q.options_json;
  if (!optionsJson && Array.isArray(q.options)) {
    optionsJson = JSON.stringify(
      q.options.map((opt: any, idx: number) => ({
        index: opt.index ?? idx,
        uzl: typeof opt.text === "object" ? opt.text?.uzl || "" : opt.uzl || opt.text || "",
        uzc: typeof opt.text === "object" ? opt.text?.uzc || "" : opt.uzc || "",
        ru: typeof opt.text === "object" ? opt.text?.ru || "" : opt.ru || "",
        is_correct: idx === (q.correct_option ?? q.correctOptionIndex ?? 0),
      }))
    );
  }

  const expUzl =
    typeof q.explanation === "object" ? q.explanation?.uzl || null : q.explanation_uzl || null;
  const expUzc =
    typeof q.explanation === "object" ? q.explanation?.uzc || null : q.explanation_uzc || null;
  const expRu =
    typeof q.explanation === "object" ? q.explanation?.ru || null : q.explanation_ru || null;

  return {
    id: q.id,
    ticket_id: q.ticket_id ?? q.ticketId ?? defaultTicketId ?? null,
    topic_id: q.topic_id ?? q.topicId ?? null,
    order_num: q.order_num ?? q.order ?? 0,
    text_uzl: textUzl,
    text_uzc: textUzc,
    text_ru: textRu,
    explanation_uzl: expUzl,
    explanation_uzc: expUzc,
    explanation_ru: expRu,
    image_url: q.image_path || q.imageUrl || q.image_url || null,
    options_json: optionsJson || "[]",
    correct_option: q.correct_option ?? q.correctOptionIndex ?? 0,
    updated_at: Date.now(),
    version: q.version ?? 1,
    is_deleted: 0,
  };
}

export class SyncEngine {
  private isRunning: boolean = false;
  private state: SyncState = "IDLE";
  private activeSyncPromise: Promise<SyncResult> | null = null;
  private syncIntervalTimer: any = null;
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30s background sweep when online

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // 1. Initialize local database
      await dbClient.init();

      // 2. Crash recovery: reset any stuck IN_FLIGHT items from previous session
      await this.recoverStuckInFlightItems();

      // 3. Load last sync metadata
      const storedLastSync = await dbClient.getSyncMeta("last_sync_at");
      if (storedLastSync) {
        this.lastSyncAt = parseInt(storedLastSync, 10) || null;
      }

      // 4. Initial sync check: if local database has 0 questions, queue background initial download
      this.checkAndTriggerInitialSync();

      // 5. React to network status changes (auto-sync on reconnection with debounce)
      let reconnectDebounce: any = null;
      networkHeartbeat.subscribe((isOnline) => {
        if (isOnline) {
          clearTimeout(reconnectDebounce);
          reconnectDebounce = setTimeout(() => {
            this.triggerSync().catch(() => {});
          }, 2000);
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
        // Windows Wake from sleep / resume listener
        window.addEventListener("online", () => {
          this.triggerSync().catch(() => {});
        });
      }

      // 7. React to network mode changes (AUTO, ONLINE_SYNC, OFFLINE_ONLY)
      networkModeManager.subscribe((mode) => {
        if (mode === "OFFLINE_ONLY") {
          this.state = "OFFLINE";
          this.broadcastStatus();
        } else if (networkHeartbeat.getStatus().isOnline) {
          this.triggerSync().catch(() => {});
        }
      });

      // 8. Periodic background sweep
      this.syncIntervalTimer = setInterval(() => {
        if (networkModeManager.isOfflineOnly()) return;
        const { isOnline } = networkHeartbeat.getStatus();
        if (isOnline && !this.isRunning) {
          this.triggerSync().catch(() => {});
          this.checkDailySync().catch(() => {});
        }
      }, this.SYNC_INTERVAL_MS);

      // 9. Initial sync and daily sync check
      if (networkHeartbeat.getStatus().isOnline && !networkModeManager.isOfflineOnly()) {
        this.triggerSync().catch(() => {});
        this.checkDailySync().catch(() => {});
      }
    } catch (err) {
      console.error("[SyncEngine] Initialization error:", err);
    }
  }

  /**
   * Daily Automatic Sync: Guarantees at least 1 background synchronization every 24 hours.
   */
  public async checkDailySync(): Promise<void> {
    if (networkModeManager.isOfflineOnly()) return;
    try {
      const lastDailySync = await dbClient.getSyncMeta("last_daily_sync_at");
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (!lastDailySync || now - parseInt(lastDailySync, 10) > ONE_DAY_MS) {
        if (networkHeartbeat.getStatus().isOnline) {
          console.info("[SyncEngine] 24h threshold reached. Executing daily auto-synchronization...");
          await this.triggerSync();
        }
      }
    } catch (err) {
      console.warn("[SyncEngine] Daily sync check error:", err);
    }
  }

  /**
   * If local database is empty on first install, initiate non-blocking background sync
   */
  private async checkAndTriggerInitialSync(): Promise<void> {
    try {
      const count = await questionRepository.getQuestionCount();
      if (count === 0 && networkHeartbeat.getStatus().isOnline && !networkModeManager.isOfflineOnly()) {
        console.info("[SyncEngine] Local database empty. Triggering background initial sync...");
        this.triggerSync().catch(() => {});
      }
    } catch (err) {
      console.warn("[SyncEngine] Initial sync check error:", err);
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
    // If a sync is already running, join the existing promise (single-flight)
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    if (networkModeManager.isOfflineOnly()) {
      this.state = "OFFLINE";
      this.broadcastStatus();
      return { success: false, pushedCount: 0, pulledCount: 0, error: "Offline mode active" };
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
      const currentUserId = getCurrentUserId();
      const pendingItems = await OutboxQueue.getPending(currentUserId);
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

      // Update sync metadata and dispatch notification
      this.lastSyncAt = Date.now();
      await dbClient.setSyncMeta("last_sync_at", this.lastSyncAt.toString());
      await dbClient.setSyncMeta("last_daily_sync_at", this.lastSyncAt.toString());

      this.state = "IDLE";
      this.broadcastStatus();

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
      let payload: any = {};
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
        if (payload.sessionId) {
          const serverId = responseData?.data?.id || responseData?.id || null;
          await dbClient.completeExamSession(String(payload.sessionId), {
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
   * PULL: Fetch authoritative server updates and reconcile into local database
   */
  private async pullServerChanges(): Promise<number> {
    let count = 0;

    // 1. Pull Topics
    try {
      let topicList: any[] = [];
      try {
        const topicsRes = await api.get<{ data: any[] }>("/api/v1/admin/topics/active");
        topicList = topicsRes.data?.data || [];
      } catch {
        try {
          const res2 = await api.get<{ data: any[] }>("/api/v1/admin/topics/with-questions");
          topicList = res2.data?.data || [];
        } catch {
          const res3 = await api.get<{ data: any[] }>("/api/v1/admin/topics/simple");
          topicList = res3.data?.data || [];
        }
      }

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
        await topicRepository.saveTopics(dbTopics);
        count += dbTopics.length;
      }
    } catch {
      // Non-blocking
    }

    // 2. Pull Tickets
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
        await ticketRepository.saveTickets(dbTickets);
        count += dbTickets.length;
      }
    } catch {
      // Non-blocking
    }

    // 3. Pull Questions in background streaming batches
    try {
      // Check if questions are already present or if we need to sync them
      const localQCount = await questionRepository.getQuestionCount();
      if (localQCount < 100) {
        // Attempt downloading marathon question set (which encompasses all topics and tickets)
        try {
          const res = await api.post<{ data: { questions: any[] } }>("/api/v2/exams/marathon/start-visible", {
            questionCount: 1200,
            durationMinutes: 1200,
          });
          const questions = res.data?.data?.questions;
          if (Array.isArray(questions) && questions.length > 0) {
            const dbQuestions = questions.map((q: any) => normalizeServerQuestion(q));
            await dbClient.bulkInsertQuestions(dbQuestions);
            count += dbQuestions.length;
          }
        } catch {
          // If bulk marathon call fails, try fetching first 5-10 tickets in small chunks
          const tickets = await ticketRepository.getAllTickets();
          for (const tk of tickets.slice(0, 10)) {
            try {
              const tkRes = await api.post<{ data: { questions: any[] } }>("/api/v2/tickets/start-visible", {
                ticketId: tk.id,
              });
              const qList = tkRes.data?.data?.questions;
              if (Array.isArray(qList) && qList.length > 0) {
                const dbQ = qList.map((q: any) => normalizeServerQuestion(q, tk.id));
                await dbClient.bulkInsertQuestions(dbQ);
                count += dbQ.length;
              }
            } catch {
              // Non-blocking
            }
          }
        }
      }
    } catch {
      // Non-blocking
    }

    // 4. Pull Saved Questions (Bookmarks) & Resolve Tombstones
    try {
      const savedRes = await api.get<{ data: any[] }>("/api/v1/app/saved-questions");
      const serverBookmarks = (savedRes.data?.data || []).map((b: any) => ({
        questionId: b.questionId ?? b.id,
        savedAt: b.savedAt ? new Date(b.savedAt).getTime() : Date.now(),
      }));

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
    const questionsCount = await questionRepository.getQuestionCount();

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
