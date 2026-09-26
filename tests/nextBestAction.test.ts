import { describe, it, expect } from "vitest";
import { nextUnpassedTicket, selectNextBestAction, type NbaInput } from "../src/features/Dashboard/nextBestAction";
import { describeSession, pickResumableSession, RESUME_MAX_AGE_MS } from "../src/features/Dashboard/resumeSession";
import type { DbExamSession } from "../src/database/schema";

const tickets = [
  { id: 503, ticket_number: 3 },
  { id: 501, ticket_number: 1 },
  { id: 502, ticket_number: 2 },
];

const base: NbaInput = {
  activeSession: null,
  totalWrongs: 0,
  weakTopics: [],
  tickets,
  passedTicketIds: new Set<number>(),
  practicedCount: 0,
  readinessPercent: 0,
};

describe("selectNextBestAction priority", () => {
  it("P1: an unfinished session wins over everything", () => {
    const d = selectNextBestAction({
      ...base,
      activeSession: { route: "/marafon", answered: 4, total: 20 },
      totalWrongs: 10,
      weakTopics: [{ id: 1, name: "A", wrongCount: 5 }],
    });
    expect(d).toEqual({ kind: "resume", route: "/marafon", current: 5, total: 20 });
  });

  it("P1 skipped when the session is fully answered", () => {
    const d = selectNextBestAction({ ...base, activeSession: { route: "/exam?count=20", answered: 20, total: 20 }, totalWrongs: 2 });
    expect(d.kind).toBe("mistakes");
  });

  it("P2: mistakes → wrong-answers exam", () => {
    expect(selectNextBestAction({ ...base, totalWrongs: 3 })).toEqual({ kind: "mistakes", route: "/wrong-exam", count: 3 });
  });

  it("P3: weak topic only with ≥ 2 mistakes", () => {
    const weak = { ...base, practicedCount: 10, weakTopics: [{ id: 7, name: "Chorrahalar", wrongCount: 2 }] };
    expect(selectNextBestAction(weak)).toMatchObject({ kind: "weakTopic", route: "/marafon?topicId=7", topicName: "Chorrahalar" });
    const mild = { ...base, practicedCount: 10, weakTopics: [{ id: 7, name: "Chorrahalar", wrongCount: 1 }] };
    expect(selectNextBestAction(mild).kind).toBe("examReady");
  });

  it("P4: next ticket uses the local store ids (not the ticket number) once one is passed", () => {
    const d = selectNextBestAction({ ...base, practicedCount: 20, passedTicketIds: new Set([501]) });
    expect(d).toEqual({ kind: "nextTicket", route: "/tickets/502", ticketId: 502, ticketNumber: 2, total: 3 });
  });

  it("P4 ignores passed ids that are not in the local store (legacy numbering)", () => {
    const d = selectNextBestAction({ ...base, practicedCount: 20, passedTicketIds: new Set([1, 2]) });
    expect(d.kind).toBe("examReady");
  });

  it("P5: new user → diagnostic; P6: everything passed → exam simulation", () => {
    expect(selectNextBestAction(base)).toEqual({ kind: "diagnostic" });
    const all = selectNextBestAction({ ...base, practicedCount: 100, readinessPercent: 87.6, passedTicketIds: new Set([501, 502, 503]) });
    expect(all).toEqual({ kind: "examReady", readiness: 88 });
  });

  it("nextUnpassedTicket orders by ticket number", () => {
    expect(nextUnpassedTicket(tickets, new Set([501]))?.id).toBe(502);
    expect(nextUnpassedTicket(tickets, new Set([501, 502, 503]))).toBeNull();
  });
});

const NOW = 1_700_000_000_000;
const sess = (over: Partial<DbExamSession>): DbExamSession => ({
  local_id: "x",
  server_id: null,
  exam_type: "EXAM",
  status: "IN_PROGRESS",
  total_questions: 20,
  correct_answers: 0,
  score: 0,
  duration_seconds: 0,
  time_remaining_seconds: 0,
  started_at: NOW - 1000,
  completed_at: null,
  answers_json: JSON.stringify({ 0: { selected: 1 }, 1: { selected: 2 } }),
  questions_json: JSON.stringify(new Array(20).fill({})),
  synced: 0,
  ...over,
});

describe("resume session selection", () => {
  it("maps session types to auto-restoring routes", () => {
    expect(describeSession(sess({ exam_type: "EXAM" }))?.route).toBe("/exam?count=20");
    expect(describeSession(sess({ exam_type: "MARATHON" }))?.route).toBe("/marafon");
    expect(describeSession(sess({ exam_type: "WRONG_EXAM" }))?.route).toBe("/wrong-exam");
    const tk = describeSession(sess({ exam_type: "ticket_512" }), new Map([[512, 12]]));
    expect(tk).toMatchObject({ kind: "ticket", route: "/tickets/512", ticketNumber: 12, answered: 2, total: 20 });
    expect(describeSession(sess({ exam_type: "TOPIC" }))).toBeNull();
  });

  it("picks the newest in-progress session within 24h", () => {
    const list = [
      sess({ local_id: "old", started_at: NOW - RESUME_MAX_AGE_MS - 1 }),
      sess({ local_id: "done", status: "COMPLETED", started_at: NOW - 10 }),
      sess({ local_id: "a", exam_type: "MARATHON", started_at: NOW - 5000 }),
      sess({ local_id: "b", exam_type: "EXAM", started_at: NOW - 2000 }),
      sess({ local_id: "noq", questions_json: undefined, started_at: NOW - 1 }),
    ];
    expect(pickResumableSession(list, NOW)?.localId).toBe("b");
    expect(pickResumableSession([list[0], list[1]], NOW)).toBeNull();
  });
});
