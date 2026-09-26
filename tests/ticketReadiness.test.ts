import { describe, it, expect } from "vitest";
import { buildTicketReadiness, legacyTickets } from "../src/services/ticketReadiness";
import type { StoredTicketStat } from "../src/services/storageService";

const stat = (ticketId: number, over: Partial<StoredTicketStat> = {}): StoredTicketStat => ({
  ticketId,
  timesDone: 1,
  timesPassed: 1,
  bestCorrect: 20,
  lastScore: 100,
  lastDuration: 300,
  fastPerfectCount: 0,
  ...over,
});

describe("buildTicketReadiness (bundle v2 ids)", () => {
  const tickets = [
    { id: 9002, ticket_number: 2 },
    { id: 9001, ticket_number: 1, name_uzl: "1-bilet (rasmiy)" },
    { id: 9003, ticket_number: 3 },
  ];

  it("looks local stats up by ticket id and orders rows by ticket number", () => {
    const rows = buildTicketReadiness(tickets, { 9002: stat(9002) }, null);
    expect(rows.map((r) => r.ticket_number)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.ticket_id)).toEqual([9001, 9002, 9003]);
    expect(rows[1].readiness).toBe("ready");
    expect(rows[0].readiness).toBe("untouched");
    expect(rows[0].name_uzl).toBe("1-bilet (rasmiy)");
    expect(rows[2].name_ru).toBe("Билет #3");
  });

  it("does not credit a stat keyed by ticket NUMBER to a different ticket", () => {
    // legacy key 2 (a number) must not light up ticket #2 whose id is 9002
    const rows = buildTicketReadiness(tickets, { 2: stat(2) }, null);
    expect(rows.every((r) => r.readiness === "untouched")).toBe(true);
  });

  it("merges server stats by ticket number", () => {
    const rows = buildTicketReadiness(tickets, {}, [
      { ticketNumber: 3, totalExams: 2, passedExams: 0, bestScore: 75, averageScore: 72 },
      { ticketNumber: 1, totalExams: 1, passedExams: 0, bestScore: 40, averageScore: 40 },
    ]);
    const byNum = new Map(rows.map((r) => [r.ticket_number, r]));
    expect(byNum.get(3)?.readiness).toBe("average");
    expect(byNum.get(3)?.times_done).toBe(2);
    expect(byNum.get(1)?.readiness).toBe("not_ready");
    expect(byNum.get(2)?.readiness).toBe("untouched");
  });

  it("falls back to legacy 1..60 numbering when the tickets store is empty", () => {
    const rows = buildTicketReadiness(legacyTickets(), { 5: stat(5) }, null);
    expect(rows).toHaveLength(60);
    expect(rows[4]).toMatchObject({ ticket_id: 5, ticket_number: 5, readiness: "ready" });
  });
});
