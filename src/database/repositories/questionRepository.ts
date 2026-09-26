/**
 * PRAVA DESKTOP ONLINE — QUESTION REPOSITORY
 * Pure Local Database Access Layer for Questions (Offline-First Runtime Source of Truth)
 */

import { dbClient } from "../dbClient";
import type { DbQuestion } from "../schema";

export const questionRepository = {
  /**
   * Get all active questions for a specific ticket
   */
  async getQuestionsByTicket(ticketId: number): Promise<DbQuestion[]> {
    // Offline bundle v2: the official, ORDERED ticket→question mapping.
    const ticket = await dbClient.getTicketById(ticketId).catch(() => null);
    if (ticket?.question_ids && ticket.question_ids.length > 0) {
      const mapped = await dbClient.getQuestionsByIds(ticket.question_ids);
      const active = mapped.filter((q) => !q.is_deleted);
      if (active.length > 0) return active;
    }
    const list = await dbClient.getQuestionsByTicket(ticketId);
    return list.filter((q) => !q.is_deleted).sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
  },

  /**
   * Get all active questions for a specific topic
   */
  async getQuestionsByTopic(topicId: number): Promise<DbQuestion[]> {
    const topic = await dbClient.getTopicById(topicId).catch(() => null);
    if (topic?.question_ids && topic.question_ids.length > 0) {
      const mapped = await dbClient.getQuestionsByIds(topic.question_ids);
      const active = mapped.filter((q) => !q.is_deleted);
      if (active.length > 0) return active;
    }
    const list = await dbClient.getQuestionsByTopic(topicId);
    return list.filter((q) => !q.is_deleted);
  },

  /**
   * Get random active questions (for Real Exam or Marathon)
   */
  async getRandomQuestions(count: number, topicId?: number): Promise<DbQuestion[]> {
    const list = await dbClient.getRandomQuestions(count, topicId);
    return list.filter((q) => !q.is_deleted);
  },

  /**
   * Get all active questions stored locally
   */
  async getAllQuestions(): Promise<DbQuestion[]> {
    const list = await dbClient.getAllQuestions();
    return list.filter((q) => !q.is_deleted);
  },

  /**
   * Get a single question by its ID
   */
  async getQuestionById(id: number): Promise<DbQuestion | null> {
    const found = await dbClient.getQuestionById(id);
    if (!found || found.is_deleted) return null;
    return found;
  },

  /**
   * Get total number of active questions in local DB
   */
  async getQuestionCount(): Promise<number> {
    // store.count() — no full read of ~1200 rows (soft-deleted rows are rare and still count).
    return dbClient.getQuestionCount();
  },

  /**
   * Bulk save or update questions in local DB (with versioning/updated_at)
   */
  async saveQuestions(questions: DbQuestion[]): Promise<void> {
    if (!questions || questions.length === 0) return;
    await dbClient.saveQuestions(questions);
  },

  /**
   * Soft-delete a question so historical exam records don't break
   */
  async softDeleteQuestion(id: number): Promise<void> {
    const existing = await dbClient.getQuestionById(id);
    if (existing) {
      existing.is_deleted = 1;
      existing.updated_at = Date.now();
      await dbClient.saveQuestions([existing]);
    }
  },
};
