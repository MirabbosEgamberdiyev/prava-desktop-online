/**
 * Per-ticket readiness for the Statistics page.
 *
 * Since offline bundle v2 the local ticket stats (storageService.saveTicketStat) are keyed by the
 * OFFICIAL server ticket id, while the server `/my-statistics` ticketStats carry `ticketNumber`.
 * So the rows are driven by the local tickets store (id + ticket_number): local stats are looked
 * up by id, server stats by number. Without a local store the legacy 1..N numbering is used.
 * Pure — unit tested in tests/ticketReadiness.test.ts.
 */
import type { TicketReadinessStat } from "../types/desktop";
import type { StoredTicketStat } from "./storageService";

export interface ReadinessTicket {
  id: number;
  ticket_number: number;
  name_uzl?: string | null;
  name_uzc?: string | null;
  name_en?: string | null;
  name_ru?: string | null;
}

export interface ServerTicketStat {
  ticketNumber?: number;
  totalExams?: number | string;
  passedExams?: number | string;
  bestScore?: number | null;
  averageScore?: number | null;
}

export const LEGACY_TICKET_TOTAL = 60;

/** Synthetic ticket list (id == number) used only when the local tickets store is empty. */
export function legacyTickets(total = LEGACY_TICKET_TOTAL): ReadinessTicket[] {
  return Array.from({ length: total }, (_, i) => ({ id: i + 1, ticket_number: i + 1 }));
}

export function buildTicketReadiness(
  tickets: readonly ReadinessTicket[],
  localStats: Readonly<Record<number, StoredTicketStat | undefined>>,
  serverStats: readonly ServerTicketStat[] | null | undefined
): TicketReadinessStat[] {
  const serverByNumber = new Map<number, ServerTicketStat>();
  for (const item of serverStats ?? []) {
    if (item && item.ticketNumber) serverByNumber.set(Number(item.ticketNumber), item);
  }

  const sorted = [...tickets].sort((a, b) => a.ticket_number - b.ticket_number);
  return sorted.map((tk) => {
    const num = tk.ticket_number;
    const stat = localStats[tk.id];
    const serverTk = serverByNumber.get(num);

    const timesDone = Math.max(stat?.timesDone || 0, Number(serverTk?.totalExams || 0));
    const midGood = Math.max(stat?.timesPassed || 0, Number(serverTk?.passedExams || 0));
    const fastPerfect = stat?.fastPerfectCount || (serverTk?.bestScore === 100 ? 1 : 0);
    const slowPoor = Math.max(0, timesDone - midGood);
    const lastScore = stat?.lastScore ?? serverTk?.bestScore ?? null;
    const lastDuration = stat?.lastDuration ?? null;

    let readiness: TicketReadinessStat["readiness"];
    if (timesDone === 0) readiness = "untouched";
    else if (
      midGood >= 1 ||
      fastPerfect >= 1 ||
      (lastScore != null && lastScore >= 90) ||
      (serverTk?.bestScore != null && serverTk.bestScore >= 90)
    )
      readiness = "ready";
    else if ((lastScore != null && lastScore >= 70) || (serverTk?.averageScore != null && serverTk.averageScore >= 70))
      readiness = "average";
    else readiness = "not_ready";

    return {
      ticket_id: tk.id,
      ticket_number: num,
      name_uzl: tk.name_uzl || `${num}-bilet`,
      name_uzc: tk.name_uzc || `${num}-билет`,
      name_en: tk.name_en || `Ticket #${num}`,
      name_ru: tk.name_ru || `Билет #${num}`,
      times_done: timesDone,
      fast_perfect_count: fastPerfect,
      mid_good_count: midGood,
      slow_poor_count: slowPoor,
      last_score: lastScore,
      last_duration: lastDuration,
      readiness,
    };
  });
}
