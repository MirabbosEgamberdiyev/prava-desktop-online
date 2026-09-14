/**
 * PRAVA DESKTOP ONLINE — OFFLINE DATASET MANAGER TEST SUITE
 * Verifies:
 * 1. Dataset constants: 1,190 questions, 60 tickets, 10 topics.
 * 2. Readiness check reporting missing questions, tickets, and topics.
 * 3. Progress subscription and event streaming.
 * 4. Dataset integrity verification and foreign key consistency.
 * 5. Bundled seed dataset loading and validation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  offlineDatasetManager,
  CURRENT_DATASET_VERSION,
  EXPECTED_QUESTIONS_COUNT,
  EXPECTED_TICKETS_COUNT,
  EXPECTED_TOPICS_COUNT,
  type PreloadProgress,
} from "../src/services/offlineDatasetManager";
import { questionRepository } from "../src/database/repositories/questionRepository";
import { ticketRepository } from "../src/database/repositories/ticketRepository";
import { topicRepository } from "../src/database/repositories/topicRepository";
import { dbClient } from "../src/database/dbClient";
import fs from "fs";
import path from "path";

describe("Offline Dataset Manager Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Verifies authoritative dataset constants", () => {
    expect(EXPECTED_QUESTIONS_COUNT).toBe(1190);
    expect(EXPECTED_TICKETS_COUNT).toBe(60);
    expect(EXPECTED_TOPICS_COUNT).toBe(10);
    expect(CURRENT_DATASET_VERSION).toBe("2026.09.14");
  });

  it("2. Verifies public/data bundled seed files exist and are valid JSON", () => {
    const publicDataDir = path.resolve(process.cwd(), "public/data");

    // Manifest
    const manifestPath = path.join(publicDataDir, "manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.version).toBe(2);
    expect(manifest.question_count).toBe(1190);
    expect(manifest.ticket_count).toBe(60);
    expect(manifest.topic_count).toBe(10);

    // Topics
    const topicsPath = path.join(publicDataDir, "topics.json");
    expect(fs.existsSync(topicsPath)).toBe(true);
    const topics = JSON.parse(fs.readFileSync(topicsPath, "utf-8"));
    expect(topics.length).toBe(10);

    // Tickets
    const ticketsPath = path.join(publicDataDir, "tickets.json");
    expect(fs.existsSync(ticketsPath)).toBe(true);
    const tickets = JSON.parse(fs.readFileSync(ticketsPath, "utf-8"));
    expect(tickets.length).toBe(60);

    // Ticket-Question assignments
    const tqPath = path.join(publicDataDir, "ticket_questions.json");
    expect(fs.existsSync(tqPath)).toBe(true);
    const tq = JSON.parse(fs.readFileSync(tqPath, "utf-8"));
    expect(tq.length).toBe(1190);

    // Questions
    const questionsPath = path.join(publicDataDir, "questions.json");
    expect(fs.existsSync(questionsPath)).toBe(true);
    const questions = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
    expect(questions.length).toBe(1190);

    // Validate sample question structure
    const sample = questions[0];
    expect(sample).toHaveProperty("id");
    expect(sample).toHaveProperty("text_uzl");
    expect(sample).toHaveProperty("options_json");
    expect(sample).toHaveProperty("correct_option");
  });

  it("3. Reports NOT ready when database is empty", async () => {
    vi.spyOn(questionRepository, "getQuestionCount").mockResolvedValue(0);
    vi.spyOn(ticketRepository, "getAllTickets").mockResolvedValue([]);
    vi.spyOn(topicRepository, "getAllTopics").mockResolvedValue([]);
    vi.spyOn(dbClient, "getSyncMeta").mockResolvedValue(null);

    const readiness = await offlineDatasetManager.checkReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.questionsCount).toBe(0);
    expect(readiness.ticketsCount).toBe(0);
    expect(readiness.issues.length).toBe(3);
    expect(readiness.issues[0]).toContain("Savollar yetarli emas");
  });

  it("4. Reports READY when all 1,190 questions, 60 tickets and 10 topics are present", async () => {
    vi.spyOn(questionRepository, "getQuestionCount").mockResolvedValue(1190);
    vi.spyOn(ticketRepository, "getAllTickets").mockResolvedValue(new Array(60).fill({ id: 1 }) as any);
    vi.spyOn(topicRepository, "getAllTopics").mockResolvedValue(new Array(10).fill({ id: 1 }) as any);
    vi.spyOn(dbClient, "getSyncMeta").mockImplementation(async (key) => {
      if (key === "dataset_version") return "2026.09.14";
      if (key === "dataset_status") return "READY";
      return null;
    });

    const readiness = await offlineDatasetManager.checkReadiness();
    expect(readiness.ready).toBe(true);
    expect(readiness.status).toBe("READY");
    expect(readiness.questionsCount).toBe(1190);
    expect(readiness.ticketsCount).toBe(60);
    expect(readiness.issues.length).toBe(0);
  });

  it("5. Streams progress events through subscribe", () => {
    const events: PreloadProgress[] = [];
    const unsubscribe = offlineDatasetManager.subscribe((p) => {
      events.push({ ...p });
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty("questionsTotal", 1190);
    expect(events[0]).toHaveProperty("ticketsTotal", 60);

    unsubscribe();
  });

  it("6. Validates dataset integrity and catches incomplete tickets", async () => {
    vi.spyOn(questionRepository, "getQuestionCount").mockResolvedValue(1190);
    vi.spyOn(ticketRepository, "getAllTickets").mockResolvedValue(new Array(60).fill({ id: 1 }) as any);
    // Ticket 5 has no questions
    vi.spyOn(questionRepository, "getQuestionsByTicket").mockImplementation(async (ticketId) => {
      if (ticketId === 5) return [];
      return new Array(20).fill({ id: 1 }) as any;
    });

    await expect(offlineDatasetManager.validateIntegrity()).rejects.toThrow("5-biletda savollar topilmadi");
  });
});
