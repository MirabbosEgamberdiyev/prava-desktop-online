/**
 * PRAVA DESKTOP ONLINE — TICKET REPOSITORY
 * Pure Local Database Access Layer for Standard Tickets
 */

import { dbClient } from "../dbClient";
import type { DbTicket } from "../schema";

export const ticketRepository = {
  /**
   * Get all tickets from local database
   */
  async getAllTickets(): Promise<DbTicket[]> {
    const list = await dbClient.getTickets();
    return [...list].sort((a, b) => a.ticket_number - b.ticket_number);
  },

  async getTicketById(id: number): Promise<DbTicket | null> {
    return dbClient.getTicketById(id);
  },

  /** Replace all tickets with the official server list (offline bundle v2). */
  async replaceTickets(tickets: DbTicket[]): Promise<void> {
    await dbClient.replaceTickets(tickets);
  },

  /**
   * Save or update tickets in local database
   */
  async saveTickets(tickets: DbTicket[]): Promise<void> {
    if (!tickets || tickets.length === 0) return;
    await dbClient.saveTickets(tickets);
  },
};
