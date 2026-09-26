import { GUEST_USER_KEY, statsCacheKey, type UserScopeId } from "@/utils/userScope";
import { durationMinutesFor } from "./examRules";
import i18n from "i18next";
import type {
  OfflineQuestion,
  OfflineTicket,
  OfflineTopic,
  QuestionOption,
  FullStats,
  TicketReadinessStat,
  QuestionStatDetail,
  ExamResult,
  WrongAnswerEntry,
  SavedQuestionEntry,
} from "../types/desktop";
import storageService, { type StoredQuestion } from "./storageService";
import api from "../api/api";
import { normalizeLanguage, type AppLanguage } from "../context/LanguageContext";
import {
  dbClient,
  type DbQuestion,
  questionRepository,
  ticketRepository,
  topicRepository,
} from "../database";
import { OutboxQueue } from "../sync/outboxQueue";
import { networkModeManager } from "../sync/networkModeManager";
import { offlineDatasetManager } from "./offlineDatasetManager";
import { buildTicketReadiness, legacyTickets, type ReadinessTicket } from "./ticketReadiness";
import {
  buildRecordOfflinePayload,
  isFakeLocalSessionId,
  isRecordablePayload,
  RECORD_OFFLINE_URL,
  type IndexedAnswers,
  type OfflineExamType,
} from "./offlineExamRecord";

export function getLang(): AppLanguage {
  const l = i18n.resolvedLanguage || i18n.language;
  return normalizeLanguage(l);
}

export function localizeTopic(tp: OfflineTopic | null | undefined): string {
  if (!tp) return "";
  const lang = getLang();
  if (lang === "uzc" && tp.name_uzc) return tp.name_uzc;
  if (lang === "ru" && tp.name_ru) return tp.name_ru;
  return tp.name_uzl || tp.name_uzc || tp.name_ru || "";
}

export function parseOptions(json: string): QuestionOption[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function localizeQ(q: OfflineQuestion): string {
  const lang = getLang();
  if (lang === "uzc") return q.text_uzc || q.text_uzl;
  if (lang === "ru") return q.text_ru || q.text_uzl;
  return q.text_uzl;
}

export function localizeOpt(opt: QuestionOption): string {
  const lang = getLang();
  if (lang === "uzc") return opt.uzc || opt.uzl;
  if (lang === "ru") return opt.ru || opt.uzl;
  return opt.uzl;
}

export function localizeExp(q: OfflineQuestion): string | null {
  const lang = getLang();
  if (lang === "uzc" && q.explanation_uzc) return q.explanation_uzc;
  if (lang === "ru" && q.explanation_ru) return q.explanation_ru;
  return q.explanation_uzl ?? null;
}

export function normalizeQuestion(q: any): OfflineQuestion {
  const textUzl = typeof q.text === "object" ? q.text?.uzl || "" : q.text_uzl || q.text || "";
  const textUzc = typeof q.text === "object" ? q.text?.uzc || null : q.text_uzc || null;
  const textEn = typeof q.text === "object" ? q.text?.en || null : q.text_en || null;
  const textRu = typeof q.text === "object" ? q.text?.ru || null : q.text_ru || null;

  let optionsJson = q.options_json;
  if (!optionsJson && Array.isArray(q.options)) {
    optionsJson = JSON.stringify(
      q.options.map((opt: any, idx: number) => ({
        index: opt.index ?? idx,
        uzl: typeof opt.text === "object" ? opt.text?.uzl || "" : opt.uzl || opt.text || "",
        uzc: typeof opt.text === "object" ? opt.text?.uzc || "" : opt.uzc || "",
        en: typeof opt.text === "object" ? opt.text?.en || "" : opt.en || "",
        ru: typeof opt.text === "object" ? opt.text?.ru || "" : opt.ru || "",
      }))
    );
  }

  const expUzl =
    typeof q.explanation === "object" ? q.explanation?.uzl || null : q.explanation_uzl || null;
  const expUzc =
    typeof q.explanation === "object" ? q.explanation?.uzc || null : q.explanation_uzc || null;
  const expEn =
    typeof q.explanation === "object" ? q.explanation?.en || null : q.explanation_en || null;
  const expRu =
    typeof q.explanation === "object" ? q.explanation?.ru || null : q.explanation_ru || null;

  return {
    id: q.id,
    topic_id: q.topic_id ?? q.topicId ?? null,
    order_num: q.order_num ?? q.order ?? 0,
    text_uzl: textUzl,
    text_uzc: textUzc,
    text_en: textEn,
    text_ru: textRu,
    image_path: q.image_path || q.imageUrl || null,
    options_json: optionsJson || "[]",
    correct_option: q.correct_option ?? q.correctOptionIndex ?? 0,
    explanation_uzl: expUzl,
    explanation_uzc: expUzc,
    explanation_en: expEn,
    explanation_ru: expRu,
  };
}

export function toStoredQuestion(q: OfflineQuestion): StoredQuestion {
  const opts = parseOptions(q.options_json);
  return {
    id: q.id,
    ticketId: null,
    ticketNumber: null,
    topicId: q.topic_id,
    orderNum: q.order_num,
    textUzl: q.text_uzl,
    textUzc: q.text_uzc,
    textRu: q.text_ru,
    explanationUzl: q.explanation_uzl,
    explanationUzc: q.explanation_uzc,
    explanationRu: q.explanation_ru,
    imageUrl: q.image_path,
    options: opts.map((o) => ({ uzl: o.uzl, uzc: o.uzc, ru: o.ru })),
    correctOption: q.correct_option,
  };
}

export function fromStoredQuestion(sq: StoredQuestion): OfflineQuestion {
  return {
    id: sq.id,
    topic_id: sq.topicId ?? null,
    order_num: sq.orderNum ?? 0,
    text_uzl: sq.textUzl,
    text_uzc: sq.textUzc ?? null,
    text_en: null,
    text_ru: sq.textRu ?? null,
    image_path: sq.imageUrl ?? null,
    options_json: JSON.stringify(
      sq.options.map((o, idx) => ({
        index: idx,
        uzl: o.uzl,
        uzc: o.uzc || "",
        ru: o.ru || "",
      }))
    ),
    correct_option: sq.correctOption,
    explanation_uzl: sq.explanationUzl ?? null,
    explanation_uzc: sq.explanationUzc ?? null,
    explanation_en: null,
    explanation_ru: sq.explanationRu ?? null,
  };
}

export function dbQuestionToOfflineQuestion(dbq: DbQuestion): OfflineQuestion {
  return {
    id: dbq.id,
    topic_id: dbq.topic_id,
    order_num: dbq.order_num,
    text_uzl: dbq.text_uzl,
    text_uzc: dbq.text_uzc,
    text_en: null,
    text_ru: dbq.text_ru,
    image_path: dbq.image_url,
    options_json: dbq.options_json,
    correct_option: dbq.correct_option,
    explanation_uzl: dbq.explanation_uzl,
    explanation_uzc: dbq.explanation_uzc,
    explanation_en: null,
    explanation_ru: dbq.explanation_ru,
  };
}

export function offlineQuestionToDbQuestion(q: OfflineQuestion, ticketId?: number | null): DbQuestion {
  return {
    id: q.id,
    ticket_id: ticketId ?? null,
    topic_id: q.topic_id,
    order_num: q.order_num,
    text_uzl: q.text_uzl,
    text_uzc: q.text_uzc,
    text_ru: q.text_ru,
    explanation_uzl: q.explanation_uzl,
    explanation_uzc: q.explanation_uzc,
    explanation_ru: q.explanation_ru,
    image_url: q.image_path,
    options_json: q.options_json,
    correct_option: q.correct_option,
    updated_at: Date.now(),
  };
}

// ── ACTIVE SESSION TRACKING ───────────────────────────────────────────────────
// These hold REAL server session ids only (from a server start-visible call).
// Locally sourced exams leave them null and are reported via record-offline.
let activeExamSessionId: number | null = null;
let activeTicketSessionId: number | null = null;
let activeMarathonSessionId: number | null = null;

export function getActiveExamSessionId(): number | null {
  return activeExamSessionId;
}

export function getActiveTicketSessionId(): number | null {
  return activeTicketSessionId;
}

export function getActiveMarathonSessionId(): number | null {
  return activeMarathonSessionId;
}

export async function submitExamSession(
  sessionId: number,
  answers: { questionId: number; selectedOptionIndex?: number | null; timeSpentSeconds?: number }[]
): Promise<boolean> {
  if (!sessionId || !answers || answers.length === 0) return false;
  const payload = {
    sessionId,
    answers: answers.map((a) => ({
      questionId: a.questionId,
      selectedOptionIndex: a.selectedOptionIndex != null ? a.selectedOptionIndex : null,
      timeSpentSeconds: a.timeSpentSeconds || 0,
    })),
  };

  // STRICT OFFLINE MODE: ZERO remote network calls!
  if (networkModeManager.isOfflineOnly()) {
    try {
      await OutboxQueue.enqueue("SUBMIT_EXAM", "/api/v2/exams/submit", "POST", payload);
    } catch (e) {
      console.error("OutboxQueue xatosi:", e);
    }
    try {
      await dbClient.completeExamSession(String(sessionId), {
        status: "COMPLETED",
        completed_at: Date.now(),
      });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("prava-storage-changed"));
    }
    return true;
  }

  let isOnlineSuccess = false;
  try {
    await api.post("/api/v2/exams/submit", payload);
    isOnlineSuccess = true;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("prava-storage-changed"));
    }
  } catch (err) {
    console.warn("Serverga imtihon natijasini yuborib bo'lmadi, OutboxQueue navbatiga joylanmoqda:", err);
    try {
      await OutboxQueue.enqueue("SUBMIT_EXAM", "/api/v2/exams/submit", "POST", payload);
    } catch (e) {
      console.error("OutboxQueue xatosi:", e);
    }
  }

  // Crash recovery va lokal saqlash
  try {
    dbClient.completeExamSession(String(sessionId), {
      status: "COMPLETED",
      completed_at: Date.now(),
    }).catch(() => {});
  } catch {
    // ignore
  }

  return isOnlineSuccess;
}

export interface ReportExamResultParams {
  /** Real server session id (only when the exam was started on the server). */
  serverSessionId: number | null;
  /** Stable local session id (exam_sessions.local_id) → clientSessionId. */
  localSessionId: string;
  examType: OfflineExamType;
  targetId?: number | null;
  questions: ReadonlyArray<{ id: number }>;
  answers: IndexedAnswers;
  durationSeconds: number;
  completedAt?: number;
}

/**
 * Report a finished exam to the server.
 *  - real server session → /api/v2/exams/submit (unchanged);
 *  - locally graded exam → /api/v2/exams/record-offline through the outbox (idempotent).
 * Never throws; returns the transport used (or "skipped").
 */
export async function reportExamResult(
  params: ReportExamResultParams
): Promise<"submit" | "record-offline" | "skipped"> {
  const { serverSessionId, questions, answers } = params;
  if (!questions || questions.length === 0) return "skipped";

  if (serverSessionId && !isFakeLocalSessionId(serverSessionId)) {
    const list = questions.map((q, idx) => ({
      questionId: q.id,
      selectedOptionIndex: answers[idx]?.selected ?? null,
    }));
    await submitExamSession(serverSessionId, list).catch(() => false);
    return "submit";
  }

  const payload = buildRecordOfflinePayload({
    clientSessionId: params.localSessionId,
    examType: params.examType,
    targetId: params.targetId ?? null,
    durationSeconds: params.durationSeconds,
    completedAt: params.completedAt ?? Date.now(),
    questions,
    answers,
  });
  if (!isRecordablePayload(payload)) {
    console.info("[reportExamResult] Exam kept local-only (question count outside 1..200)");
    return "skipped";
  }
  try {
    await OutboxQueue.enqueue("RECORD_OFFLINE_EXAM", RECORD_OFFLINE_URL, "POST", payload);
  } catch (e) {
    console.error("OutboxQueue xatosi (record-offline):", e);
    return "skipped";
  }
  return "record-offline";
}

// ── DATA FETCHING APIS (OFFLINE-FIRST) ────────────────────────────────────────

export async function getExamQuestions(count = 20): Promise<OfflineQuestion[]> {
  // 1. LOCAL DATABASE FIRST (Primary Runtime Source of Truth)
  try {
    let localDbQuestions = await questionRepository.getRandomQuestions(count);
    if (!localDbQuestions || localDbQuestions.length === 0) {
      // Auto-seed if local database is empty
      await offlineDatasetManager.autoSeedIfEmpty();
      localDbQuestions = await questionRepository.getRandomQuestions(count);
    }
    if (localDbQuestions && localDbQuestions.length > 0) {
      activeExamSessionId = null; // graded locally → record-offline
      return localDbQuestions.map(dbQuestionToOfflineQuestion);
    }
  } catch (err) {
    console.warn("Lokal DB dan imtihon savollarini olishda xatolik:", err);
  }

  // If in OFFLINE mode, DO NOT attempt network fetch! Zero network requests rule.
  if (networkModeManager.isOfflineOnly()) {
    return [];
  }

  // 2. If Local DB is empty and online allowed, attempt on-demand fetch from backend
  if (navigator.onLine && networkModeManager.isOnlineAllowed()) {
    try {
      const res = await api.post<{
        data: { sessionId?: number; questions: any[] };
      }>("/api/v2/exams/marathon/start-visible", {
        questionCount: count,
        durationMinutes: durationMinutesFor("real", count),
      });
      if (res.data?.data?.sessionId) {
        activeExamSessionId = res.data.data.sessionId;
      }
      if (res.data?.data?.questions && res.data.data.questions.length > 0) {
        const questions = res.data.data.questions.map(normalizeQuestion);
        questionRepository.saveQuestions(questions.map((q) => offlineQuestionToDbQuestion(q))).catch(() => {});
        return questions;
      }
    } catch {
      try {
        const res2 = await api.post<{
          data: { sessionId?: number; questions: any[] };
        }>("/api/v2/exams/start-visible", {
          questionCount: count,
          durationMinutes: durationMinutesFor("real", count),
        });
        if (res2.data?.data?.sessionId) {
          activeExamSessionId = res2.data.data.sessionId;
        }
        if (res2.data?.data?.questions && res2.data.data.questions.length > 0) {
          const questions = res2.data.data.questions.map(normalizeQuestion);
          questionRepository.saveQuestions(questions.map((q) => offlineQuestionToDbQuestion(q))).catch(() => {});
          return questions;
        }
      } catch {
        // Backend unavailable
      }
    }
  }

  return [];
}

export async function getMarathonQuestions(topicId?: number, count = 100): Promise<OfflineQuestion[]> {
  const actualCount = count && count > 0 ? count : 1200;

  // 1. LOCAL DATABASE FIRST (Primary Runtime Source of Truth)
  try {
    let localDbQuestions = await questionRepository.getRandomQuestions(actualCount, topicId);
    if (!localDbQuestions || localDbQuestions.length === 0) {
      await offlineDatasetManager.autoSeedIfEmpty();
      localDbQuestions = await questionRepository.getRandomQuestions(actualCount, topicId);
    }
    if (localDbQuestions && localDbQuestions.length > 0) {
      activeMarathonSessionId = null; // graded locally → record-offline
      return localDbQuestions.map(dbQuestionToOfflineQuestion);
    }
  } catch (err) {
    console.warn("Lokal DB dan marafon savollarini olishda xatolik:", err);
  }

  // If in OFFLINE mode, DO NOT attempt network fetch! Zero network requests rule.
  if (networkModeManager.isOfflineOnly()) {
    return [];
  }

  // 2. If Local DB is empty and online allowed, attempt on-demand fetch from backend
  if (navigator.onLine && networkModeManager.isOnlineAllowed()) {
    try {
      const res = await api.post<{
        data: { sessionId?: number; questions: any[] };
      }>("/api/v2/exams/marathon/start-visible", {
        questionCount: actualCount,
        durationMinutes: durationMinutesFor("marathon", actualCount),
        topicId,
      });
      if (res.data?.data?.sessionId) {
        activeMarathonSessionId = res.data.data.sessionId;
      }
      if (res.data?.data?.questions && res.data.data.questions.length > 0) {
        const questions = res.data.data.questions.map(normalizeQuestion);
        questionRepository.saveQuestions(questions.map((q) => offlineQuestionToDbQuestion(q, null))).catch(() => {});
        return questions;
      }
    } catch (err: any) {
      console.warn("Marafon savollarini serverdan olishda xatolik:", err?.message || err);
    }
  }

  return [];
}

// ── OFFLINE CACHE HELPERS ───────────────────────────────────────────────────
const OFFLINE_CACHE_KEYS = {
  TOPICS: "prava_cache_topics_v1",
  TICKETS: "prava_cache_tickets_v1",
};


function getCachedData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded or private mode
  }
}


export async function getTickets(): Promise<OfflineTicket[]> {
  // 1. LOCAL DATABASE FIRST
  try {
    let dbTickets = await ticketRepository.getAllTickets();
    if (!dbTickets || dbTickets.length === 0) {
      await offlineDatasetManager.autoSeedIfEmpty();
      dbTickets = await ticketRepository.getAllTickets();
    }
    if (dbTickets && dbTickets.length > 0) {
      return dbTickets.map((t) => ({
        id: t.id,
        topic_id: t.topic_id ?? null,
        ticket_number: t.ticket_number,
        name_uzl: t.name_uzl || `${t.ticket_number}-bilet`,
        name_uzc: t.name_uzc || `${t.ticket_number}-билет`,
        name_en: t.name_en || `Ticket #${t.ticket_number}`,
        name_ru: t.name_ru || `Билет #${t.ticket_number}`,
        duration_minutes: t.duration_minutes || 20,
        passing_score: t.passing_score || 90,
        question_count: t.question_ids?.length || t.question_count || 20,
        is_blocked: false,
      }));
    }
  } catch {
    // ignore
  }

  // 2. Fetch from backend if online AND online allowed
  if (typeof navigator !== "undefined" && navigator.onLine && networkModeManager.isOnlineAllowed()) {
    try {
      const res = await api.get<{
        data: { content?: any[]; tickets?: any[] };
      }>("/api/v2/tickets?page=0&size=100&sortBy=ticketNumber&direction=ASC");
      const list = res.data?.data?.content || res.data?.data?.tickets || [];
      if (list.length > 0) {
        const tickets: OfflineTicket[] = list.map((tk: any) => ({
          id: tk.id,
          topic_id: tk.topicId ?? null,
          ticket_number: tk.ticketNumber ?? tk.number ?? tk.id,
          name_uzl: typeof tk.name === "object" ? tk.name?.uzl : (tk.name || `${tk.ticketNumber}-bilet`),
          name_uzc: typeof tk.name === "object" ? tk.name?.uzc : (tk.nameUzc || `${tk.ticketNumber}-билет`),
          name_en: typeof tk.name === "object" ? tk.name?.en : (tk.nameEn || `Ticket #${tk.ticketNumber}`),
          name_ru: typeof tk.name === "object" ? tk.name?.ru : (tk.nameRu || `Билет #${tk.ticketNumber}`),
          duration_minutes: tk.durationMinutes ?? 20,
          passing_score: tk.passingScore ?? 90,
          question_count: tk.questionCount ?? 20,
          is_blocked: tk.isBlocked ?? false,
        }));
        setCachedData(OFFLINE_CACHE_KEYS.TICKETS, tickets);
        ticketRepository.saveTickets(
          tickets.map((t) => ({
            id: t.id,
            ticket_number: t.ticket_number,
            question_count: t.question_count,
            updated_at: Date.now(),
          }))
        ).catch(() => {});
        return tickets;
      }
    } catch {
      // Backend unavailable
    }
  }

  const cached = getCachedData<OfflineTicket[]>(OFFLINE_CACHE_KEYS.TICKETS);
  if (cached && cached.length > 0) {
    return cached;
  }

  // Hech qaysi manbada bilet yo'q (birinchi ishga tushish + oflayn): soxta biletlar YASALMAYDI —
  // sahifa bo'sh holatni ko'rsatadi, sinxronizatsiyadan keyin haqiqiy biletlar paydo bo'ladi.
  return [];
}

/** Single ticket (official server id) — falls back to a synthetic ticket numbered like the id. */
export async function getTicketInfo(ticketId: number): Promise<OfflineTicket> {
  try {
    const list = await getTickets();
    const found = list.find((t) => t.id === ticketId);
    if (found) return found;
  } catch {
    // ignore
  }
  return {
    id: ticketId,
    topic_id: null,
    ticket_number: ticketId,
    name_uzl: `${ticketId}-bilet`,
    name_uzc: `${ticketId}-билет`,
    name_en: `Ticket #${ticketId}`,
    name_ru: `Билет #${ticketId}`,
    duration_minutes: 20,
    passing_score: 90,
    question_count: 20,
    is_blocked: false,
  };
}

export async function getQuestionsByTicket(ticketId: number): Promise<OfflineQuestion[]> {
  // 1. LOCAL DATABASE FIRST (Primary Runtime Source of Truth)
  try {
    let localDbQuestions = await questionRepository.getQuestionsByTicket(ticketId);
    if (!localDbQuestions || localDbQuestions.length === 0) {
      await offlineDatasetManager.autoSeedIfEmpty();
      localDbQuestions = await questionRepository.getQuestionsByTicket(ticketId);
    }
    if (localDbQuestions && localDbQuestions.length > 0) {
      activeTicketSessionId = null; // graded locally → record-offline
      return localDbQuestions.map(dbQuestionToOfflineQuestion);
    }
  } catch (err) {
    console.warn(`Lokal DB dan ${ticketId}-bilet savollarini olishda xatolik:`, err);
  }

  // If in OFFLINE mode, DO NOT attempt network fetch! Zero network requests rule.
  if (networkModeManager.isOfflineOnly()) {
    return [];
  }

  // 2. If Local DB is empty and online allowed, attempt on-demand fetch from backend
  if (navigator.onLine && networkModeManager.isOnlineAllowed()) {
    try {
      const res = await api.post<{
        data: { sessionId?: number; questions: any[] };
      }>("/api/v2/tickets/start-visible", { ticketId });
      if (res.data?.data?.sessionId) {
        activeTicketSessionId = res.data.data.sessionId;
      }
      if (res.data?.data?.questions && res.data.data.questions.length > 0) {
        const questions = res.data.data.questions.map(normalizeQuestion);
        questionRepository.saveQuestions(questions.map((q) => offlineQuestionToDbQuestion(q, ticketId))).catch(() => {});
        return questions;
      }
    } catch {
      try {
        const res2 = await api.post<{
          data: { sessionId?: number; questions: any[] };
        }>("/api/v2/tickets/start-secure", { ticketId });
        if (res2.data?.data?.sessionId) {
          activeTicketSessionId = res2.data.data.sessionId;
        }
        if (res2.data?.data?.questions && res2.data.data.questions.length > 0) {
          const questions = res2.data.data.questions.map(normalizeQuestion);
          questionRepository.saveQuestions(questions.map((q) => offlineQuestionToDbQuestion(q, ticketId))).catch(() => {});
          return questions;
        }
      } catch {
        // Backend unavailable
      }
    }
  }

  return [];
}

export async function getTopics(): Promise<OfflineTopic[]> {
  // 1. LOCAL DATABASE FIRST
  try {
    let dbTopics = await topicRepository.getAllTopics();
    if (!dbTopics || dbTopics.length === 0) {
      await offlineDatasetManager.autoSeedIfEmpty();
      dbTopics = await topicRepository.getAllTopics();
    }
    if (dbTopics && dbTopics.length > 0) {
      return dbTopics.map((tp) => ({
        id: tp.id,
        code: tp.code,
        name_uzl: tp.name_uzl,
        name_uzc: tp.name_uzc,
        name_en: tp.name_en || tp.name_uzl,
        name_ru: tp.name_ru,
        question_count: tp.question_count,
      }));
    }
  } catch {
    // ignore
  }

  // 2. Fetch from backend if online AND online allowed
  if (typeof navigator !== "undefined" && navigator.onLine && networkModeManager.isOnlineAllowed()) {
    try {
      let list: any[] = [];
      try {
        const res = await api.get<{ data: any[] }>("/api/v1/admin/topics/active");
        if (Array.isArray(res.data?.data)) {
          list = res.data.data;
        }
      } catch {
        try {
          const res2 = await api.get<{ data: any[] }>("/api/v1/admin/topics/with-questions");
          if (Array.isArray(res2.data?.data)) {
            list = res2.data.data;
          }
        } catch {
          const res3 = await api.get<{ data: any[] }>("/api/v1/admin/topics/simple");
          if (Array.isArray(res3.data?.data)) {
            list = res3.data.data;
          }
        }
      }

      if (list.length > 0) {
        const topics: OfflineTopic[] = list.map((tp: any) => ({
          id: tp.id,
          code: tp.code || null,
          name_uzl: typeof tp.name === "object" ? tp.name?.uzl : (tp.name || tp.nameUzl || ""),
          name_uzc: typeof tp.name === "object" ? tp.name?.uzc : (tp.nameUzc || ""),
          name_en: typeof tp.name === "object" ? tp.name?.en : (tp.nameEn || ""),
          name_ru: typeof tp.name === "object" ? tp.name?.ru : (tp.nameRu || ""),
          question_count: tp.questionCount ?? tp.questionsCount ?? 20,
        }));
        setCachedData(OFFLINE_CACHE_KEYS.TOPICS, topics);
        topicRepository.saveTopics(
          topics.map((tp) => ({
            id: tp.id,
            code: tp.code || `topic_${tp.id}`,
            name_uzl: tp.name_uzl,
            name_uzc: tp.name_uzc,
            name_ru: tp.name_ru,
            order_num: tp.id,
            question_count: tp.question_count,
            updated_at: Date.now(),
          }))
        ).catch(() => {});
        return topics;
      }
    } catch {
      // Backend unavailable
    }
  }

  const cached = getCachedData<OfflineTopic[]>(OFFLINE_CACHE_KEYS.TOPICS);
  if (cached && cached.length > 0) {
    return cached;
  }

  return [];
}

// ── STATS & STORAGE WRAPPERS ──────────────────────────────────────────────────

export async function getFullStats(_userId?: UserScopeId): Promise<FullStats> {
  const storedTicketStats = storageService.getTicketStats();

  // Try fetching live statistics from backend if online mode allowed
  let serverStats: any = null;
  if (networkModeManager.isOnlineAllowed()) {
    try {
      const res = await api.get("/api/v2/my-statistics");
      if (res.data?.data) {
        serverStats = res.data.data;
        setCachedData(statsCacheKey(), serverStats);
      }
    } catch {
      // Offline or unauthenticated fallback: load last cached statistics
      serverStats = getCachedData<any>(statsCacheKey());
    }
  } else {
    serverStats = getCachedData<any>(statsCacheKey());
  }

  // Rows come from the local tickets store (official ids + numbers): local stats are keyed by
  // ticket id since offline bundle v2, server stats by ticket number (see ticketReadiness.ts).
  let localTickets: ReadinessTicket[] = [];
  try {
    localTickets = await ticketRepository.getAllTickets();
  } catch {
    localTickets = [];
  }
  const ticketStats: TicketReadinessStat[] = buildTicketReadiness(
    localTickets.length > 0 ? localTickets : legacyTickets(),
    storedTicketStats,
    Array.isArray(serverStats?.ticketStats) ? serverStats.ticketStats : null
  );
  const totalTickets = ticketStats.length;

  const ticketReady = ticketStats.filter((t) => t.readiness === "ready").length;
  const ticketAverage = ticketStats.filter((t) => t.readiness === "average").length;
  const ticketNotReady = ticketStats.filter((t) => t.readiness === "not_ready").length;
  const ticketUntouched = ticketStats.filter((t) => t.readiness === "untouched").length;

  const attempts = storageService.getQuestionAttempts();
  const attemptKeys = Object.keys(attempts);
  let readyQ = 0;
  let averageQ = 0;
  let weakQ = 0;

  for (const qId of attemptKeys) {
    const att = attempts[Number(qId)];
    if (att && att.total > 0) {
      if (att.correct >= 5) readyQ++;
      else if (att.correct >= 3) averageQ++;
      else weakQ++; // Questions attempted with low or 0 correct count
    }
  }

  const totalQ = 1190;

  // If local questions attempts are empty, reflect questions answered on server
  if (readyQ + averageQ + weakQ === 0 && serverStats?.summary) {
    const correctAns = Number(serverStats.summary.correctAnswers || 0);
    const wrongAns = Number(serverStats.summary.wrongAnswers || 0);
    if (correctAns > 0 || wrongAns > 0) {
      readyQ = Math.min(Math.floor(correctAns * 0.4), Math.floor(totalQ * 0.7));
      averageQ = Math.min(Math.floor(correctAns * 0.6), totalQ - readyQ);
      weakQ = Math.min(wrongAns, totalQ - (readyQ + averageQ));
    }
  }

  const untouchedQ = Math.max(0, totalQ - (readyQ + averageQ + weakQ));

  return {
    ticket_stats: ticketStats,
    ticket_total: totalTickets,
    ticket_ready: ticketReady,
    ticket_average: ticketAverage,
    ticket_not_ready: ticketNotReady,
    ticket_untouched: ticketUntouched,
    question_readiness: {
      total: totalQ,
      ready: readyQ,
      average: averageQ,
      weak: weakQ,
      untouched: untouchedQ,
    },
    topic_readiness: [],
  };
}

export async function getQuestionStats(_userId?: UserScopeId): Promise<QuestionStatDetail[]> {
  const attempts = storageService.getQuestionAttempts();
  const wrongAnswers = storageService.getWrongAnswers();
  const savedQuestions = storageService.getSavedQuestions();

  const allMap = new Map<number, OfflineQuestion>();
  for (const w of wrongAnswers) allMap.set(w.question.id, fromStoredQuestion(w.question));
  for (const s of savedQuestions) allMap.set(s.question.id, fromStoredQuestion(s.question));

  const list: QuestionStatDetail[] = [];
  allMap.forEach((q) => {
    const att = attempts[q.id] || { correct: 0, total: 0 };
    let readiness: "ready" | "average" | "weak" | "untouched" = "untouched";
    if (att.total === 0) readiness = "untouched";
    else if (att.correct >= 5) readiness = "ready";
    else if (att.correct >= 3) readiness = "average";
    else readiness = "weak";

    list.push({
      question_id: q.id,
      order_num: q.order_num,
      text_uzl: q.text_uzl,
      text_uzc: q.text_uzc,
      text_en: q.text_en,
      text_ru: q.text_ru,
      topic_id: q.topic_id,
      topic_name_uzl: null,
      topic_name_uzc: null,
      topic_name_en: null,
      topic_name_ru: null,
      correct_count: att.correct,
      total_attempts: att.total,
      readiness,
    });
  });

  return list;
}

export async function getExamHistory(userId?: UserScopeId, _limit?: number): Promise<ExamResult[]> {
  if (networkModeManager.isOnlineAllowed()) {
    try {
      const res = await api.get<{ data: any }>("/api/v2/exams/history?page=0&size=50");
      const serverExams = res.data?.data?.content || res.data?.data?.recentExams;
      if (Array.isArray(serverExams) && serverExams.length > 0) {
        return serverExams.map((item: any) => ({
          id: item.sessionId || item.id,
          user_id: userId ?? GUEST_USER_KEY,
          score: item.score ?? Math.round(item.percentage ?? 0),
          total_questions: item.totalQuestions ?? 20,
          correct_answers: item.correctCount ?? item.correctAnswers ?? 0,
          duration_seconds: item.durationSeconds ?? 0,
          exam_type: item.examType || "EXAM",
          created_at: item.finishedAt || item.startedAt || item.createdAt || new Date().toISOString(),
        }));
      }
    } catch {
      // offline fallback
    }
  }

  const list = storageService.getExamHistory();
  return list.map((item) => ({
    id: item.id,
    user_id: userId ?? GUEST_USER_KEY,
    score: item.score,
    total_questions: item.totalQuestions,
    correct_answers: item.correctAnswers,
    duration_seconds: item.durationSeconds,
    exam_type: item.examType,
    created_at: item.createdAt,
  }));
}

export async function saveExamResult(params: {
  userId: UserScopeId;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  durationSeconds: number;
  examType: string;
}): Promise<ExamResult> {
  const res = storageService.saveExamResult({
    score: params.score,
    totalQuestions: params.totalQuestions,
    correctAnswers: params.correctAnswers,
    durationSeconds: params.durationSeconds,
    examType: params.examType,
  });

  // Local SQLite / IndexedDB session persistance
  dbClient
    .saveExamSession({
      local_id: String(res.id),
      server_id: null,
      exam_type: (params.examType as any) || "EXAM",
      status: "COMPLETED",
      total_questions: params.totalQuestions,
      correct_answers: params.correctAnswers,
      score: params.score,
      duration_seconds: params.durationSeconds,
      time_remaining_seconds: 0,
      started_at: Date.now() - params.durationSeconds * 1000,
      completed_at: Date.now(),
      answers_json: "{}",
      synced: 0,
    })
    .catch(() => {});

  return {
    id: res.id,
    user_id: params.userId,
    score: res.score,
    total_questions: res.totalQuestions,
    correct_answers: res.correctAnswers,
    duration_seconds: res.durationSeconds,
    exam_type: res.examType,
    created_at: res.createdAt,
  };
}

export async function addWrongAnswer(_userId: UserScopeId, question: OfflineQuestion | number): Promise<boolean> {
  const qId = typeof question === "number" ? question : question.id;
  if (typeof question !== "number") {
    storageService.addWrongAnswer(toStoredQuestion(question));
  }
  dbClient.recordWrongAnswer(qId).catch(() => {});
  try {
    await api.post(`/api/v1/app/wrong-answers/${qId}`);
  } catch {
    // Offline: enqueue into OutboxQueue for server sync
    OutboxQueue.enqueue("UPDATE_PROGRESS", `/api/v1/app/wrong-answers/${qId}`, "POST", { questionId: qId }).catch(() => {});
  }
  return true;
}

export async function getWrongAnswers(_userId?: UserScopeId): Promise<WrongAnswerEntry[]> {
  try {
    const res = await api.get<{ data: any[] }>("/api/v1/app/wrong-answers");
    if (res.data && Array.isArray(res.data.data)) {
      return res.data.data.map((item: any) => ({
        wrong_count: item.wrongCount || item.count || 1,
        last_seen: item.lastWrongAt || item.updatedAt || new Date().toISOString(),
        question: normalizeQuestion(item.question || item),
      }));
    }
  } catch {
    // Offline or network error fallback
  }

  const localList = storageService.getWrongAnswers();
  const attempts = storageService.getQuestionAttempts();
  const totalAttempts = Object.values(attempts).reduce((sum, a) => sum + (a.total || 0), 0);

  // If user has never answered any question, mistakes cannot exist
  if (totalAttempts === 0) {
    return [];
  }

  return localList.map((w) => ({
    wrong_count: w.wrongCount || 1,
    last_seen: w.date,
    question: fromStoredQuestion(w.question),
  }));
}

export async function removeWrongAnswer(_userId: UserScopeId, questionId: number): Promise<boolean> {
  storageService.removeWrongAnswer(questionId);
  try {
    await api.delete(`/api/v1/app/wrong-answers/${questionId}`);
  } catch {
    // Offline: enqueue into OutboxQueue for server sync
    OutboxQueue.enqueue("UPDATE_PROGRESS", `/api/v1/app/wrong-answers/${questionId}`, "DELETE", { questionId }).catch(() => {});
  }
  return true;
}

const toggleLocks = new Set<number>();

export async function toggleSavedQuestion(_userId: UserScopeId, question: OfflineQuestion | number): Promise<boolean> {
  const qId = typeof question === "number" ? question : question.id;
  if (toggleLocks.has(qId)) {
    return storageService.getSavedQuestions().some((s) => s.question.id === qId);
  }
  toggleLocks.add(qId);
  setTimeout(() => toggleLocks.delete(qId), 300);

  let saved = false;
  if (typeof question === "number") {
    storageService.removeSavedQuestion(question);
    saved = false;
  } else {
    saved = storageService.toggleSavedQuestion(toStoredQuestion(question));
  }

  // Persist bookmark state to SQLite / IndexedDB
  dbClient.setQuestionSaved(qId, saved).catch(() => {});

  try {
    if (saved) {
      await api.post(`/api/v1/app/saved-questions/${qId}`);
    } else {
      await api.delete(`/api/v1/app/saved-questions/${qId}`);
    }
  } catch {
    // Offline mutation -> enqueue into OutboxQueue for automatic background sync
    try {
      await OutboxQueue.enqueue(
        saved ? "SAVE_QUESTION" : "UNSAVE_QUESTION",
        `/api/v1/app/saved-questions/${qId}`,
        saved ? "POST" : "DELETE",
        { questionId: qId }
      );
    } catch (e) {
      console.error("Outbox enqueue error for saved question:", e);
    }
  }
  return saved;
}

export async function getSavedQuestions(_userId?: UserScopeId): Promise<SavedQuestionEntry[]> {
  const localList = storageService.getSavedQuestions();
  try {
    const res = await api.get<{ data: any[] }>("/api/v1/app/saved-questions");
    if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      return res.data.data.map((item: any) => ({
        saved_at: item.savedAt || item.createdAt || new Date().toISOString(),
        question: normalizeQuestion(item.question || item),
      }));
    }
  } catch {
    // fallback
  }

  if (localList.length > 0) {
    return localList.map((s) => ({
      saved_at: s.date,
      question: fromStoredQuestion(s.question),
    }));
  }

  // Check dbClient active saved questions
  try {
    const savedIds = await dbClient.getActiveSavedQuestions();
    if (savedIds.length > 0) {
      const allQ = await dbClient.getAllQuestions();
      const qMap = new Map(allQ.map((q) => [q.id, q]));
      const entries: SavedQuestionEntry[] = [];
      for (const id of savedIds) {
        const q = qMap.get(id);
        if (q) {
          entries.push({
            saved_at: new Date().toISOString(),
            question: dbQuestionToOfflineQuestion(q),
          });
        }
      }
      return entries;
    }
  } catch {
    // ignore
  }

  return [];
}

export async function saveTicketStat(
  _userId: UserScopeId,
  ticketId: number,
  durationSeconds: number,
  correctCount: number,
  score: number,
  passed: boolean
): Promise<boolean> {
  storageService.saveTicketStat(ticketId, durationSeconds, correctCount, score, passed);

  // Local SQLite / IndexedDB user progress persistence
  dbClient
    .saveUserProgress({
      progress_key: `ticket_${ticketId}`,
      progress_type: "TICKET",
      total_items: 20,
      completed_items: 20,
      correct_count: correctCount,
      best_score: score,
      passed: passed ? 1 : 0,
      updated_at: Date.now(),
    })
    .catch(() => {});

  return true;
}

export async function getTicketStats(_userId?: UserScopeId) {
  const map = storageService.getTicketStats();
  return Object.values(map).map((s) => ({
    ticket_id: s.ticketId,
    times_done: s.timesDone,
    times_passed: s.timesPassed,
    total_seconds: s.lastDuration,
    best_correct: s.bestCorrect,
    last_score: s.lastScore,
    last_done_at: null,
  }));
}

export async function recordQuestionAttempt(
  _userId: UserScopeId,
  questionId: number,
  isCorrect: boolean,
  _source: string
): Promise<boolean> {
  storageService.recordQuestionAttempt(questionId, isCorrect);
  return true;
}

export async function resetAllStats(_userId?: UserScopeId): Promise<void> {
  storageService.resetAllStats();
}
