/**
 * PRAVA DESKTOP ONLINE — TOPIC REPOSITORY
 * Pure Local Database Access Layer for Traffic Topics
 */

import { dbClient } from "../dbClient";
import type { DbTopic } from "../schema";

export const topicRepository = {
  /**
   * Get all topics from local database ordered by order_num
   */
  async getAllTopics(): Promise<DbTopic[]> {
    const list = await dbClient.getTopics();
    return [...list].sort((a, b) => a.order_num - b.order_num);
  },

  /**
   * Save or update topics in local database
   */
  /** Replace all topics with the official server list (offline bundle v2). */
  async replaceTopics(topics: DbTopic[]): Promise<void> {
    await dbClient.replaceTopics(topics);
  },

  async saveTopics(topics: DbTopic[]): Promise<void> {
    if (!topics || topics.length === 0) return;
    await dbClient.saveTopics(topics);
  },
};
