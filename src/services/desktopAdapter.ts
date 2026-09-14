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

// ── ACTIVE SESSION TRACKING ───────────────────────────────────────────────────
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
  try {
    await api.post("/api/v2/exams/submit", {
      sessionId,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionIndex: a.selectedOptionIndex != null ? a.selectedOptionIndex : null,
        timeSpentSeconds: a.timeSpentSeconds || 0,
      })),
    });
    window.dispatchEvent(new Event("prava-storage-changed"));
    return true;
  } catch (err) {
    console.warn("Failed to submit exam session to backend:", err);
    return false;
  }
}

// ── DATA FETCHING APIS ────────────────────────────────────────────────────────

export async function getExamQuestions(count = 20): Promise<OfflineQuestion[]> {
  try {
    const res = await api.post<{
      data: { sessionId?: number; questions: any[] };
    }>("/api/v2/exams/marathon/start-visible", {
      questionCount: count,
      durationMinutes: count,
    });
    if (res.data?.data?.sessionId) {
      activeExamSessionId = res.data.data.sessionId;
    }
    if (res.data?.data?.questions && res.data.data.questions.length > 0) {
      return res.data.data.questions.map(normalizeQuestion);
    }
  } catch {
    // fallback to start-visible
    try {
      const res2 = await api.post<{
        data: { sessionId?: number; questions: any[] };
      }>("/api/v2/exams/start-visible", {
        questionCount: count,
        durationMinutes: count,
      });
      if (res2.data?.data?.sessionId) {
        activeExamSessionId = res2.data.data.sessionId;
      }
      if (res2.data?.data?.questions && res2.data.data.questions.length > 0) {
        return res2.data.data.questions.map(normalizeQuestion);
      }
    } catch {
      // ignore
    }
  }
  return [];
}

export async function getMarathonQuestions(topicId?: number, count = 100): Promise<OfflineQuestion[]> {
  const actualCount = count && count > 0 ? count : 1190;
  try {
    const res = await api.post<{
      data: { sessionId?: number; questions: any[] };
    }>("/api/v2/exams/marathon/start-visible", {
      questionCount: actualCount,
      durationMinutes: actualCount,
      topicId,
    });
    if (res.data?.data?.sessionId) {
      activeMarathonSessionId = res.data.data.sessionId;
    }
    if (res.data?.data?.questions) {
      return res.data.data.questions.map(normalizeQuestion);
    }
  } catch (err: any) {
    console.warn("getMarathonQuestions error:", err?.response?.data || err?.message || err);
  }
  return [];
}

export async function getTickets(): Promise<OfflineTicket[]> {
  try {
    const res = await api.get<{
      data: { content?: any[]; tickets?: any[] };
    }>("/api/v2/tickets?page=0&size=100&sortBy=ticketNumber&direction=ASC");
    const list = res.data?.data?.content || res.data?.data?.tickets || [];
    if (list.length > 0) {
      return list.map((tk: any) => ({
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
    }
  } catch {
    // fallback: 70 tickets
  }

  // Standalone fallback: 60 bilet
  const fallbackTickets: OfflineTicket[] = [];
  for (let i = 1; i <= 60; i++) {
    fallbackTickets.push({
      id: i,
      topic_id: null,
      ticket_number: i,
      name_uzl: `${i}-bilet`,
      name_uzc: `${i}-билет`,
      name_en: `Ticket #${i}`,
      name_ru: `Билет #${i}`,
      duration_minutes: 20,
      passing_score: 90,
      question_count: 20,
      is_blocked: false,
    });
  }
  return fallbackTickets;
}

export async function getQuestionsByTicket(ticketId: number): Promise<OfflineQuestion[]> {
  try {
    const res = await api.post<{
      data: { sessionId?: number; questions: any[] };
    }>("/api/v2/tickets/start-visible", { ticketId });
    if (res.data?.data?.sessionId) {
      activeTicketSessionId = res.data.data.sessionId;
    }
    if (res.data?.data?.questions) {
      return res.data.data.questions.map(normalizeQuestion);
    }
  } catch {
    // fallback
  }
  return [];
}

export async function getTopics(): Promise<OfflineTopic[]> {
  try {
    const res = await api.get<{
      data: any[];
    }>("/api/v1/admin/topics/active");
    if (Array.isArray(res.data?.data)) {
      return res.data.data.map((tp: any) => ({
        id: tp.id,
        code: tp.code || null,
        name_uzl: typeof tp.name === "object" ? tp.name?.uzl : (tp.name || tp.nameUzl || ""),
        name_uzc: typeof tp.name === "object" ? tp.name?.uzc : (tp.nameUzc || ""),
        name_en: typeof tp.name === "object" ? tp.name?.en : (tp.nameEn || ""),
        name_ru: typeof tp.name === "object" ? tp.name?.ru : (tp.nameRu || ""),
        question_count: tp.questionCount ?? tp.questionsCount ?? 20,
      }));
    }
  } catch {
    // fallback
  }
  return [];
}

// ── STATS & STORAGE WRAPPERS ──────────────────────────────────────────────────

export async function getFullStats(_userId?: number): Promise<FullStats> {
  const storedTicketStats = storageService.getTicketStats();
  const ticketStats: TicketReadinessStat[] = [];
  const totalTickets = 60;

  // Try fetching live statistics from backend
  let serverStats: any = null;
  try {
    const res = await api.get("/api/v2/my-statistics");
    if (res.data?.data) {
      serverStats = res.data.data;
    }
  } catch {
    // Offline or unauthenticated fallback
  }

  const serverTicketMap = new Map<number, any>();
  if (serverStats?.ticketStats && Array.isArray(serverStats.ticketStats)) {
    for (const item of serverStats.ticketStats) {
      if (item.ticketNumber) {
        serverTicketMap.set(item.ticketNumber, item);
      }
    }
  }

  for (let num = 1; num <= totalTickets; num++) {
    const stat = storedTicketStats[num];
    const serverTk = serverTicketMap.get(num);

    const localTimesDone = stat?.timesDone || 0;
    const serverTimesDone = Number(serverTk?.totalExams || 0);
    const timesDone = Math.max(localTimesDone, serverTimesDone);

    const localPassed = stat?.timesPassed || 0;
    const serverPassed = Number(serverTk?.passedExams || 0);
    const midGood = Math.max(localPassed, serverPassed);

    const fastPerfect = stat?.fastPerfectCount || (serverTk?.bestScore === 100 ? 1 : 0);
    const slowPoor = Math.max(0, timesDone - midGood);
    const lastScore = stat?.lastScore ?? (serverTk?.bestScore ?? null);
    const lastDuration = stat?.lastDuration ?? null;

    let readiness: "ready" | "average" | "not_ready" | "untouched" = "untouched";
    if (timesDone === 0) {
      readiness = "untouched";
    } else if (
      midGood >= 1 ||
      fastPerfect >= 1 ||
      (lastScore != null && lastScore >= 90) ||
      (serverTk?.bestScore != null && serverTk.bestScore >= 90)
    ) {
      readiness = "ready";
    } else if (
      (lastScore != null && lastScore >= 70) ||
      (serverTk?.averageScore != null && serverTk.averageScore >= 70)
    ) {
      readiness = "average";
    } else {
      readiness = "not_ready";
    }

    ticketStats.push({
      ticket_id: num,
      ticket_number: num,
      name_uzl: `${num}-bilet`,
      name_uzc: `${num}-билет`,
      name_en: `Ticket #${num}`,
      name_ru: `Билет #${num}`,
      times_done: timesDone,
      fast_perfect_count: fastPerfect,
      mid_good_count: midGood,
      slow_poor_count: slowPoor,
      last_score: lastScore,
      last_duration: lastDuration,
      readiness,
    });
  }

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

export async function getQuestionStats(_userId?: number): Promise<QuestionStatDetail[]> {
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

export async function getExamHistory(userId?: number, _limit?: number): Promise<ExamResult[]> {
  try {
    const res = await api.get<{ data: any }>("/api/v2/exams/history?page=0&size=50");
    const serverExams = res.data?.data?.content || res.data?.data?.recentExams;
    if (Array.isArray(serverExams) && serverExams.length > 0) {
      return serverExams.map((item: any) => ({
        id: item.sessionId || item.id,
        user_id: userId ?? 1,
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

  const list = storageService.getExamHistory();
  return list.map((item) => ({
    id: item.id,
    user_id: userId ?? 1,
    score: item.score,
    total_questions: item.totalQuestions,
    correct_answers: item.correctAnswers,
    duration_seconds: item.durationSeconds,
    exam_type: item.examType,
    created_at: item.createdAt,
  }));
}

export async function saveExamResult(params: {
  userId: number;
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

export async function addWrongAnswer(_userId: number, question: OfflineQuestion | number): Promise<boolean> {
  const qId = typeof question === "number" ? question : question.id;
  if (typeof question !== "number") {
    storageService.addWrongAnswer(toStoredQuestion(question));
  }
  try {
    await api.post(`/api/v1/app/wrong-answers/${qId}`);
  } catch {
    // offline
  }
  return true;
}

export async function getWrongAnswers(_userId?: number): Promise<WrongAnswerEntry[]> {
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

export async function removeWrongAnswer(_userId: number, questionId: number): Promise<boolean> {
  storageService.removeWrongAnswer(questionId);
  try {
    await api.delete(`/api/v1/app/wrong-answers/${questionId}`);
  } catch {
    // offline
  }
  return true;
}

export async function toggleSavedQuestion(_userId: number, question: OfflineQuestion | number): Promise<boolean> {
  const qId = typeof question === "number" ? question : question.id;
  let saved = false;
  if (typeof question === "number") {
    storageService.removeSavedQuestion(question);
    saved = false;
  } else {
    saved = storageService.toggleSavedQuestion(toStoredQuestion(question));
  }
  try {
    await api.post(`/api/v1/app/saved-questions/${qId}`);
  } catch {
    // offline
  }
  return saved;
}

export async function getSavedQuestions(_userId?: number): Promise<SavedQuestionEntry[]> {
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

  return localList.map((s) => ({
    saved_at: s.date,
    question: fromStoredQuestion(s.question),
  }));
}

export async function saveTicketStat(
  _userId: number,
  ticketId: number,
  durationSeconds: number,
  correctCount: number,
  score: number,
  passed: boolean
): Promise<boolean> {
  storageService.saveTicketStat(ticketId, durationSeconds, correctCount, score, passed);
  return true;
}

export async function getTicketStats(_userId?: number) {
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
  _userId: number,
  questionId: number,
  isCorrect: boolean,
  _source: string
): Promise<boolean> {
  storageService.recordQuestionAttempt(questionId, isCorrect);
  return true;
}

export async function resetAllStats(_userId?: number): Promise<void> {
  storageService.resetAllStats();
}
