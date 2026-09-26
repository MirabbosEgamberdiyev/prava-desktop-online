/**
 * PRAVA DESKTOP ONLINE — OFFLINE DATASET MANAGER
 * Manages atomic preload, verification, resume, and versioning for 100% offline exams.
 */

import { dbClient } from "../database/dbClient";
import { questionRepository } from "../database/repositories/questionRepository";
import { ticketRepository } from "../database/repositories/ticketRepository";
import { topicRepository } from "../database/repositories/topicRepository";
import type { DbQuestion, DbTicket, DbTopic, OfflineDatasetStatus } from "../database/schema";
import { offlineMediaManager } from "./offlineMediaManager";

export const CURRENT_DATASET_VERSION = "2026.09.14";
export const EXPECTED_QUESTIONS_COUNT = 1190;
export const EXPECTED_TICKETS_COUNT = 60;
export const EXPECTED_TOPICS_COUNT = 10;

export interface PreloadProgress {
  questionsCurrent: number;
  questionsTotal: number;
  ticketsCurrent: number;
  ticketsTotal: number;
  mediaCurrent: number;
  mediaTotal: number;
  overallPercent: number;
  status: OfflineDatasetStatus;
  currentTaskMessage: string;
  error?: string;
}

export interface ReadinessResult {
  ready: boolean;
  status: OfflineDatasetStatus;
  questionsCount: number;
  ticketsCount: number;
  mediaCachedCount: number;
  datasetVersion: string;
  issues: string[];
}

type ProgressListener = (progress: PreloadProgress) => void;

async function loadJsonDataset<T>(relativePath: string): Promise<T> {
  const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    try {
      const url = `${window.location.origin}${cleanPath}`;
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // fallback to relative
    }
  }

  try {
    const res = await fetch(cleanPath);
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // try Node filesystem if in Vitest / Node test runner
    const g = globalThis as any;
    if (typeof g.process !== "undefined" && g.process?.versions?.node) {
      try {
        const fsMod = "fs/promises";
        const pathMod = "path";
        const fs = await import(/* @vite-ignore */ fsMod);
        const pathModule = await import(/* @vite-ignore */ pathMod);
        const filePath = pathModule.resolve(g.process.cwd(), "public", cleanPath.replace(/^\/+/, ""));
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content) as T;
      } catch (err) {
        console.warn(`[OfflineDatasetManager] Node fs fallback failed for ${cleanPath}:`, err);
      }
    }
  }

  throw new Error(`Ma'lumotlar fayli yuklanmadi: ${cleanPath}`);
}

class OfflineDatasetManager {
  private listeners = new Set<ProgressListener>();
  private currentProgress: PreloadProgress = {
    questionsCurrent: 0,
    questionsTotal: EXPECTED_QUESTIONS_COUNT,
    ticketsCurrent: 0,
    ticketsTotal: EXPECTED_TICKETS_COUNT,
    mediaCurrent: 0,
    mediaTotal: 747,
    overallPercent: 0,
    status: "IDLE",
    currentTaskMessage: "",
  };

  private isPreloading = false;
  private abortRequested = false;

  public subscribe(fn: ProgressListener): () => void {
    this.listeners.add(fn);
    fn(this.currentProgress);
    return () => this.listeners.delete(fn);
  }

  private updateProgress(updates: Partial<PreloadProgress>): void {
    this.currentProgress = { ...this.currentProgress, ...updates };
    this.listeners.forEach((fn) => {
      try {
        fn(this.currentProgress);
      } catch (err) {
        console.warn("[OfflineDatasetManager] Listener error:", err);
      }
    });
  }

  public getProgress(): PreloadProgress {
    return { ...this.currentProgress };
  }

  /**
   * Check if local database is 100% ready for offline exams
   */
  public async checkReadiness(): Promise<ReadinessResult> {
    const issues: string[] = [];

    const qCount = await questionRepository.getQuestionCount();
    const tickets = await ticketRepository.getAllTickets();
    const topics = await topicRepository.getAllTopics();
    const mediaCount = await offlineMediaManager.getCachedCount();
    const version = (await dbClient.getSyncMeta("dataset_version")) || "NONE";
    const status = ((await dbClient.getSyncMeta("dataset_status")) as OfflineDatasetStatus) || "IDLE";

    if (qCount < EXPECTED_QUESTIONS_COUNT) {
      issues.push(`Savollar yetarli emas (${qCount} / ${EXPECTED_QUESTIONS_COUNT})`);
    }
    if (tickets.length < EXPECTED_TICKETS_COUNT) {
      issues.push(`Biletlar yetarli emas (${tickets.length} / ${EXPECTED_TICKETS_COUNT})`);
    }
    if (topics.length < EXPECTED_TOPICS_COUNT) {
      issues.push(`Mavzular yetarli emas (${topics.length} / ${EXPECTED_TOPICS_COUNT})`);
    }

    const isReady = issues.length === 0;

    return {
      ready: isReady,
      status: isReady ? "READY" : status,
      questionsCount: qCount,
      ticketsCount: tickets.length,
      mediaCachedCount: mediaCount,
      datasetVersion: version,
      issues,
    };
  }

  /**
   * Auto-seed bundled dataset if database is empty or incomplete
   */
  public async autoSeedIfEmpty(): Promise<boolean> {
    try {
      const qCount = await questionRepository.getQuestionCount();
      if (qCount >= EXPECTED_QUESTIONS_COUNT) {
        return true;
      }
      // Official server bundle (v2: topics + tickets) already stored — never overwrite it
      // with the bundled seed, even if the server currently has fewer questions.
      if (qCount > 0 && (await dbClient.getSyncMeta("offline_bundle_schema").catch(() => null)) === "2") {
        return true;
      }
      console.info("[OfflineDatasetManager] Local question database empty. Initiating bundled seed...");
      await this.seedBundledData();
      return true;
    } catch (err) {
      console.warn("[OfflineDatasetManager] Auto-seed error:", err);
      return false;
    }
  }

  /**
   * Load bundled seed JSON files into local database
   */
  public async seedBundledData(): Promise<void> {
    this.updateProgress({
      status: "DOWNLOADING",
      currentTaskMessage: "Lokal ma'lumotlar to'plami tekshirilmoqda...",
      overallPercent: 5,
    });

    // 1. Fetch Topics
    const topicsRaw = await loadJsonDataset<any[]>("/data/topics.json");
    const dbTopics: DbTopic[] = topicsRaw.map((t: any) => ({
      id: t.id,
      code: t.code,
      name_uzl: t.name_uzl,
      name_uzc: t.name_uzc,
      name_en: t.name_en,
      name_ru: t.name_ru,
      order_num: t.id,
      question_count: t.question_count,
      updated_at: Date.now(),
    }));
    await dbClient.saveTopics(dbTopics);

    this.updateProgress({
      ticketsCurrent: 0,
      ticketsTotal: EXPECTED_TICKETS_COUNT,
      currentTaskMessage: "Biletlar bazaga yozilmoqda...",
      overallPercent: 15,
    });

    // 2. Fetch Tickets
    const ticketsRaw = await loadJsonDataset<any[]>("/data/tickets.json");
    const dbTickets: DbTicket[] = ticketsRaw.map((t: any) => ({
      id: t.id,
      ticket_number: t.ticket_number,
      name_uzl: t.name_uzl,
      name_uzc: t.name_uzc,
      name_en: t.name_en,
      name_ru: t.name_ru,
      duration_minutes: t.duration_minutes || 20,
      passing_score: t.passing_score || 90,
      question_count: t.question_count || 20,
      updated_at: Date.now(),
    }));
    await dbClient.saveTickets(dbTickets);

    this.updateProgress({
      ticketsCurrent: dbTickets.length,
      currentTaskMessage: "Savol-bilet bog'lanmalari yuklanmoqda...",
      overallPercent: 25,
    });

    // 3. Fetch Ticket-Question Assignments
    const tqRaw = await loadJsonDataset<Array<{ ticket_id: number; question_id: number; question_order: number }>>(
      "/data/ticket_questions.json"
    );
    const questionToTicketMap = new Map<number, { ticket_id: number; order_num: number }>();
    for (const link of tqRaw) {
      questionToTicketMap.set(link.question_id, {
        ticket_id: link.ticket_id,
        order_num: link.question_order,
      });
    }

    this.updateProgress({
      currentTaskMessage: "Barcha 1,190 ta savol yuklanmoqda...",
      overallPercent: 35,
    });

    // 4. Fetch Full 1,190 Questions
    const questionsRaw = await loadJsonDataset<any[]>("/data/questions.json");

    const dbQuestions: DbQuestion[] = questionsRaw.map((q: any) => {
      const ticketAssignment = questionToTicketMap.get(q.id);
      return {
        id: q.id,
        ticket_id: ticketAssignment?.ticket_id ?? null,
        topic_id: q.topic_id ?? null,
        order_num: ticketAssignment?.order_num ?? q.order_num ?? 0,
        text_uzl: q.text_uzl || "",
        text_uzc: q.text_uzc || null,
        text_en: q.text_en || null,
        text_ru: q.text_ru || null,
        explanation_uzl: q.explanation_uzl || null,
        explanation_uzc: q.explanation_uzc || null,
        explanation_en: q.explanation_en || null,
        explanation_ru: q.explanation_ru || null,
        image_url: q.image_path || null,
        options_json: typeof q.options_json === "string" ? q.options_json : JSON.stringify(q.options_json || []),
        correct_option: Number(q.correct_option ?? 0),
        updated_at: Date.now(),
        version: 2,
        is_deleted: 0,
      };
    });

    // Bulk insert into local database
    await dbClient.bulkInsertQuestions(dbQuestions);

    this.updateProgress({
      questionsCurrent: dbQuestions.length,
      questionsTotal: EXPECTED_QUESTIONS_COUNT,
      overallPercent: 75,
      currentTaskMessage: "Ma'lumotlar butunligi tekshirilmoqda...",
    });

    // 5. Verify and set metadata
    await dbClient.setSyncMeta("dataset_version", CURRENT_DATASET_VERSION);
    await dbClient.setSyncMeta("dataset_status", "READY");
    await dbClient.setSyncMeta("dataset_seeded_at", String(Date.now()));

    this.updateProgress({
      status: "READY",
      currentTaskMessage: "Offline ma'lumotlar tayyor!",
      overallPercent: 100,
    });
  }

  /**
   * Start or resume full offline preparation (Questions + Tickets + Media Cache)
   */
  public async startPreload(includeMedia = true): Promise<void> {
    if (this.isPreloading) return;
    this.isPreloading = true;
    this.abortRequested = false;

    try {
      // Step 1: Ensure Questions & Tickets
      const qCount = await questionRepository.getQuestionCount();
      if (qCount < EXPECTED_QUESTIONS_COUNT) {
        await this.seedBundledData();
      }

      // Step 2: Preload Media if requested and online
      if (includeMedia) {
        await this.preloadMedia();
      }

      // Step 3: Final validation
      await this.validateIntegrity();

      this.updateProgress({
        status: "READY",
        overallPercent: 100,
        currentTaskMessage: "Offline rejim to'liq tayyor!",
      });
    } catch (err: any) {
      this.updateProgress({
        status: "FAILED",
        error: err?.message || String(err),
        currentTaskMessage: `Xatolik: ${err?.message || String(err)}`,
      });
      throw err;
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload question media with resume support
   */
  private async preloadMedia(): Promise<void> {
    const allQuestions = await questionRepository.getAllQuestions();
    const questionsWithImages = allQuestions.filter((q) => !!q.image_url);
    const totalMedia = questionsWithImages.length;

    this.updateProgress({
      mediaTotal: totalMedia,
      mediaCurrent: 0,
      currentTaskMessage: "Rasmlar keshlanmoqda...",
    });

    let cachedCount = await offlineMediaManager.getCachedCount();
    this.updateProgress({ mediaCurrent: cachedCount });

    const BATCH_SIZE = 10;
    for (let i = 0; i < questionsWithImages.length; i += BATCH_SIZE) {
      if (this.abortRequested) break;

      const batch = questionsWithImages.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (q) => {
          if (q.image_url) {
            try {
              await offlineMediaManager.cacheImage(q.image_url);
            } catch {
              // Non-blocking for individual images
            }
          }
        })
      );

      cachedCount = Math.min(totalMedia, i + batch.length);
      const mediaPercent = totalMedia > 0 ? Math.round((cachedCount / totalMedia) * 100) : 100;
      const overall = Math.round(75 + mediaPercent * 0.25);

      this.updateProgress({
        mediaCurrent: cachedCount,
        overallPercent: overall,
        currentTaskMessage: `Rasmlar keshlanmoqda (${cachedCount} / ${totalMedia})...`,
      });
    }
  }

  /**
   * Validate dataset integrity
   */
  public async validateIntegrity(): Promise<boolean> {
    this.updateProgress({
      status: "VALIDATING",
      currentTaskMessage: "Baza butunligi tekshirilmoqda...",
    });

    const qCount = await questionRepository.getQuestionCount();
    if (qCount < EXPECTED_QUESTIONS_COUNT) {
      throw new Error(`Savollar to'liq emas: ${qCount} / ${EXPECTED_QUESTIONS_COUNT}`);
    }

    const tickets = await ticketRepository.getAllTickets();
    if (tickets.length < EXPECTED_TICKETS_COUNT) {
      throw new Error(`Biletlar to'liq emas: ${tickets.length} / ${EXPECTED_TICKETS_COUNT}`);
    }

    // Check that every ticket has questions
    for (let i = 1; i <= EXPECTED_TICKETS_COUNT; i++) {
      const tq = await questionRepository.getQuestionsByTicket(i);
      if (!tq || tq.length === 0) {
        throw new Error(`${i}-biletda savollar topilmadi`);
      }
    }

    await dbClient.setSyncMeta("dataset_status", "READY");
    await dbClient.setSyncMeta("last_integrity_check", String(Date.now()));
    return true;
  }

  public cancelPreload(): void {
    this.abortRequested = true;
  }
}

export const offlineDatasetManager = new OfflineDatasetManager();
