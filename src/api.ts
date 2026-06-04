import { invoke } from "@tauri-apps/api/core";
import { getAccessToken, saveTokens, clearTokens, getRefreshToken } from "./auth";
import type {
  LicenseStatus,
  AuthResponse, TopicResponse, QuestionResponse,
  ExamResponse, ExamResultResponse, SubmitAnswerRequest,
  TicketResponse, ComprehensiveStatisticsResponse,
  WrongAnswerResponse, SavedQuestionResponse, PackageResponse,
} from "./types";
import {
  localAddWrong, localGetWrongs, localRemoveWrong,
  localToggleSaved, localGetSaved, localIsSaved,
} from "./localStore";

// ─── LICENSE (Tauri commands) ─────────────────────────────────────────────────

export const getMachineId = (): Promise<string> =>
  invoke("get_machine_id_cmd");

export const activateLicense = (licenseKey: string): Promise<LicenseStatus> =>
  invoke("activate_license", { licenseKey });

export const checkLicense = (): Promise<LicenseStatus> =>
  invoke("check_license");

// ─── Config ───────────────────────────────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ─── In-memory cache (with sessionStorage persistence) ────────────────────────
type CacheEntry<T> = { data: T; ts: number };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 daqiqa
const memCache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const m = memCache.get(key) as CacheEntry<T> | undefined;
  if (m && Date.now() - m.ts < CACHE_TTL_MS) return m.data;
  try {
    const raw = sessionStorage.getItem(`prava_cache_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.ts < CACHE_TTL_MS) {
      memCache.set(key, parsed as CacheEntry<unknown>);
      return parsed.data;
    }
  } catch { /* corrupt cache, ignore */ }
  return null;
}

function cacheSet<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, ts: Date.now() };
  memCache.set(key, entry as CacheEntry<unknown>);
  try { sessionStorage.setItem(`prava_cache_${key}`, JSON.stringify(entry)); } catch { /* quota */ }
}

export function clearCache(): void {
  memCache.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("prava_cache_"))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}

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
    "X-Platform": "desktop",
    "X-Licensed": "true",
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
    throw new Error("session_expired");
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
  lastName?: string,
  verificationCode = "777777"
): Promise<AuthResponse> {
  // prava-test bilan bir xil payload (email + phoneNumber, biri null bo'lishi mumkin)
  const payload = {
    firstName,
    lastName: lastName || "",
    email: null as string | null,
    phoneNumber,
    password,
    verificationType: "SMS",
  };

  // Init — SMS yuborilmasa ham davom etamiz (test rejimida 777777 ishlatamiz)
  try {
    await http("/api/v1/auth/register/init", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // SMS xato bo'lsa ham davom etamiz
  }

  // Backend `code`ni @RequestParam sifatida kutadi — query param sifatida yuboramiz
  const code = encodeURIComponent(verificationCode);
  return http<AuthResponse>(`/api/v1/auth/register/complete?code=${code}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── PASSWORD RESET ──────────────────────────────────────────────────────────
// Step 1: SMS/email orqali kod yuborish
export async function forgotPassword(identifier: string): Promise<void> {
  await http("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ identifier, verificationType: "SMS" }),
  });
}

// Step 2: kod + yangi parol bilan tiklash
export async function resetPassword(
  recipient: string,
  code: string,
  newPassword: string
): Promise<void> {
  await http("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      recipient,
      code,
      newPassword,
      verificationType: "SMS",
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

export async function getTopics(opts?: { force?: boolean }): Promise<TopicResponse[]> {
  if (!opts?.force) {
    const c = cacheGet<TopicResponse[]>("topics");
    if (c) return c;
  }
  // 1-urinish: bir nechta API yo'llari
  const paths = [
    "/api/v1/app/topics",
    "/api/v2/topics",
    "/api/v1/topics",
  ];
  for (const path of paths) {
    try {
      const res = await http<unknown>(path);
      if (Array.isArray(res) && res.length > 0) {
        cacheSet("topics", res);
        return res as TopicResponse[];
      }
      if (res && typeof res === "object" && !Array.isArray(res)) {
        const content = (res as { content?: TopicResponse[] }).content;
        if (Array.isArray(content) && content.length > 0) {
          cacheSet("topics", content);
          return content;
        }
      }
    } catch { /* keyingi yo'lni sinab ko'r */ }
  }
  // 2-urinish: statistikadan mavzularni olish (GET /api/v2/my-statistics ishlaydi)
  try {
    const stats = await getMyStats();
    const ts = stats?.topicStats;
    if (Array.isArray(ts) && ts.length > 0) {
      const mapped = ts
        .filter((t) => t.topicId != null)
        .map((t) => ({
          id:       t.topicId!,
          nameUzl:  t.topicName?.uzl,
          nameUzc:  t.topicName?.uzc,
          nameRu:   t.topicName?.ru,
          nameEn:   t.topicName?.en,
          code:     t.topicCode,
        } as TopicResponse));
      cacheSet("topics", mapped);
      return mapped;
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

export async function getPackages(opts?: { force?: boolean }): Promise<PackageResponse[]> {
  if (!opts?.force) {
    const c = cacheGet<PackageResponse[]>("packages");
    if (c) return c;
  }
  // Bir nechta bo'lishi mumkin bo'lgan yo'llarni ketma-ket sinab ko'ramiz
  const paths = [
    "/api/v1/packages",
    "/api/v1/app/packages",
    "/api/v2/packages",
  ];
  let last: PackageResponse[] = [];
  for (const path of paths) {
    try {
      const res = await http<{ content?: PackageResponse[] } | PackageResponse[]>(path);
      const list = Array.isArray(res) ? res : (res?.content ?? []);
      const filtered = list.filter((p) => p.isActive !== false);
      if (filtered.length > 0) {
        cacheSet("packages", filtered);
        return filtered;
      }
      last = filtered;
    } catch { /* keyingi yo'l */ }
  }
  return last;
}

// ─── EXAM ─────────────────────────────────────────────────────────────────────

export async function startExam(packageId: number): Promise<ExamResponse> {
  return http<ExamResponse>("/api/v2/exams/start-visible", {
    method: "POST",
    body: JSON.stringify({ packageId }),
  });
}

/**
 * "Real Imtihon" — prava-test bilan bir xil:
 * /api/v2/exams/marathon/start-visible + {questionCount, durationMinutes}
 * Paket tanlash kerak emas; defaultlar: 20 ta savol / 20 daqiqa.
 */
export async function startRealExam(
  questionCount = 20,
  durationMinutes = 20
): Promise<ExamResponse> {
  return http<ExamResponse>("/api/v2/exams/marathon/start-visible", {
    method: "POST",
    body: JSON.stringify({ questionCount, durationMinutes }),
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

export async function getTickets(opts?: { force?: boolean }): Promise<TicketResponse[]> {
  if (!opts?.force) {
    const c = cacheGet<TicketResponse[]>("tickets");
    if (c) return c;
  }
  const res = await http<{ content?: TicketResponse[] } | TicketResponse[]>(
    "/api/v2/tickets?page=0&size=200&sort=ticketNumber,asc"
  );
  const list = Array.isArray(res) ? res : (res?.content ?? []);
  if (list.length > 0) cacheSet("tickets", list);
  return list;
}

// ─── PREFETCH (app start uchun parallel) ──────────────────────────────────────
/**
 * Foydalanuvchi tizimga kirgandan keyin barcha asosiy ma'lumotlarni
 * parallel ravishda oldindan yuklab kesh'ga joylaydi. Natijada keyingi
 * ekranlar bir zumda ochiladi.
 */
export async function prefetchAll(): Promise<void> {
  await Promise.allSettled([
    getTopics(),
    getTickets(),
    getPackages(),
    getMyStats().then((s) => s && cacheSet("stats", s)),
  ]);
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
