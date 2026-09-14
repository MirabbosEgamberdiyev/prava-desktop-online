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
    const list = await dbClient.getQuestionsByTicket(ticketId);
    return list.filter((q) => !q.is_deleted);
  },

  /**
   * Get all active questions for a specific topic
   */
  async getQuestionsByTopic(topicId: number): Promise<DbQuestion[]> {
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
    const all = await dbClient.getAllQuestions();
    const found = all.find((q) => q.id === id);
    if (!found || found.is_deleted) return null;
    return found;
  },

  /**
   * Get total number of active questions in local DB
   */
  async getQuestionCount(): Promise<number> {
    const all = await this.getAllQuestions();
    return all.length;
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
    const all = await dbClient.getAllQuestions();
    const existing = all.find((q) => q.id === id);
    if (existing) {
      existing.is_deleted = 1;
      existing.updated_at = Date.now();
      await dbClient.saveQuestions([existing]);
    }
  },
};
