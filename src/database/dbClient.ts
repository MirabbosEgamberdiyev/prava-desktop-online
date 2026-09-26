/**
 * PRAVA DESKTOP ONLINE — DATABASE CLIENT INTERFACE
 * Unified storage driver: browser IndexedDB (database "prava_desktop_db") inside the Tauri WebView.
 * NOTE: despite SQLITE_INIT_SCRIPTS in schema.ts, no native SQLite / Tauri IPC is used — all reads
 * and writes go through IndexedDB object stores defined in openIndexedDb() below.
 */

import {
  type DbQuestion,
  type DbTopic,
  type DbTicket,
  type DbExamSession,
  type DbUserProgress,
  type DbSavedQuestion,
  type DbWrongAnswer,
  type DbOutboxItem,
  type DbSyncMeta,
  SQLITE_INIT_SCRIPTS,
} from "./schema";
import { GUEST_USER_KEY, getActiveUserId, ownerOf } from "../utils/userScope";

export { SQLITE_INIT_SCRIPTS };

const DB_NAME = "prava_desktop_db";
/**
 * v3: per-user scoping. wrong_answers / saved_questions / user_progress are re-keyed to the
 * compound key [owner, question_id | progress_key]; exam_sessions and sync_queue get an
 * `owner` index (+ [owner, status] for the outbox). Pre-v3 rows without user_id get
 * owner = LEGACY_OWNER and are claimed once by the first user who logs in (prepareForUser).
 */
const DB_VERSION = 3;

// ── USER SCOPING (pure helpers — unit tested) ──────────────────────────────────

/** Owner of pre-v3 rows written without a user_id. Never visible to anyone; claimed once. */
export const LEGACY_OWNER = "";
export const GUEST_OWNER = GUEST_USER_KEY;
/** sync_meta key holding the JSON list of owners seen during the v3 migration (present ⇔ unclaimed legacy rows). */
export const LEGACY_CLAIM_META_KEY = "legacy_owner_claim_v3";

/** Stores whose primary key becomes [owner, <pk>] in v3. */
export const COMPOUND_USER_STORES = [
  { name: "user_progress", pk: "progress_key" },
  { name: "saved_questions", pk: "question_id" },
  { name: "wrong_answers", pk: "question_id" },
] as const;
/** Stores that keep their primary key and get an `owner` index. */
export const OWNER_INDEXED_STORES = ["exam_sessions", "sync_queue"] as const;
/** Every store holding personal data (cleared on logout). Content stores are NOT listed. */
export const USER_DATA_STORES = [...COMPOUND_USER_STORES.map((s) => s.name), ...OWNER_INDEXED_STORES] as const;
/** Shared content (questions bank) — never cleared on logout. */
export const CONTENT_STORES = ["questions", "topics", "tickets"] as const;

/** Owner assigned to a row during the v3 migration. */
export function legacyRowOwner(row: { user_id?: unknown; owner?: unknown } | null | undefined): string {
  if (row && typeof row.owner === "string") return row.owner;
  if (!row || row.user_id === undefined || row.user_id === null || row.user_id === "") return LEGACY_OWNER;
  return ownerOf(row.user_id);
}

/**
 * Android-style one-time claim: legacy rows go to the first user who logs in, unless the
 * pre-v3 data already belonged to a different account — then they are discarded.
 */
export function planLegacyClaim(knownOwners: readonly string[], userOwner: string): "claim" | "discard" {
  const others = knownOwners.filter((o) => o !== userOwner && o !== GUEST_OWNER && o !== LEGACY_OWNER);
  return others.length > 0 ? "discard" : "claim";
}

/** Strict visibility: a row is visible only to its exact owner (legacy/null rows to nobody). */
export function isOwnedBy(row: { owner?: unknown } | null | undefined, owner: string): boolean {
  return !!row && typeof row.owner === "string" && row.owner !== LEGACY_OWNER && row.owner === owner;
}

/** Key range bounds covering every [owner, *] compound key (arrays sort after numbers/strings). */
export function ownerKeyBounds(owner: string): [unknown[], unknown[]] {
  return [[owner], [owner, []]];
}

function ownerRange(owner: string): IDBKeyRange {
  const [lower, upper] = ownerKeyBounds(owner);
  return IDBKeyRange.bound(lower, upper);
}

/** userId given → that user; undefined → the logged-in user (guest when logged out). */
function resolveOwner(userId?: string | number | null): string {
  return ownerOf(userId === undefined ? getActiveUserId() : userId);
}

let isInitialized = false;

// IndexedDB connection helper (the only storage backend).
// ONE connection is opened lazily and reused by every call site (opening a new
// connection per operation was measurably slow with ~1200 questions). The cache is
// dropped when the connection closes / another tab upgrades the schema.
let dbPromise: Promise<IDBDatabase> | null = null;

function upgradeSchema(db: IDBDatabase, tx: IDBTransaction, oldVersion: number): void {
  if (!db.objectStoreNames.contains("questions")) {
    const qStore = db.createObjectStore("questions", { keyPath: "id" });
    qStore.createIndex("ticket_id", "ticket_id", { unique: false });
    qStore.createIndex("topic_id", "topic_id", { unique: false });
  }
  if (!db.objectStoreNames.contains("topics")) {
    db.createObjectStore("topics", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("tickets")) {
    db.createObjectStore("tickets", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("sync_meta")) {
    db.createObjectStore("sync_meta", { keyPath: "key" });
  }

  // ── v3 user scoping (also the fresh-install path) ──
  const knownOwners = new Set<string>();
  let legacyFound = false;
  const note = (owner: string) => {
    if (owner === LEGACY_OWNER) legacyFound = true;
    else knownOwners.add(owner);
  };
  let pending = 1;
  const done = () => {
    pending--;
    if (pending === 0 && legacyFound && oldVersion > 0) {
      tx.objectStore("sync_meta").put({
        key: LEGACY_CLAIM_META_KEY,
        value: JSON.stringify([...knownOwners]),
        updated_at: Date.now(),
      } satisfies DbSyncMeta);
    }
  };

  for (const { name, pk } of COMPOUND_USER_STORES) {
    if (!db.objectStoreNames.contains(name)) {
      db.createObjectStore(name, { keyPath: ["owner", pk] });
      continue;
    }
    const old = tx.objectStore(name);
    if (Array.isArray(old.keyPath)) continue; // already compound
    pending++;
    const req = old.getAll();
    req.onsuccess = () => {
      const rows = (req.result || []) as Record<string, unknown>[];
      db.deleteObjectStore(name);
      const next = db.createObjectStore(name, { keyPath: ["owner", pk] });
      for (const row of rows) {
        const k = row[pk];
        if (typeof k !== "number" && typeof k !== "string") continue; // not a valid key — drop
        const owner = legacyRowOwner(row);
        note(owner);
        next.put({ ...row, owner });
      }
      done();
    };
  }

  for (const name of OWNER_INDEXED_STORES) {
    let store: IDBObjectStore;
    if (!db.objectStoreNames.contains(name)) {
      store = db.createObjectStore(name, { keyPath: name === "exam_sessions" ? "local_id" : "id" });
      if (name === "sync_queue") store.createIndex("status", "status", { unique: false });
    } else {
      store = tx.objectStore(name);
    }
    if (!store.indexNames.contains("owner")) store.createIndex("owner", "owner", { unique: false });
    if (name === "sync_queue" && !store.indexNames.contains("owner_status")) {
      store.createIndex("owner_status", ["owner", "status"], { unique: false });
    }
    pending++;
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return done();
      const row = cursor.value as Record<string, unknown>;
      if (typeof row.owner !== "string") {
        const owner = legacyRowOwner(row);
        note(owner);
        cursor.update({ ...row, owner });
      }
      cursor.continue();
    };
  }
  done();
}

function openIndexedDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) =>
      upgradeSchema(request.result, request.transaction as IDBTransaction, event.oldVersion || 0);
    request.onsuccess = () => {
      const db = request.result;
      const reset = () => {
        if (dbPromise === promise) dbPromise = null;
      };
      db.onclose = reset;
      db.onversionchange = () => {
        reset();
        db.close();
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
  dbPromise = promise;
  promise.catch(() => {
    if (dbPromise === promise) dbPromise = null;
  });
  return promise;
}

/** Pick count distinct random items from keys (partial Fisher-Yates, O(count) swaps). */
export function sampleKeys<K>(keys: readonly K[], count: number, random: () => number = Math.random): K[] {
  const n = Math.min(Math.max(0, Math.floor(count)), keys.length);
  const pool = keys.slice();
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, n);
}

/** Queue deletion of every row owned by `owner` in a user-data store (inside tx). */
function deleteOwnedRows(tx: IDBTransaction, storeName: string, owner: string): void {
  const store = tx.objectStore(storeName);
  if (Array.isArray(store.keyPath)) {
    store.delete(ownerRange(owner));
    return;
  }
  const req = store.index("owner").openKeyCursor(IDBKeyRange.only(owner));
  req.onsuccess = () => {
    const c = req.result;
    if (!c) return;
    store.delete(c.primaryKey);
    c.continue();
  };
}

function idbTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T> | IDBRequest<T>
): Promise<T> {
  return openIndexedDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const opResult = operation(store);

      if ("onsuccess" in opResult) {
        (opResult as IDBRequest<T>).onsuccess = () => resolve(opResult.result);
        (opResult as IDBRequest<T>).onerror = () => reject(opResult.error);
      } else {
        (opResult as Promise<T>).then(resolve).catch(reject);
      }

      tx.onerror = () => reject(tx.error);
    });
  });
}

export const dbClient = {
  async init(): Promise<void> {
    if (isInitialized) return;
    try {
      await openIndexedDb();
      isInitialized = true;
      // Background auto-seed if question database is empty
      import("../services/offlineDatasetManager")
        .then((m) => m.offlineDatasetManager.autoSeedIfEmpty())
        .catch(() => {});
    } catch (err) {
      console.warn("Lokal DB initializatsiya xatosi:", err);
    }
  },

  // ── QUESTIONS ──
  async saveQuestions(questions: DbQuestion[]): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("questions", "readwrite");
      const store = tx.objectStore("questions");
      for (const q of questions) {
        store.put(q);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getQuestionsByTicket(ticketId: number): Promise<DbQuestion[]> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("questions", "readonly");
      const store = tx.objectStore("questions");
      const index = store.index("ticket_id");
      const request = index.getAll(ticketId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async getQuestionsByTopic(topicId: number): Promise<DbQuestion[]> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("questions", "readonly");
      const store = tx.objectStore("questions");
      const index = store.index("topic_id");
      const request = index.getAll(topicId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async getQuestionCount(): Promise<number> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("questions", "readonly");
      const store = tx.objectStore("questions");
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => reject(countReq.error);
    });
  },

  async getAllQuestions(): Promise<DbQuestion[]> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("questions", "readonly");
      const store = tx.objectStore("questions");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /** Fetch questions by primary key, preserving the order of ids (missing ids are skipped). */
  async getQuestionsByIds(ids: readonly number[]): Promise<DbQuestion[]> {
    if (!ids || ids.length === 0) return [];
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("questions", "readonly");
      const store = tx.objectStore("questions");
      const out: (DbQuestion | undefined)[] = new Array(ids.length);
      ids.forEach((id, i) => {
        const req = store.get(id);
        req.onsuccess = () => {
          out[i] = req.result as DbQuestion | undefined;
        };
      });
      tx.oncomplete = () => resolve(out.filter((q): q is DbQuestion => !!q));
      tx.onerror = () => reject(tx.error);
    });
  },

  async getQuestionById(id: number): Promise<DbQuestion | null> {
    const [q] = await this.getQuestionsByIds([id]);
    return q ?? null;
  },

  /**
   * Random sample WITHOUT loading every question: read only the primary keys
   * (whole store or the topic_id index), sample N keys, then fetch just those rows.
   */
  async getRandomQuestions(count: number, topicId?: number): Promise<DbQuestion[]> {
    if (!count || count <= 0) return [];
    const db = await openIndexedDb();
    const keys = await new Promise<number[]>((resolve, reject) => {
      const tx = db.transaction("questions", "readonly");
      const store = tx.objectStore("questions");
      const req = topicId != null ? store.index("topic_id").getAllKeys(topicId) : store.getAllKeys();
      req.onsuccess = () => resolve((req.result || []) as number[]);
      req.onerror = () => reject(req.error);
    });
    if (keys.length === 0) return [];
    return this.getQuestionsByIds(sampleKeys(keys, count));
  },

  // ── TOPICS & TICKETS ──
  async saveTopics(topics: DbTopic[]): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("topics", "readwrite");
      const store = tx.objectStore("topics");
      for (const t of topics) {
        store.put(t);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getTopics(): Promise<DbTopic[]> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("topics", "readonly");
      const store = tx.objectStore("topics");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async saveTickets(tickets: DbTicket[]): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tickets", "readwrite");
      const store = tx.objectStore("tickets");
      for (const t of tickets) {
        store.put(t);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getTickets(): Promise<DbTicket[]> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tickets", "readonly");
      const store = tx.objectStore("tickets");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /** Replace the whole store content atomically (the official server list wins). */
  async replaceTopics(topics: DbTopic[]): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("topics", "readwrite");
      const store = tx.objectStore("topics");
      store.clear();
      for (const t of topics) store.put(t);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async replaceTickets(tickets: DbTicket[]): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tickets", "readwrite");
      const store = tx.objectStore("tickets");
      store.clear();
      for (const t of tickets) store.put(t);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getTicketById(id: number): Promise<DbTicket | null> {
    const r = await idbTx<DbTicket | undefined>("tickets", "readonly", (store) => store.get(id));
    return r ?? null;
  },

  async getTopicById(id: number): Promise<DbTopic | null> {
    const r = await idbTx<DbTopic | undefined>("topics", "readonly", (store) => store.get(id));
    return r ?? null;
  },

  // ── EXAM SESSIONS (CRASH RESISTANT & USER SCOPED) ──
  /** Stamps owner/user_id from the logged-in user unless the session already carries them. */
  async saveExamSession(session: DbExamSession): Promise<void> {
    const userId = session.user_id ?? getActiveUserId();
    const owner = typeof session.owner === "string" && session.owner !== LEGACY_OWNER ? session.owner : ownerOf(userId);
    await idbTx("exam_sessions", "readwrite", (store) => store.put({ ...session, user_id: userId ?? null, owner }));
  },

  async getActiveExamSession(examType?: string, userId?: string | number | null): Promise<DbExamSession | null> {
    const list = await this.getAllExamSessions(userId);
    return list.find((s) => s.status === "IN_PROGRESS" && (!examType || s.exam_type === examType)) || null;
  },

  async completeExamSession(localId: string, resultData: Partial<DbExamSession>): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("exam_sessions", "readwrite");
      const store = tx.objectStore("exam_sessions");
      const getReq = store.get(localId);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          const updated = {
            ...existing,
            ...resultData,
            owner: existing.owner,
            user_id: existing.user_id,
            status: "COMPLETED",
            completed_at: Date.now(),
          };
          store.put(updated);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async abandonExamSession(localId: string): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("exam_sessions", "readwrite");
      const store = tx.objectStore("exam_sessions");
      const getReq = store.get(localId);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          const updated = { ...existing, status: "ABANDONED", completed_at: Date.now() };
          store.put(updated);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Mark a finished session as synced WITHOUT touching status / completed_at. */
  async markExamSessionSynced(localId: string, serverId: number | null): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("exam_sessions", "readwrite");
      const store = tx.objectStore("exam_sessions");
      const getReq = store.get(localId);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) store.put({ ...existing, server_id: serverId ?? existing.server_id ?? null, synced: 1 });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Sessions of ONE user (default: the logged-in user), newest first. */
  async getAllExamSessions(userId?: string | number | null): Promise<DbExamSession[]> {
    const owner = resolveOwner(userId);
    const list = await idbTx<DbExamSession[]>("exam_sessions", "readonly", (store) =>
      store.index("owner").getAll(owner)
    );
    return (list || []).sort((a, b) => (b.completed_at || b.started_at) - (a.completed_at || a.started_at));
  },

  async getExamSessionById(localId: string, userId?: string | number | null): Promise<DbExamSession | null> {
    const row = await idbTx<DbExamSession | undefined>("exam_sessions", "readonly", (store) => store.get(localId));
    return row && isOwnedBy(row, resolveOwner(userId)) ? row : null;
  },

  // ── USER PROGRESS (USER SCOPED) ──
  async saveUserProgress(progress: DbUserProgress): Promise<void> {
    const userId = progress.user_id ?? getActiveUserId();
    await idbTx("user_progress", "readwrite", (store) =>
      store.put({ ...progress, user_id: userId ?? null, owner: ownerOf(userId) })
    );
  },

  async getUserProgress(key: string, userId?: string | number | null): Promise<DbUserProgress | null> {
    const res = await idbTx<DbUserProgress | undefined>("user_progress", "readonly", (store) =>
      store.get([resolveOwner(userId), key])
    );
    return res ?? null;
  },

  // ── WRONG ANSWERS (USER SCOPED) ──
  async recordWrongAnswer(questionId: number, userId?: string | number | null): Promise<void> {
    const uid = userId === undefined ? getActiveUserId() : userId;
    const owner = ownerOf(uid);
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("wrong_answers", "readwrite");
      const store = tx.objectStore("wrong_answers");
      const getReq = store.get([owner, questionId]);
      getReq.onsuccess = () => {
        const existing: DbWrongAnswer | undefined = getReq.result;
        const updated: DbWrongAnswer = {
          question_id: questionId,
          user_id: uid ?? null,
          owner,
          wrong_count: (existing?.wrong_count || 0) + 1,
          last_wrong_at: Date.now(),
        };
        store.put(updated);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getWrongAnswerQuestionIds(userId?: string | number | null): Promise<number[]> {
    const items = await idbTx<DbWrongAnswer[]>("wrong_answers", "readonly", (store) =>
      store.getAll(ownerRange(resolveOwner(userId)))
    );
    return (items || []).map((i) => i.question_id);
  },

  // ── OUTBOX QUEUE (OFFLINE MUTATIONS) ──
  /** Every row records its owner (guest when nobody is logged in). */
  async enqueueOutbox(item: DbOutboxItem): Promise<void> {
    await idbTx("sync_queue", "readwrite", (store) => store.put({ ...item, owner: ownerOf(item.user_id) }));
  },

  /** PENDING rows of ONE user (default: the logged-in user). Never other users' / legacy rows. */
  async getPendingOutbox(userId?: string | number | null): Promise<DbOutboxItem[]> {
    const owner = resolveOwner(userId);
    const items = await idbTx<DbOutboxItem[]>("sync_queue", "readonly", (store) =>
      store.index("owner_status").getAll([owner, "PENDING"])
    );
    return (items || []).sort((a, b) => a.created_at - b.created_at);
  },

  /** Every outbox row regardless of status / owner (crash recovery, dedupe, migrations). */
  async getAllOutbox(): Promise<DbOutboxItem[]> {
    const r = await idbTx<DbOutboxItem[]>("sync_queue", "readonly", (store) => store.getAll());
    return r || [];
  },

  /** Cheap check used by the frequent outbox flush timer (current user's PENDING rows only). */
  async countPendingOutbox(userId?: string | number | null): Promise<number> {
    const owner = resolveOwner(userId);
    return idbTx<number>("sync_queue", "readonly", (store) => store.index("owner_status").count([owner, "PENDING"]));
  },

  async putOutboxItem(item: DbOutboxItem): Promise<void> {
    const owner = typeof item.owner === "string" ? item.owner : ownerOf(item.user_id);
    await idbTx("sync_queue", "readwrite", (store) => store.put({ ...item, owner }));
  },

  async updateOutboxItem(id: string, updates: Partial<DbOutboxItem>): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          // owner / user_id are immutable once enqueued
          store.put({ ...existing, ...updates, owner: existing.owner, user_id: existing.user_id, updated_at: Date.now() });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async removeOutboxItem(id: string): Promise<void> {
    await idbTx("sync_queue", "readwrite", (store) => store.delete(id));
  },

  // ── SAVED QUESTIONS (USER SCOPED) ──
  async setQuestionSaved(questionId: number, isSaved: boolean, userId?: string | number | null): Promise<void> {
    const uid = userId === undefined ? getActiveUserId() : userId;
    const item: DbSavedQuestion = {
      question_id: questionId,
      user_id: uid ?? null,
      owner: ownerOf(uid),
      saved_at: Date.now(),
      is_deleted: isSaved ? 0 : 1,
      synced: 0,
    };
    await idbTx("saved_questions", "readwrite", (store) => store.put(item));
  },

  async getActiveSavedQuestions(userId?: string | number | null): Promise<number[]> {
    const items = await idbTx<DbSavedQuestion[]>("saved_questions", "readonly", (store) =>
      store.getAll(ownerRange(resolveOwner(userId)))
    );
    return (items || []).filter((i) => i.is_deleted === 0).map((i) => i.question_id);
  },

  // ── USER LIFECYCLE ──
  /**
   * Login / app start with a logged-in user:
   *  - drops guest outbox rows (they must never be pushed under an account);
   *  - one-time claim of pre-v3 rows without user_id (Android claimLocalDataForUser pattern):
   *    assigned to this user, or deleted if the old data belonged to another account.
   * Idempotent and cheap (index lookups) after the first run.
   */
  async prepareForUser(userId: string | number): Promise<void> {
    const owner = ownerOf(userId);
    if (owner === GUEST_OWNER) return;
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([...USER_DATA_STORES, "sync_meta"], "readwrite");
      deleteOwnedRows(tx, "sync_queue", GUEST_OWNER);

      const meta = tx.objectStore("sync_meta");
      const metaReq = meta.get(LEGACY_CLAIM_META_KEY);
      metaReq.onsuccess = () => {
        const row = metaReq.result as DbSyncMeta | undefined;
        if (!row) return;
        let known: string[] = [];
        try {
          const parsed = JSON.parse(row.value);
          known = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          known = [];
        }
        const plan = planLegacyClaim(known, owner);

        for (const { name, pk } of COMPOUND_USER_STORES) {
          const store = tx.objectStore(name);
          const cur = store.openCursor(ownerRange(LEGACY_OWNER));
          cur.onsuccess = () => {
            const c = cur.result;
            if (!c) return;
            const legacy = c.value as Record<string, unknown>;
            c.delete();
            if (plan === "claim") {
              const target = [owner, legacy[pk]] as IDBValidKey;
              const exists = store.get(target);
              exists.onsuccess = () => {
                if (!exists.result) store.put({ ...legacy, owner, user_id: userId });
              };
            }
            c.continue();
          };
        }
        for (const name of OWNER_INDEXED_STORES) {
          const cur = tx.objectStore(name).index("owner").openCursor(IDBKeyRange.only(LEGACY_OWNER));
          cur.onsuccess = () => {
            const c = cur.result;
            if (!c) return;
            if (plan === "claim") c.update({ ...c.value, owner, user_id: userId });
            else c.delete();
            c.continue();
          };
        }
        meta.delete(LEGACY_CLAIM_META_KEY);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Logout: removes ONE user's personal rows (wrong answers, saved, progress, exam sessions,
   * outbox). Shared content stores (questions / topics / tickets) and sync_meta are kept.
   */
  async clearUserData(userId: string | number): Promise<void> {
    const owner = ownerOf(userId);
    if (owner === GUEST_OWNER) return;
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([...USER_DATA_STORES], "readwrite");
      for (const name of USER_DATA_STORES) deleteOwnedRows(tx, name, owner);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // ── SYNC METADATA ──
  async getSyncMeta(key: string): Promise<string | null> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_meta", "readonly");
      const store = tx.objectStore("sync_meta");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  },

  async setSyncMeta(key: string, value: string): Promise<void> {
    const item: DbSyncMeta = {
      key,
      value,
      updated_at: Date.now(),
    };
    await idbTx("sync_meta", "readwrite", (store) => store.put(item));
  },

  // ── ATOMIC BULK TRANSACTIONS ──
  async bulkInsertQuestions(questions: DbQuestion[]): Promise<number> {
    if (!questions || questions.length === 0) return 0;
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("questions", "readwrite");
      const store = tx.objectStore("questions");
      let count = 0;
      for (const q of questions) {
        store.put(q);
        count++;
      }
      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  },
};
