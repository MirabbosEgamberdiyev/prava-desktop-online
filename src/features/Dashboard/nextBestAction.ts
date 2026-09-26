/**
 * Deterministic "next best action" engine for the dashboard (web P1→P6 parity), adapted to
 * desktop data sources: crash-recovery sessions (IndexedDB), local wrong answers, the local
 * tickets store (official server ids + ticket numbers) and local ticket stats keyed by id.
 * Pure — unit tested in tests/nextBestAction.test.ts.
 */

export interface NbaResumeSession {
  route: string;
  answered: number;
  total: number;
}

export interface NbaWeakTopic {
  id: number;
  name: string;
  wrongCount: number;
}

export interface NbaTicket {
  id: number;
  ticket_number: number;
}

export interface NbaInput {
  activeSession: NbaResumeSession | null;
  totalWrongs: number;
  /** Sorted by wrongCount desc. */
  weakTopics: NbaWeakTopic[];
  /** Local tickets store. */
  tickets: NbaTicket[];
  /** Ticket ids with at least one passed attempt. */
  passedTicketIds: ReadonlySet<number>;
  practicedCount: number;
  readinessPercent: number;
}

export type NbaDecision =
  | { kind: "resume"; route: string; current: number; total: number }
  | { kind: "mistakes"; route: string; count: number }
  | { kind: "weakTopic"; route: string; topicId: number; topicName: string; count: number }
  | { kind: "nextTicket"; route: string; ticketId: number; ticketNumber: number; total: number }
  | { kind: "diagnostic" }
  | { kind: "examReady"; readiness: number };

/** First ticket (by number) not passed yet, or null when all are passed / no tickets. */
export function nextUnpassedTicket(tickets: readonly NbaTicket[], passed: ReadonlySet<number>): NbaTicket | null {
  const sorted = [...tickets].sort((a, b) => a.ticket_number - b.ticket_number);
  return sorted.find((t) => !passed.has(t.id)) ?? null;
}

export function selectNextBestAction(input: NbaInput): NbaDecision {
  // P1: unfinished session (crash recovery data) — continue where the user stopped.
  const s = input.activeSession;
  if (s && s.total > 0 && s.answered < s.total) {
    return { kind: "resume", route: s.route, current: Math.min(s.total, s.answered + 1), total: s.total };
  }

  // P2: unresolved mistakes.
  if (input.totalWrongs > 0) {
    return { kind: "mistakes", route: "/wrong-exam", count: input.totalWrongs };
  }

  // P3: a clearly weak topic (≥ 2 mistakes).
  const weak = input.weakTopics[0];
  if (weak && weak.wrongCount >= 2) {
    return { kind: "weakTopic", route: `/marafon?topicId=${weak.id}`, topicId: weak.id, topicName: weak.name, count: weak.wrongCount };
  }

  // P4: sequential ticket progression (only once the user has passed at least one ticket).
  const passedKnown = input.tickets.filter((t) => input.passedTicketIds.has(t.id)).length;
  if (passedKnown > 0) {
    const next = nextUnpassedTicket(input.tickets, input.passedTicketIds);
    if (next) {
      return {
        kind: "nextTicket",
        route: `/tickets/${next.id}`,
        ticketId: next.id,
        ticketNumber: next.ticket_number,
        total: input.tickets.length,
      };
    }
  }

  // P5: brand-new user → diagnostic test.
  if (input.practicedCount === 0) return { kind: "diagnostic" };

  // P6: ready → full exam simulation.
  return { kind: "examReady", readiness: Math.max(0, Math.min(100, Math.round(input.readinessPercent))) };
}
