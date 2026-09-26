/**
 * PRAVA DESKTOP ONLINE — BACKGROUND BIDIRECTIONAL SYNCHRONIZATION ENGINE
 * Orchestrates Local -> Server (Push Outbox) and Server -> Local (Pull Updates)
 * with a single-flight mutex, conditional (ETag) bundle download and crash recovery.
 *
 * Scheduling (Phase 5 perf):
 *  - nothing runs at import time — `start()` is called once the app is ready;
 *  - full sync (push + pull): on start, on `online` / reconnect, on window focus when the
 *    last sync is older than 5 min, and every 15 min;
 *  - outbox flush (push only): every 45 s but ONLY when the outbox is non-empty, plus
 *    right after something is enqueued;
 *  - `prava-storage-changed` is dispatched only when something actually changed.
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
import type { DbExamSession, DbOutboxItem, DbQuestion, DbTicket, DbTopic } from "../database/schema";
import { convertLegacySubmitItem, isFakeLocalSessionId } from "../services/offlineExamRecord";

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

const OFFLINE_BUNDLE_URL = "/api/v1/app/offline-bundle";
const OFFLINE_BUNDLE_VERSION_KEY = "offline_bundle_version";
const OFFLINE_BUNDLE_ETAG_KEY = "offline_bundle_etag";
/** Bumped when the locally stored bundle shape changes → forces one unconditional download. */
const OFFLINE_BUNDLE_SCHEMA_KEY = "offline_bundle_schema";
const OFFLINE_BUNDLE_SCHEMA = "2";
const LEGACY_SUBMIT_MIGRATION_KEY = "legacy_exam_submit_migrated_v1";

export const FULL_SYNC_INTERVAL_MS = 15 * 60 * 1000;
export const OUTBOX_FLUSH_INTERVAL_MS = 45 * 1000;
export const FOCUS_SYNC_STALE_MS = 5 * 60 * 1000;

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

function idList(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

export interface MappedOfflineBundle {
  version: string | null;
  questions: DbQuestion[];
  /** null → the bundle has no topics array (pre-v2 backend). */
  topics: DbTopic[] | null;
  /** null → the bundle has no tickets array (pre-v2 backend). */
  tickets: DbTicket[] | null;
}

/**
 * Pure mapper for GET /api/v1/app/offline-bundle `data`:
 *   { version, questions[], topics[{id, code, nameUzl.., displayOrder, questionIds}],
 *     tickets[{id, ticketNumber, topicId, packageId, nameUzl.., durationMinutes, questionIds}] }
 * Server ids are kept as-is so the desktop shows exactly the web's official topics/tickets.
 * Each question gets ticket_id / topic_id / order_num from the official mappings.
 */
export function mapOfflineBundle(data: any, now: number = Date.now()): MappedOfflineBundle {
  const version = data?.version != null ? String(data.version) : null;

  const topics: DbTopic[] | null = Array.isArray(data?.topics)
    ? data.topics
        .filter((tp: any) => tp && Number.isFinite(Number(tp.id)))
        .map((tp: any) => {
          const ids = idList(tp.questionIds);
          return {
            id: Number(tp.id),
            code: str(tp.code) ?? `topic_${tp.id}`,
            name_uzl: str(tp.nameUzl) ?? str(tp.nameUzc) ?? str(tp.nameRu) ?? "",
            name_uzc: str(tp.nameUzc),
            name_ru: str(tp.nameRu),
            name_en: str(tp.nameEn),
            order_num: Number.isFinite(Number(tp.displayOrder)) ? Number(tp.displayOrder) : Number(tp.id),
            question_count: ids.length,
            question_ids: ids,
            updated_at: now,
          } satisfies DbTopic;
        })
    : null;

  const tickets: DbTicket[] | null = Array.isArray(data?.tickets)
    ? data.tickets
        .filter((tk: any) => tk && Number.isFinite(Number(tk.id)))
        .map((tk: any) => {
          const ids = idList(tk.questionIds);
          const num = Number.isFinite(Number(tk.ticketNumber)) ? Number(tk.ticketNumber) : Number(tk.id);
          return {
            id: Number(tk.id),
            ticket_number: num,
            topic_id: tk.topicId != null ? Number(tk.topicId) : null,
            package_id: tk.packageId != null ? Number(tk.packageId) : null,
            name_uzl: str(tk.nameUzl) ?? `${num}-bilet`,
            name_uzc: str(tk.nameUzc) ?? `${num}-билет`,
            name_ru: str(tk.nameRu) ?? `Билет #${num}`,
            name_en: str(tk.nameEn) ?? `Ticket #${num}`,
            duration_minutes: Number.isFinite(Number(tk.durationMinutes)) ? Number(tk.durationMinutes) : undefined,
            question_count: ids.length,
            question_ids: ids,
            updated_at: now,
          } satisfies DbTicket;
        })
    : null;

  // question id → first (ticket, position) and topic that contains it
  const ticketOf = new Map<number, { ticketId: number; order: number }>();
  for (const tk of tickets ?? []) {
    (tk.question_ids ?? []).forEach((qid, i) => {
      if (!ticketOf.has(qid)) ticketOf.set(qid, { ticketId: tk.id, order: i + 1 });
    });
  }
  const topicOf = new Map<number, number>();
  for (const tp of topics ?? []) {
    for (const qid of tp.question_ids ?? []) if (!topicOf.has(qid)) topicOf.set(qid, tp.id);
  }

  const questions: DbQuestion[] = Array.isArray(data?.questions)
    ? data.questions
        .filter((q: any) => q && Number.isFinite(Number(q.id)))
        .map((raw: any) => {
          const q = normalizeServerQuestion(raw);
          const tk = ticketOf.get(q.id);
          if (tk) {
            q.ticket_id = tk.ticketId;
            if (!q.order_num) q.order_num = tk.order;
          }
          const tp = topicOf.get(q.id);
          if (tp != null && q.topic_id == null) q.topic_id = tp;
          q.updated_at = now;
          return q;
        })
    : [];

  return { version, questions, topics, tickets };
}

export class SyncEngine {
  private isRunning: boolean = false;
  private state: SyncState = "IDLE";
  private activeSyncPromise: Promise<SyncResult> | null = null;
  private activeFlushPromise: Promise<number> | null = null;
  private fullSyncTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private startPromise: Promise<void> | null = null;
  private cleanups: Array<() => void> = [];

  /**
   * Start background sync (idempotent). Call once after the app is ready — importing
   * this module no longer triggers any network or IndexedDB work.
   */
  public start(): Promise<void> {
    if (!this.startPromise) this.startPromise = this.init();
    return this.startPromise;
  }

  private async init(): Promise<void> {
    try {
      await dbClient.init();
      await this.recoverStuckInFlightItems();
      await this.migrateLegacyExamSubmits();

      const storedLastSync = await dbClient.getSyncMeta("last_sync_at");
      if (storedLastSync) this.lastSyncAt = parseInt(storedLastSync, 10) || null;

      let reconnectDebounce: ReturnType<typeof setTimeout> | undefined;
      const syncSoon = (delay = 2000) => {
        clearTimeout(reconnectDebounce);
        reconnectDebounce = setTimeout(() => {
          this.triggerSync().catch(() => {});
        }, delay);
      };

      // Reconnection (heartbeat) → one debounced full sync
      const unsubHeartbeat = networkHeartbeat.subscribe((isOnline) => {
        if (isOnline) {
          syncSoon();
        } else {
          this.state = "OFFLINE";
          this.broadcastStatus();
        }
      });
      if (typeof unsubHeartbeat === "function") this.cleanups.push(unsubHeartbeat);

      const unsubMode = networkModeManager.subscribe((mode) => {
        if (mode === "OFFLINE" || networkModeManager.isOfflineOnly()) {
          this.state = "OFFLINE";
          this.broadcastStatus();
        } else if (networkHeartbeat.getStatus().isOnline) {
          syncSoon(500);
        }
      });
      if (typeof unsubMode === "function") this.cleanups.push(unsubMode);

      if (typeof window !== "undefined") {
        const on = (name: string, fn: () => void) => {
          window.addEventListener(name, fn);
          this.cleanups.push(() => window.removeEventListener(name, fn));
        };
        on("online", () => {
          if (!networkModeManager.isOfflineOnly()) syncSoon();
        });
        on("focus", () => {
          if (!this.lastSyncAt || Date.now() - this.lastSyncAt > FOCUS_SYNC_STALE_MS) syncSoon(500);
        });
        on("desktop-auth-success", () => {
          this.triggerSync().catch(() => {});
        });
        // Token refreshed → only push what is pending (no full pull).
        on("auth-refresh-end", () => {
          this.flushOutbox().catch(() => {});
        });
        let flushDebounce: ReturnType<typeof setTimeout> | undefined;
        on("prava-outbox-enqueued", () => {
          clearTimeout(flushDebounce);
          flushDebounce = setTimeout(() => this.flushOutbox().catch(() => {}), 1000);
        });
      }

      this.fullSyncTimer = setInterval(() => {
        this.triggerSync().catch(() => {});
      }, FULL_SYNC_INTERVAL_MS);

      this.flushTimer = setInterval(() => {
        this.flushOutbox().catch(() => {});
      }, OUTBOX_FLUSH_INTERVAL_MS);

      // Initial sync after app ready
      this.triggerSync().catch(() => {});
    } catch (err) {
      console.error("[SyncEngine] Initialization error:", err);
    }
  }

  /** Kept for callers: a full sync if the last one is older than 24 h. */
  public async checkDailySync(): Promise<void> {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (!this.lastSyncAt || Date.now() - this.lastSyncAt > ONE_DAY_MS) {
      await this.triggerSync();
    }
  }

  /**
   * Crash Recovery: if the app crashed during an in-flight mutation, restore to PENDING
   */
  private async recoverStuckInFlightItems(): Promise<void> {
    try {
      const all = await dbClient.getAllOutbox();
      for (const item of all) {
        if (item.status === "IN_FLIGHT") {
          await dbClient.updateOutboxItem(item.id, { status: "PENDING" });
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * One-time repair: exam results used to be queued to /api/v2/exams/submit with a fake
   * Date.now() session id (backend 404 → dead-letter). Convert those rows — dead-lettered
   * or still pending — into record-offline rows and re-queue them once.
   */
  public async migrateLegacyExamSubmits(): Promise<number> {
    try {
      if ((await dbClient.getSyncMeta(LEGACY_SUBMIT_MIGRATION_KEY)) === "1") return 0;
      const all = await dbClient.getAllOutbox();
      const legacy = all.filter(
        (i) => i.action_type === "SUBMIT_EXAM" && (i.status === "FAILED" || i.status === "PENDING")
      );
      let converted = 0;
      if (legacy.length > 0) {
        const sessions = await dbClient.getAllExamSessions().catch(() => [] as DbExamSession[]);
        const byServerId = new Map<number, DbExamSession>();
        for (const s of sessions) {
          if (s.server_id != null && isFakeLocalSessionId(s.server_id)) byServerId.set(Number(s.server_id), s);
        }
        for (const item of legacy) {
          let sessionId: number | null = null;
          try {
            sessionId = Number(JSON.parse(item.payload_json || "{}")?.sessionId) || null;
          } catch {
            sessionId = null;
          }
          const next = convertLegacySubmitItem(item, sessionId != null ? byServerId.get(sessionId) ?? null : null);
          if (next) {
            await dbClient.putOutboxItem(next);
            converted++;
          }
        }
      }
      await dbClient.setSyncMeta(LEGACY_SUBMIT_MIGRATION_KEY, "1");
      if (converted > 0) console.info(`[SyncEngine] Re-queued ${converted} legacy exam result(s) via record-offline`);
      return converted;
    } catch (err) {
      console.warn("[SyncEngine] Legacy exam submit migration error:", err);
      return 0;
    }
  }

  private canReachServer(): boolean {
    if (networkModeManager.isOfflineOnly()) {
      this.state = "OFFLINE";
      this.broadcastStatus();
      return false;
    }
    if (!networkHeartbeat.getStatus().isOnline) {
      this.state = "OFFLINE";
      this.broadcastStatus();
      return false;
    }
    return true;
  }

  /**
   * Manually or reactively trigger a bidirectional synchronization round.
   * Mutex lock: guarantees only ONE sync cycle executes at any time.
   */
  public async triggerSync(): Promise<SyncResult> {
    if (this.activeSyncPromise) return this.activeSyncPromise;
    if (!this.canReachServer()) {
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        error: networkModeManager.isOfflineOnly() ? "Offline mode active" : "Offline",
      };
    }
    if (this.activeFlushPromise) await this.activeFlushPromise.catch(() => 0);

    this.activeSyncPromise = this.executeSyncCycle();
    try {
      return await this.activeSyncPromise;
    } finally {
      this.activeSyncPromise = null;
    }
  }

  /**
   * Push-only round: sends pending outbox rows. Cheap no-op when the outbox is empty.
   * Returns the number of rows pushed.
   */
  public async flushOutbox(): Promise<number> {
    if (this.activeSyncPromise) {
      const r = await this.activeSyncPromise.catch(() => null);
      return r?.pushedCount ?? 0;
    }
    if (this.activeFlushPromise) return this.activeFlushPromise;
    if (networkModeManager.isOfflineOnly() || !networkHeartbeat.getStatus().isOnline) return 0;

    this.activeFlushPromise = (async () => {
      const pendingCount = await dbClient.countPendingOutbox().catch(() => 0);
      if (pendingCount === 0) return 0;
      const pushed = await this.pushOutbox();
      if (pushed > 0) this.notifyStorageChanged();
      return pushed;
    })();
    try {
      return await this.activeFlushPromise;
    } finally {
      this.activeFlushPromise = null;
    }
  }

  private async pushOutbox(): Promise<number> {
    let pushedCount = 0;
    const userId = getCurrentUserId();
    // Guests have no session: their rows are never pushed (and are dropped on login).
    if (userId === null) return 0;
    // Strictly the logged-in user's rows — never another account's or legacy rows.
    const pendingItems = await OutboxQueue.getPending(userId);
    for (const item of pendingItems) {
      if (!networkHeartbeat.getStatus().isOnline) {
        this.state = "OFFLINE";
        break;
      }
      const success = await this.processPushItem(item);
      if (success) pushedCount++;
      else break; // network or auth dropped — stop this round
    }
    return pushedCount;
  }

  private notifyStorageChanged(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("prava-storage-changed"));
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
      // PHASE 1: PUSH (Local -> Server)
      pushedCount = await this.pushOutbox();

      // PHASE 2: PULL (Server -> Local)
      if (networkHeartbeat.getStatus().isOnline) {
        pulledCount = await this.pullServerChanges();
      }

      this.lastSyncAt = Date.now();
      await dbClient.setSyncMeta("last_sync_at", this.lastSyncAt.toString());
      await dbClient.setSyncMeta("last_daily_sync_at", this.lastSyncAt.toString());

      this.state = "IDLE";
      this.broadcastStatus();

      // Re-render listeners only when local data really changed.
      if (pushedCount > 0 || pulledCount > 0) this.notifyStorageChanged();

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

      const response = await api.request({
        url: item.endpoint,
        method: item.http_method,
        data: payload,
        headers: {
          "X-Idempotency-Key": item.id,
        },
      });

      await this.handlePostSyncSuccess(item, response.data);
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

      // 4xx client validation errors — dead-letter, don't block rest of queue
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
    const payload = (() => {
      try {
        return JSON.parse(item.payload_json || "{}");
      } catch {
        return {};
      }
    })();

    switch (item.action_type) {
      case "RECORD_OFFLINE_EXAM": {
        // clientSessionId is the local exam_sessions.local_id
        if (payload.clientSessionId) {
          const serverId = Number(responseData?.data?.sessionId ?? responseData?.data?.id) || null;
          await dbClient.markExamSessionSynced(String(payload.clientSessionId), serverId);
        }
        break;
      }

      case "SUBMIT_EXAM": {
        // Real server session: mark any local session that references it as synced.
        if (payload.sessionId) {
          const sessions = await dbClient.getAllExamSessions().catch(() => [] as DbExamSession[]);
          const local = sessions.find((s) => Number(s.server_id) === Number(payload.sessionId));
          if (local) await dbClient.markExamSessionSynced(local.local_id, Number(payload.sessionId));
        }
        break;
      }

      case "SAVE_QUESTION": {
        if (payload.questionId) await dbClient.setQuestionSaved(payload.questionId, true, item.user_id ?? undefined);
        break;
      }

      case "UNSAVE_QUESTION": {
        if (payload.questionId) await dbClient.setQuestionSaved(payload.questionId, false, item.user_id ?? undefined);
        break;
      }

      default:
        break;
    }
  }

  /**
   * PULL: Fetch authoritative server updates and reconcile into local database.
   * Returns the number of locally CHANGED records (0 when nothing changed).
   */
  private async pullServerChanges(): Promise<number> {
    let count = 0;

    // 1. Offline bundle (questions + official topics + tickets). 304 → nothing changed.
    let bundle: Awaited<ReturnType<SyncEngine["pullOfflineBundle"]>> | null = null;
    try {
      bundle = await this.pullOfflineBundle();
    } catch {
      bundle = null; // network/5xx — try again next cycle
    }

    if (bundle && bundle !== "UNSUPPORTED") {
      count += bundle.changed;
      // Pre-v2 backend: bundle without topics/tickets → legacy list pulls
      if (bundle.changed > 0 && !bundle.hasTopics) count += await this.pullTopicsLegacy();
      if (bundle.changed > 0 && !bundle.hasTickets) count += await this.pullTicketsLegacy();
    } else if (bundle === "UNSUPPORTED") {
      // Old backend without the bundle endpoint (404) → legacy pulls only
      count += await this.pullTopicsLegacy();
      count += await this.pullTicketsLegacy();
      count += await this.pullQuestionsLegacy();
    }

    // 2. Saved questions (bookmarks) & tombstones
    try {
      const savedRes = await api.get<{ data: any[] }>("/api/v1/app/saved-questions");
      const serverBookmarks = (savedRes.data?.data || []).map((b: any) => ({
        questionId: b.questionId ?? b.id,
        savedAt: b.savedAt ? new Date(b.savedAt).getTime() : Date.now(),
      }));

      const localActiveIds = await dbClient.getActiveSavedQuestions();
      const localSet = new Set(localActiveIds);
      const localSavedList = localActiveIds.map((id) => ({
        question_id: id,
        saved_at: Date.now(),
        is_deleted: 0,
        synced: 1,
      }));

      const resolved = ConflictResolver.resolveBookmarks(localSavedList, serverBookmarks);
      for (const activeId of resolved.finalLocalActiveIds) {
        if (!localSet.has(activeId)) {
          await dbClient.setQuestionSaved(activeId, true);
          count++;
        }
      }
    } catch {
      // Non-blocking
    }

    return count;
  }

  private async pullTopicsLegacy(): Promise<number> {
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
      if (topicList.length === 0) return 0;
      const dbTopics: DbTopic[] = topicList.map((tp: any) => ({
        id: tp.id,
        code: tp.code || `topic_${tp.id}`,
        name_uzl: typeof tp.name === "object" ? tp.name?.uzl : (tp.name || tp.nameUzl || ""),
        name_uzc: typeof tp.name === "object" ? tp.name?.uzc : (tp.nameUzc || ""),
        name_ru: typeof tp.name === "object" ? tp.name?.ru : (tp.nameRu || ""),
        order_num: tp.displayOrder ?? tp.id,
        question_count: tp.questionCount ?? tp.questionsCount ?? 20,
        updated_at: Date.now(),
      }));
      await topicRepository.saveTopics(dbTopics);
      return dbTopics.length;
    } catch {
      return 0;
    }
  }

  private async pullTicketsLegacy(): Promise<number> {
    try {
      const ticketsRes = await api.get<{ data: { content?: any[]; tickets?: any[] } }>(
        "/api/v2/tickets?page=0&size=100&sortBy=ticketNumber&direction=ASC"
      );
      const ticketList = ticketsRes.data?.data?.content || ticketsRes.data?.data?.tickets || [];
      if (ticketList.length === 0) return 0;
      const dbTickets: DbTicket[] = ticketList.map((tk: any) => ({
        id: tk.id,
        ticket_number: tk.ticketNumber ?? tk.number ?? tk.id,
        question_count: tk.questionCount ?? 20,
        updated_at: Date.now(),
      }));
      await ticketRepository.saveTickets(dbTickets);
      return dbTickets.length;
    } catch {
      return 0;
    }
  }

  /** 404 bundle fallback: ticket chunks, only while the local DB is (almost) empty. */
  private async pullQuestionsLegacy(): Promise<number> {
    let count = 0;
    try {
      const localQCount = await questionRepository.getQuestionCount();
      if (localQCount >= 100) return 0;
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
    } catch {
      // ignore
    }
    return count;
  }

  /**
   * Download the offline bundle with a conditional request.
   * Returns the number of changed rows (0 when unchanged / 304) and whether the bundle
   * carried topics/tickets, or "UNSUPPORTED" when the backend has no endpoint (404).
   */
  private async pullOfflineBundle(): Promise<
    { changed: number; hasTopics: boolean; hasTickets: boolean } | "UNSUPPORTED"
  > {
    const storedVersion = await dbClient.getSyncMeta(OFFLINE_BUNDLE_VERSION_KEY);
    const storedEtag = await dbClient.getSyncMeta(OFFLINE_BUNDLE_ETAG_KEY);
    const storedSchema = await dbClient.getSyncMeta(OFFLINE_BUNDLE_SCHEMA_KEY);
    // Until the v2 shape (topics/tickets) was stored once, download unconditionally.
    const conditional = storedSchema === OFFLINE_BUNDLE_SCHEMA;
    const ifNoneMatch = conditional ? storedEtag || (storedVersion ? `"${storedVersion}"` : null) : null;

    const res = await api.get<{ data?: any }>(OFFLINE_BUNDLE_URL, {
      headers: ifNoneMatch ? { "If-None-Match": ifNoneMatch } : undefined,
      // 304 / 404 are expected outcomes here, not errors
      validateStatus: (st) => (st >= 200 && st < 300) || st === 304 || st === 404,
    });

    if (res.status === 404) return "UNSUPPORTED";
    if (res.status === 304) return { changed: 0, hasTopics: true, hasTickets: true };

    const mapped = mapOfflineBundle(res.data?.data);
    const hasTopics = mapped.topics !== null;
    const hasTickets = mapped.tickets !== null;
    if (conditional && mapped.version && storedVersion && mapped.version === storedVersion) {
      return { changed: 0, hasTopics: true, hasTickets: true };
    }
    if (mapped.questions.length === 0 && !mapped.topics?.length && !mapped.tickets?.length) {
      return { changed: 0, hasTopics, hasTickets };
    }

    let changed = 0;
    if (mapped.questions.length > 0) changed += await dbClient.bulkInsertQuestions(mapped.questions);
    if (mapped.topics && mapped.topics.length > 0) {
      await topicRepository.replaceTopics(mapped.topics);
      changed += mapped.topics.length;
    }
    if (mapped.tickets && mapped.tickets.length > 0) {
      await ticketRepository.replaceTickets(mapped.tickets);
      changed += mapped.tickets.length;
    }

    // Persist version/ETag only after everything was stored successfully.
    if (mapped.version) await dbClient.setSyncMeta(OFFLINE_BUNDLE_VERSION_KEY, mapped.version);
    const etag = (res.headers?.["etag"] as string | undefined) ?? null;
    if (etag) await dbClient.setSyncMeta(OFFLINE_BUNDLE_ETAG_KEY, etag);
    if (hasTopics && hasTickets) await dbClient.setSyncMeta(OFFLINE_BUNDLE_SCHEMA_KEY, OFFLINE_BUNDLE_SCHEMA);

    return { changed, hasTopics, hasTickets };
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
    if (this.fullSyncTimer) clearInterval(this.fullSyncTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.fullSyncTimer = null;
    this.flushTimer = null;
    for (const fn of this.cleanups.splice(0)) {
      try {
        fn();
      } catch {
        // ignore
      }
    }
    this.startPromise = null;
  }
}

export const syncEngine = new SyncEngine();
