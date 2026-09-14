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
    return dbClient.getTickets();
  },

  /**
   * Save or update tickets in local database
   */
  async saveTickets(tickets: DbTicket[]): Promise<void> {
    if (!tickets || tickets.length === 0) return;
    await dbClient.saveTickets(tickets);
  },
};
