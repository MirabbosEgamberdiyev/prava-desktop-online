/**
 * PRAVA DESKTOP ONLINE — DATABASE CLIENT INTERFACE
 * Unified storage driver: Native SQLite via Tauri IPC with IndexedDB fallback.
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

export { SQLITE_INIT_SCRIPTS };

const DB_NAME = "prava_desktop_db";
const DB_VERSION = 2;

let isInitialized = false;

// In-browser IndexedDB fallback helper
function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
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
      if (!db.objectStoreNames.contains("exam_sessions")) {
        db.createObjectStore("exam_sessions", { keyPath: "local_id" });
      }
      if (!db.objectStoreNames.contains("user_progress")) {
        db.createObjectStore("user_progress", { keyPath: "progress_key" });
      }
      if (!db.objectStoreNames.contains("saved_questions")) {
        db.createObjectStore("saved_questions", { keyPath: "question_id" });
      }
      if (!db.objectStoreNames.contains("wrong_answers")) {
        db.createObjectStore("wrong_answers", { keyPath: "question_id" });
      }
      if (!db.objectStoreNames.contains("sync_queue")) {
        const sStore = db.createObjectStore("sync_queue", { keyPath: "id" });
        sStore.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("sync_meta")) {
        db.createObjectStore("sync_meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

  async getRandomQuestions(count: number, topicId?: number): Promise<DbQuestion[]> {
    const all = topicId ? await this.getQuestionsByTopic(topicId) : await this.getAllQuestions();
    if (all.length === 0) return [];
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
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

  // ── EXAM SESSIONS (CRASH RESISTANT) ──
  async saveExamSession(session: DbExamSession): Promise<void> {
    await idbTx("exam_sessions", "readwrite", (store) => store.put(session));
  },

  async getActiveExamSession(examType?: string): Promise<DbExamSession | null> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("exam_sessions", "readonly");
      const store = tx.objectStore("exam_sessions");
      const request = store.getAll();
      request.onsuccess = () => {
        const list: DbExamSession[] = request.result || [];
        const active = list.find(
          (s) =>
            s.status === "IN_PROGRESS" &&
            (!examType || s.exam_type === examType)
        );
        resolve(active || null);
      };
      request.onerror = () => reject(request.error);
    });
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
          const updated = { ...existing, ...resultData, status: "COMPLETED", completed_at: Date.now() };
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

  // ── USER PROGRESS ──
  async saveUserProgress(progress: DbUserProgress): Promise<void> {
    await idbTx("user_progress", "readwrite", (store) => store.put(progress));
  },

  async getUserProgress(key: string): Promise<DbUserProgress | null> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("user_progress", "readonly");
      const store = tx.objectStore("user_progress");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  // ── WRONG ANSWERS ──
  async recordWrongAnswer(questionId: number): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("wrong_answers", "readwrite");
      const store = tx.objectStore("wrong_answers");
      const getReq = store.get(questionId);
      getReq.onsuccess = () => {
        const existing: DbWrongAnswer | undefined = getReq.result;
        const updated: DbWrongAnswer = {
          question_id: questionId,
          wrong_count: (existing?.wrong_count || 0) + 1,
          last_wrong_at: Date.now(),
        };
        store.put(updated);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getWrongAnswerQuestionIds(): Promise<number[]> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("wrong_answers", "readonly");
      const store = tx.objectStore("wrong_answers");
      const request = store.getAll();
      request.onsuccess = () => {
        const items: DbWrongAnswer[] = request.result || [];
        resolve(items.map((i) => i.question_id));
      };
      request.onerror = () => reject(request.error);
    });
  },

  // ── OUTBOX QUEUE (OFFLINE MUTATIONS) ──
  async enqueueOutbox(item: DbOutboxItem): Promise<void> {
    await idbTx("sync_queue", "readwrite", (store) => store.put(item));
  },

  async getPendingOutbox(userId?: string | number): Promise<DbOutboxItem[]> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readonly");
      const store = tx.objectStore("sync_queue");
      const index = store.index("status");
      const request = index.getAll("PENDING");
      request.onsuccess = () => {
        let items: DbOutboxItem[] = request.result || [];
        if (userId !== undefined && userId !== null) {
          items = items.filter(
            (i) => i.user_id === undefined || i.user_id === null || String(i.user_id) === String(userId)
          );
        }
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
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
          store.put({ ...existing, ...updates, updated_at: Date.now() });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async removeOutboxItem(id: string): Promise<void> {
    await idbTx("sync_queue", "readwrite", (store) => store.delete(id));
  },

  // ── SAVED QUESTIONS ──
  async setQuestionSaved(questionId: number, isSaved: boolean): Promise<void> {
    const item: DbSavedQuestion = {
      question_id: questionId,
      saved_at: Date.now(),
      is_deleted: isSaved ? 0 : 1,
      synced: 0,
    };
    await idbTx("saved_questions", "readwrite", (store) => store.put(item));
  },

  async getActiveSavedQuestions(): Promise<number[]> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("saved_questions", "readonly");
      const store = tx.objectStore("saved_questions");
      const request = store.getAll();
      request.onsuccess = () => {
        const items: DbSavedQuestion[] = request.result || [];
        resolve(items.filter((i) => i.is_deleted === 0).map((i) => i.question_id));
      };
      request.onerror = () => reject(request.error);
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
