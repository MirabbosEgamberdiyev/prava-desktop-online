/**
 * dbClient v3 (per-user IndexedDB) against a real IndexedDB implementation (fake-indexeddb):
 *  - v2 → v3 upgrade: legacy rows without user_id get owner "" and are claimed by the first user;
 *  - legacy rows are discarded when the pre-v3 data already belonged to another account;
 *  - clearUserData removes one user's rows and keeps shared content stores + sync_meta.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { IDBFactory, IDBKeyRange as FakeIDBKeyRange } from "fake-indexeddb";

const g = globalThis as any;
if (typeof g.document === "undefined") g.document = { cookie: "" };
if (typeof g.window === "undefined") g.window = { dispatchEvent: () => true };
g.IDBKeyRange = FakeIDBKeyRange;

const DB_NAME = "prava_desktop_db";
const NOW = 1_700_000_000_000;

type DbModule = typeof import("../src/database/dbClient");

/** Fresh IndexedDB + fresh dbClient module (its connection cache is module-level). */
async function freshClient(): Promise<DbModule> {
  vi.resetModules();
  return import("../src/database/dbClient");
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** Creates the pre-v3 (DB_VERSION 2) schema exactly as the old dbClient did, with rows. */
async function seedV2(rows: {
  wrong?: object[];
  saved?: object[];
  progress?: object[];
  sessions?: object[];
  outbox?: object[];
  questions?: object[];
}): Promise<void> {
  const open = g.indexedDB.open(DB_NAME, 2) as IDBOpenDBRequest;
  open.onupgradeneeded = () => {
    const db = open.result;
    const q = db.createObjectStore("questions", { keyPath: "id" });
    q.createIndex("ticket_id", "ticket_id", { unique: false });
    q.createIndex("topic_id", "topic_id", { unique: false });
    db.createObjectStore("topics", { keyPath: "id" });
    db.createObjectStore("tickets", { keyPath: "id" });
    db.createObjectStore("exam_sessions", { keyPath: "local_id" });
    db.createObjectStore("user_progress", { keyPath: "progress_key" });
    db.createObjectStore("saved_questions", { keyPath: "question_id" });
    db.createObjectStore("wrong_answers", { keyPath: "question_id" });
    const s = db.createObjectStore("sync_queue", { keyPath: "id" });
    s.createIndex("status", "status", { unique: false });
    db.createObjectStore("sync_meta", { keyPath: "key" });
  };
  const db = await req(open);
  const tx = db.transaction(
    ["wrong_answers", "saved_questions", "user_progress", "exam_sessions", "sync_queue", "questions"],
    "readwrite"
  );
  for (const r of rows.wrong ?? []) tx.objectStore("wrong_answers").put(r);
  for (const r of rows.saved ?? []) tx.objectStore("saved_questions").put(r);
  for (const r of rows.progress ?? []) tx.objectStore("user_progress").put(r);
  for (const r of rows.sessions ?? []) tx.objectStore("exam_sessions").put(r);
  for (const r of rows.outbox ?? []) tx.objectStore("sync_queue").put(r);
  for (const r of rows.questions ?? []) tx.objectStore("questions").put(r);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

const session = (local_id: string, extra: object = {}) => ({
  local_id,
  server_id: null,
  exam_type: "EXAM",
  status: "IN_PROGRESS",
  total_questions: 20,
  correct_answers: 0,
  score: 0,
  duration_seconds: 0,
  time_remaining_seconds: 1200,
  started_at: NOW,
  completed_at: null,
  answers_json: "{}",
  synced: 0,
  ...extra,
});

const outbox = (id: string, extra: object = {}) => ({
  id,
  action_type: "SUBMIT_EXAM",
  endpoint: "/api/x",
  http_method: "POST",
  payload_json: "{}",
  status: "PENDING",
  retry_count: 0,
  last_error: null,
  created_at: NOW,
  updated_at: NOW,
  ...extra,
});

const question = (id: number) => ({ id, ticket_id: 1, topic_id: 1, question_text_uzl: `Q${id}`, options_json: "[]", correct_index: 0 });

beforeEach(() => {
  g.indexedDB = new IDBFactory();
  g.document.cookie = "";
});

describe("dbClient v3 upgrade — legacy rows", () => {
  it("assigns owner '' to rows without user_id and lets the first user claim them", async () => {
    await seedV2({
      wrong: [{ question_id: 11, wrong_count: 2, last_wrong_at: NOW }],
      saved: [{ question_id: 12, saved_at: NOW, is_deleted: 0, synced: 0 }],
      progress: [{ progress_key: "ticket_3", progress_type: "TICKET", total_items: 20, completed_items: 20, correct_count: 19, best_score: 95, passed: 1, updated_at: NOW }],
      sessions: [session("s-legacy")],
      outbox: [outbox("o-legacy")],
    });

    const { dbClient, LEGACY_CLAIM_META_KEY } = await freshClient();

    // Upgrade happened: legacy rows are invisible to everybody until claimed.
    expect(await dbClient.getWrongAnswerQuestionIds(42)).toEqual([]);
    expect(await dbClient.getAllExamSessions(42)).toEqual([]);
    const meta = await dbClient.getSyncMeta(LEGACY_CLAIM_META_KEY);
    expect(meta).not.toBeNull();
    expect(JSON.parse(meta!)).toEqual([]); // no other owners were seen

    await dbClient.prepareForUser(42);

    expect(await dbClient.getWrongAnswerQuestionIds(42)).toEqual([11]);
    expect(await dbClient.getActiveSavedQuestions(42)).toEqual([12]);
    const progress = await dbClient.getUserProgress("ticket_3", 42);
    expect(progress?.best_score).toBe(95);
    expect(progress?.owner).toBe("42");
    const sessions = await dbClient.getAllExamSessions(42);
    expect(sessions.map((s) => s.local_id)).toEqual(["s-legacy"]);
    expect(sessions[0].owner).toBe("42");
    expect((await dbClient.getPendingOutbox(42)).map((o) => o.id)).toEqual(["o-legacy"]);
    expect(await dbClient.getSyncMeta(LEGACY_CLAIM_META_KEY)).toBeNull();

    // Claimed exactly once: a later account gets nothing.
    await dbClient.prepareForUser(7);
    expect(await dbClient.getWrongAnswerQuestionIds(7)).toEqual([]);
    expect(await dbClient.getAllExamSessions(7)).toEqual([]);
    expect(await dbClient.getWrongAnswerQuestionIds(42)).toEqual([11]);
  });

  it("discards legacy rows when the pre-v3 data already belonged to a different account", async () => {
    await seedV2({
      wrong: [
        { question_id: 21, wrong_count: 1, last_wrong_at: NOW }, // legacy (no user_id)
        { question_id: 22, user_id: 99, wrong_count: 3, last_wrong_at: NOW }, // other account
      ],
      sessions: [session("s-legacy"), session("s-99", { user_id: 99 })],
      outbox: [outbox("o-legacy")],
    });

    const { dbClient, LEGACY_CLAIM_META_KEY } = await freshClient();
    expect(JSON.parse((await dbClient.getSyncMeta(LEGACY_CLAIM_META_KEY))!)).toEqual(["99"]);

    await dbClient.prepareForUser(42);

    // 42 does not inherit anything; legacy rows are gone; 99 keeps its own rows.
    expect(await dbClient.getWrongAnswerQuestionIds(42)).toEqual([]);
    expect(await dbClient.getAllExamSessions(42)).toEqual([]);
    expect(await dbClient.getPendingOutbox(42)).toEqual([]);
    expect(await dbClient.getWrongAnswerQuestionIds(99)).toEqual([22]);
    expect((await dbClient.getAllExamSessions(99)).map((s) => s.local_id)).toEqual(["s-99"]);
    const all = await dbClient.getAllOutbox();
    expect(all.find((o) => o.id === "o-legacy")).toBeUndefined();
    expect(await dbClient.getSyncMeta(LEGACY_CLAIM_META_KEY)).toBeNull();
  });

  it("fresh install creates the v3 schema without a legacy claim marker", async () => {
    const { dbClient, LEGACY_CLAIM_META_KEY } = await freshClient();
    await dbClient.recordWrongAnswer(5, 42);
    expect(await dbClient.getWrongAnswerQuestionIds(42)).toEqual([5]);
    expect(await dbClient.getSyncMeta(LEGACY_CLAIM_META_KEY)).toBeNull();
  });
});

describe("dbClient.clearUserData", () => {
  it("removes only that user's personal rows and keeps content stores + sync_meta", async () => {
    await seedV2({ questions: [question(1), question(2), question(3)] });
    const { dbClient } = await freshClient();

    await dbClient.saveTopics([{ id: 1, code: "t1", name_uzl: "Mavzu", name_uzc: null, name_ru: null, order_num: 1, question_count: 3, updated_at: NOW }]);
    await dbClient.saveTickets([{ id: 501, ticket_number: 1, question_count: 20, updated_at: NOW }]);
    await dbClient.setSyncMeta("dataset_version", "v2");

    for (const uid of [42, 7]) {
      await dbClient.recordWrongAnswer(1, uid);
      await dbClient.setQuestionSaved(2, true, uid);
      await dbClient.saveUserProgress({ progress_key: "ticket_501", user_id: uid, progress_type: "TICKET", total_items: 20, completed_items: 20, correct_count: 20, best_score: 100, passed: 1, updated_at: NOW });
      await dbClient.saveExamSession(session(`s-${uid}`, { user_id: uid }) as any);
      await dbClient.enqueueOutbox(outbox(`o-${uid}`, { user_id: uid }) as any);
    }

    await dbClient.clearUserData(42);

    expect(await dbClient.getWrongAnswerQuestionIds(42)).toEqual([]);
    expect(await dbClient.getActiveSavedQuestions(42)).toEqual([]);
    expect(await dbClient.getUserProgress("ticket_501", 42)).toBeNull();
    expect(await dbClient.getAllExamSessions(42)).toEqual([]);
    expect(await dbClient.getPendingOutbox(42)).toEqual([]);

    // Other user untouched
    expect(await dbClient.getWrongAnswerQuestionIds(7)).toEqual([1]);
    expect(await dbClient.getActiveSavedQuestions(7)).toEqual([2]);
    expect((await dbClient.getUserProgress("ticket_501", 7))?.best_score).toBe(100);
    expect((await dbClient.getAllExamSessions(7)).map((s) => s.local_id)).toEqual(["s-7"]);
    expect((await dbClient.getPendingOutbox(7)).map((o) => o.id)).toEqual(["o-7"]);

    // Shared content + metadata kept
    expect(await dbClient.getQuestionCount()).toBe(3);
    expect((await dbClient.getTopics()).length).toBe(1);
    expect((await dbClient.getTickets()).map((t) => t.id)).toEqual([501]);
    expect(await dbClient.getSyncMeta("dataset_version")).toBe("v2");
  });

  it("is a no-op for the guest scope", async () => {
    const { dbClient } = await freshClient();
    await dbClient.recordWrongAnswer(9, null);
    await dbClient.clearUserData("guest");
    expect(await dbClient.getWrongAnswerQuestionIds(null)).toEqual([9]);
  });
});
