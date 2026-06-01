import { getAccessToken, saveTokens, clearTokens, getRefreshToken } from "./auth";
import type {
  AuthResponse, TopicResponse, QuestionResponse,
  ExamResponse, ExamResultResponse, SubmitAnswerRequest,
  TicketResponse, ComprehensiveStatisticsResponse,
  WrongAnswerResponse, SavedQuestionResponse, PackageResponse,
} from "./types";
import {
  localAddWrong, localGetWrongs, localRemoveWrong,
  localToggleSaved, localGetSaved, localIsSaved,
} from "./localStore";

// ─── Config ───────────────────────────────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ─── Base HTTP fetch ──────────────────────────────────────────────────────────
async function http<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": localStorage.getItem("prava_lang") || "uzl",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Token muddati tugagan → refresh qilib qaytadan urinish
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return http<T>(path, options, false);
    clearTokens();
    window.location.reload();
    throw new Error("Session muddati tugadi");
  }

  // JSON body parse (HTML/bo'sh javob bo'lsa ham crash qilmasin)
  let json: Record<string, unknown> | null = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response (HTML error page, empty body)
  }

  if (!res.ok) {
    const msg = json?.message;
    throw new Error(typeof msg === "string" ? msg : `HTTP ${res.status}`);
  }

  // Backend: { success: true, data: T }  yoki to'g'ridan-to'g'ri T
  return (json?.data ?? json) as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const data: AuthResponse = json.data ?? json;
    saveTokens(data.accessToken, data.refreshToken, data.user);
    return true;
  } catch {
    return false;
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function login(identifier: string, password: string): Promise<AuthResponse> {
  return http<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export async function register(
  firstName: string,
  phoneNumber: string,
  password: string,
  lastName?: string
): Promise<AuthResponse> {
  await http("/api/v1/auth/register/init", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, verificationType: "SMS" }),
  });
  return http<AuthResponse>("/api/v1/auth/register/complete", {
    method: "POST",
    body: JSON.stringify({
      firstName,
      lastName: lastName || undefined,
      phoneNumber,
      password,
      verificationType: "SMS",
      verificationCode: "0000",
    }),
  });
}

export async function logout(): Promise<void> {
  const rt = getRefreshToken();
  try {
    await http("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: rt || "" }),
    });
  } finally {
    clearTokens();
  }
}

export async function getMe(): Promise<AuthResponse["user"]> {
  return http<AuthResponse["user"]>("/api/v1/auth/me");
}

// ─── TOPICS ───────────────────────────────────────────────────────────────────
// /api/v1/app/topics 403 qaytarsa, v2 va v1 alternativlarini sinab ko'ramiz

export async function getTopics(): Promise<TopicResponse[]> {
  // 1-urinish: bir nechta API yo'llari
  const paths = [
    "/api/v1/app/topics",
    "/api/v2/topics",
    "/api/v1/topics",
  ];
  for (const path of paths) {
    try {
      const res = await http<unknown>(path);
      if (Array.isArray(res) && res.length > 0) return res as TopicResponse[];
      if (res && typeof res === "object" && !Array.isArray(res)) {
        const content = (res as { content?: TopicResponse[] }).content;
        if (Array.isArray(content) && content.length > 0) return content;
      }
    } catch { /* keyingi yo'lni sinab ko'r */ }
  }
  // 2-urinish: statistikadan mavzularni olish (GET /api/v2/my-statistics ishlaydi)
  try {
    const stats = await getMyStats();
    const ts = stats?.topicStats;
    if (Array.isArray(ts) && ts.length > 0) {
      return ts
        .filter((t) => t.topicId != null)
        .map((t) => ({
          id:       t.topicId!,
          nameUzl:  t.topicName?.uzl,
          nameUzc:  t.topicName?.uzc,
          nameRu:   t.topicName?.ru,
          nameEn:   t.topicName?.en,
          code:     t.topicCode,
        } as TopicResponse));
    }
  } catch {}
  return [];
}

export async function getQuestionsByTopic(topicId: number): Promise<QuestionResponse[]> {
  try {
    const res = await http<unknown>(`/api/v1/app/topics/${topicId}/questions`);
    if (Array.isArray(res)) return res as QuestionResponse[];
  } catch {}
  try {
    const res = await http<unknown>(`/api/v2/topics/${topicId}/questions`);
    if (Array.isArray(res)) return res as QuestionResponse[];
  } catch {}
  return [];
}

// ─── PACKAGES ─────────────────────────────────────────────────────────────────

export async function getPackages(): Promise<PackageResponse[]> {
  const res = await http<{ content?: PackageResponse[] } | PackageResponse[]>("/api/v1/packages");
  if (Array.isArray(res)) return res.filter((p) => p.isActive !== false);
  const content = (res as { content?: PackageResponse[] }).content ?? [];
  return content.filter((p) => p.isActive !== false);
}

// ─── EXAM ─────────────────────────────────────────────────────────────────────

export async function startExam(packageId: number): Promise<ExamResponse> {
  return http<ExamResponse>("/api/v2/exams/start-visible", {
    method: "POST",
    body: JSON.stringify({ packageId }),
  });
}

export async function startMarathon(topicId?: number, questionCount = 20): Promise<ExamResponse> {
  return http<ExamResponse>("/api/v2/exams/marathon/start-visible", {
    method: "POST",
    body: JSON.stringify({ topicId: topicId ?? null, questionCount }),
  });
}

export async function submitExam(req: SubmitAnswerRequest): Promise<ExamResultResponse> {
  return http<ExamResultResponse>("/api/v2/exams/submit", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getExamHistory(page = 0, size = 20) {
  return http(`/api/v2/exams/history?page=${page}&size=${size}`);
}

// ─── TICKETS ──────────────────────────────────────────────────────────────────

export async function getTickets(): Promise<TicketResponse[]> {
  const res = await http<{ content?: TicketResponse[] } | TicketResponse[]>(
    "/api/v2/tickets?page=0&size=200&sort=ticketNumber,asc"
  );
  if (Array.isArray(res)) return res;
  return (res as { content?: TicketResponse[] }).content ?? [];
}

export async function startTicketExam(ticketId: number): Promise<ExamResponse> {
  return http<ExamResponse>("/api/v2/tickets/start-visible", {
    method: "POST",
    body: JSON.stringify({ ticketId }),
  });
}

// ─── STATISTICS ───────────────────────────────────────────────────────────────

export async function getMyStats(): Promise<ComprehensiveStatisticsResponse> {
  return http<ComprehensiveStatisticsResponse>("/api/v2/my-statistics");
}

// ─── WRONG ANSWERS ────────────────────────────────────────────────────────────
// localStorage BIRINCHI (har doim ishlaydi), API esa sinxronlash uchun.

export async function addWrongAnswer(
  questionId: number,
  question?: QuestionResponse
): Promise<void> {
  // 1) Mahalliy xotirada saqla — har doim ishlaydi
  if (question) localAddWrong(question);
  // 2) API ga yuborish (403 bo'lsa ovoz chiqarmay o'tkazib yuboramiz)
  http(`/api/v1/app/wrong-answers/${questionId}`, { method: "POST" }).catch(() => {});
}

export async function getWrongAnswers(): Promise<WrongAnswerResponse[]> {
  // API dan sinab ko'r, bo'lmasa localStorage
  try {
    const res = await http<unknown>("/api/v1/app/wrong-answers");
    if (Array.isArray(res) && res.length > 0) return res as WrongAnswerResponse[];
  } catch {}
  return localGetWrongs();
}

export async function removeWrongAnswer(questionId: number): Promise<void> {
  localRemoveWrong(questionId); // mahalliy o'chirish
  http(`/api/v1/app/wrong-answers/${questionId}`, { method: "DELETE" }).catch(() => {});
}

// ─── SAVED QUESTIONS ──────────────────────────────────────────────────────────
// localStorage BIRINCHI, API esa sinxronlash uchun.

export async function toggleSavedQuestion(
  questionId: number,
  question?: QuestionResponse
): Promise<boolean> {
  // 1) Mahalliy xotirada toggle
  const isNowSaved = localToggleSaved(questionId, question);
  // 2) API ga yuborish (403 bo'lsa o'tkazib yuboramiz)
  http<boolean>(`/api/v1/app/saved-questions/${questionId}`, { method: "POST" }).catch(() => {});
  return isNowSaved;
}

export async function getSavedQuestions(): Promise<SavedQuestionResponse[]> {
  // API dan sinab ko'r, bo'lmasa localStorage
  try {
    const res = await http<unknown>("/api/v1/app/saved-questions");
    if (Array.isArray(res) && res.length > 0) return res as SavedQuestionResponse[];
  } catch {}
  return localGetSaved();
}

export async function isQuestionSaved(questionId: number): Promise<boolean> {
  return localIsSaved(questionId);
}
