import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import { authCookieOptions } from "../auth/tokenCookies";
import { ENV } from "../config/env";
import i18n from "../utils/i18n";
import { networkModeManager } from "../sync/networkModeManager";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_DATA_KEY = "userData";

// Refresh so'rovi uchun alohida instance (interceptor loop'dan qochish)
const refreshClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

const api: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Decode JWT payload using atob (no external library needed).
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Check if access token expires within the next 5 minutes.
 */
function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const expiresAt = payload.exp * 1000;
  const fiveMinutes = 5 * 60 * 1000;
  return expiresAt - Date.now() < fiveMinutes;
}

/**
 * Persist freshly issued tokens to cookies.
 */
function storeTokens(newAccessToken: string, newRefreshToken?: string): void {
  // Explicit attributes (path=/, sameSite=strict, secure only on https). NOTE: on
  // http://tauri.localhost these are NOT HttpOnly/Secure — see src/auth/tokenCookies.ts
  // for the limitation and the planned keychain migration (audit P2-D1).
  Cookies.set(ACCESS_TOKEN_KEY, newAccessToken, authCookieOptions("access"));
  if (newRefreshToken) {
    Cookies.set(REFRESH_TOKEN_KEY, newRefreshToken, authCookieOptions("refresh"));
  }
  // Extend userData cookie expiry to match access token
  const existingUserData = Cookies.get(USER_DATA_KEY);
  if (existingUserData) {
    Cookies.set(USER_DATA_KEY, existingUserData, authCookieOptions("userData"));
  }
}

/*
 * Refresh token logikasi (P1-W1).
 *
 * Bitta umumiy `refreshPromise`: proactive (request interceptor) va reactive
 * (401 response interceptor) yo'llari AYNAN bitta promise'ni kutadi. Shu
 * sababli hech bir so'rov "navbatda" abadiy osilib qolmaydi.
 */
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  window.dispatchEvent(new CustomEvent("auth-refresh-start"));
  refreshPromise = (async () => {
    const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error("No refresh token");
    }
    const response = await refreshClient.post("/api/v1/auth/refresh", {
      refreshToken,
    });
    const newAccessToken: string | undefined =
      response.data.data?.accessToken || response.data.accessToken;
    const newRefreshToken: string | undefined =
      response.data.data?.refreshToken || response.data.refreshToken;
    if (!newAccessToken) {
      throw new Error("No access token in refresh response");
    }
    storeTokens(newAccessToken, newRefreshToken);
    return newAccessToken;
  })().finally(() => {
    refreshPromise = null;
    window.dispatchEvent(new CustomEvent("auth-refresh-end"));
  });

  return refreshPromise;
}

// Bitta muvaffaqiyatsiz refresh uchun logout faqat bir marta yuboriladi
let logoutHandledFor: Promise<string> | null = null;

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 0. OFFLINE_ONLY Circuit breaker: if user chose explicit offline mode, abort immediately (0 ms latency)
    if (networkModeManager.isOfflineOnly()) {
      const offlineErr: any = new AxiosError("Faqat oflayn rejim faollashtirilgan", "ERR_OFFLINE_MODE", config);
      offlineErr.isOffline = true;
      return Promise.reject(offlineErr);
    }
    // 1. Tokenni olish
    let token = Cookies.get(ACCESS_TOKEN_KEY);

    // 2. Tilni cookiedan olish
    const language = Cookies.get("i18next") || "uzl";

    if (config.headers) {
      // TILNI BIRIKTIRISH
      config.headers["Accept-Language"] = language;
    }

    // 3. Proactive token refresh: 5 daqiqadan kam qolsa oldindan yangilash.
    //    Refresh allaqachon ketayotgan bo'lsa — o'sha promise'ni kutamiz.
    if (
      refreshPromise ||
      (token && isTokenExpiringSoon(token) && Cookies.get(REFRESH_TOKEN_KEY))
    ) {
      try {
        token = await refreshAccessToken();
      } catch {
        // Proactive refresh failed — proceed with existing token
        token = Cookies.get(ACCESS_TOKEN_KEY);
      }
    }

    // Tokenni biriktirish
    if (config.headers && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Global error handling (non-401 errors)
    const requestUrl = error.config?.url || "unknown";
    if (error.response) {
      const status = error.response.status;
      if (status === 403) {
        // 403 means authenticated but forbidden — do NOT clear tokens/logout
        window.dispatchEvent(
          new CustomEvent("api-error", {
            detail: { status: 403, message: i18n.t("errors.accessDenied"), url: requestUrl },
          }),
        );
        return Promise.reject(error);
      }
      if (status >= 500) {
        // Bu endpointlar o'z error handling'iga ega — global notification kerak emas
        const SELF_HANDLED_URLS = [
          "/auth/logout",                    // client-side already handled
          "/api/v2/exams/active",            // polling — spam bo'ladi
          "/api/v2/tickets/start-visible",   // page o'zi error ko'rsatadi
          "/api/v2/exams/start-visible",     // page o'zi error ko'rsatadi
          "/api/v2/exams/start-secure",      // page o'zi error ko'rsatadi
          "/api/v2/exams/submit",            // QuizNav o'zi notification ko'rsatadi
          "/api/v1/auth/config",             // Heartbeat check
          "/api/v1/app/wrong-answers",       // Local fallback mavjud
          "/api/v1/app/saved-questions",     // Local fallback mavjud
          "/api/v1/app/offline-bundle",      // background sync, non-blocking
          "/api/v1/public/exam-rules",       // defaults/cache fallback
          "/api/v2/my-statistics",           // Local fallback mavjud
          "/api/v2/exams/history",           // Local fallback mavjud
          "/api/v1/auth/qr",                 // QR auth service handles status and fallback
          "/api/v1/auth/devices",            // Devices page handles session management
          "/api/v1/auth/register",           // Register page handles inline validation/alerts
        ];
        const isSelfHandled = SELF_HANDLED_URLS.some((u) => requestUrl.includes(u));
        if (!isSelfHandled) {
          window.dispatchEvent(
            new CustomEvent("api-error", {
              detail: { status, message: i18n.t("errors.serverError"), url: requestUrl },
            }),
          );
        }
      }
    } else if (!axios.isCancel(error) && error.code !== "ERR_CANCELED" && error.code !== "ERR_OFFLINE_MODE" && !(error as any).isOffline) {
      // Tarmoq uzilishi, timeout yoki server javob bermagan holat (status: 0)
      const SELF_HANDLED = [
        "/auth/logout",
        "/api/v2/exams/active",
        "/api/v1/auth/me",
        "/api/v1/auth/config",
        "/api/v1/app/wrong-answers",
        "/api/v1/app/saved-questions",
        "/api/v1/app/offline-bundle",
        "/api/v1/public/exam-rules",
        "/api/v2/my-statistics",
        "/api/v2/exams/history",
        "/api/v2/tickets",
        "/api/v2/topics",
        "/api/v2/exams/submit",
        "/api/v1/auth/qr",
        "/api/v1/auth/devices",
        "/api/v1/auth/register",
      ];
      const isSelfHandled = SELF_HANDLED.some((u) => requestUrl.includes(u));
      if (!isSelfHandled) {
        window.dispatchEvent(
          new CustomEvent("api-error", {
            detail: {
              status: 0,
              isOffline: true,
              message: i18n.t("errors.networkError"),
              url: requestUrl,
            },
          }),
        );
      }
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401 bo'lsa va retry qilinmagan bo'lsa
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
      const hadAuthHeader = Boolean(originalRequest.headers?.Authorization);

      /*
       * KRITIK TUZATISH — mehmon (guest) foydalanuvchini uydan haydash muammosi.
       *
       * Avval: token BUTUNLAY yo'q holatda ham (mehmon), 401 qaytgan har qanday
       * so'rov `auth-logout` eventini yuborardi. AuthContext esa uni ushlab
       * `navigate("/")` qilardi. Natijada `/try-exam` (bepul sinov imtihoni)
       * sahifasida QuizContent'ning `/api/v1/app/saved-questions` so'rovi 401
       * qaytishi bilan MEHMON bosh sahifaga uloqtirilardi — asosiy jalb qilish
       * kanali buzilgan edi.
       *
       * Endi: agar so'rovda Authorization header bo'lmagan bo'lsa, bu "sessiya
       * tugadi" emas, oddiy "ruxsat yo'q" holati — logout yuborilmaydi.
       */
      if (!hadAuthHeader) {
        return Promise.reject(error);
      }

      // Refresh token yo'q bo'lsa - to'g'ridan-to'g'ri logout
      if (!refreshToken) {
        Cookies.remove(ACCESS_TOKEN_KEY);
        Cookies.remove(REFRESH_TOKEN_KEY);
        Cookies.remove(USER_DATA_KEY);
        window.dispatchEvent(new CustomEvent("auth-token-expired"));
        window.dispatchEvent(new CustomEvent("auth-logout"));
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // So'rov eski token bilan yuborilgan, lekin shu orada token allaqachon
      // yangilangan bo'lsa — qayta refresh qilmasdan yangi token bilan takrorlash.
      const currentToken = Cookies.get(ACCESS_TOKEN_KEY);
      if (
        !refreshPromise &&
        currentToken &&
        originalRequest.headers?.Authorization !== `Bearer ${currentToken}`
      ) {
        originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        return api(originalRequest);
      }

      const pending = refreshAccessToken();
      try {
        const newAccessToken = await pending;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError: any) {
        const status = refreshError?.response?.status;
        // Only log out if the backend explicitly rejected the refresh token (400, 401, 403)
        // If it was a network drop, timeout, or server 5xx, preserve tokens so offline mode remains active!
        if ((status === 400 || status === 401 || status === 403) && logoutHandledFor !== pending) {
          logoutHandledFor = pending;
          Cookies.remove(ACCESS_TOKEN_KEY);
          Cookies.remove(REFRESH_TOKEN_KEY);
          Cookies.remove(USER_DATA_KEY);
          window.dispatchEvent(new CustomEvent("auth-token-expired"));
          window.dispatchEvent(new CustomEvent("auth-logout"));
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// ── In-Flight GET Request Deduplication ──
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const originalApiRequest = api.request.bind(api);

api.request = function <T = unknown, R = import("axios").AxiosResponse<T>>(
  configOrUrl: unknown,
  config?: unknown
): Promise<R> {
  const mergedConfig =
    typeof configOrUrl === "string"
      ? { ...(config as object || {}), url: configOrUrl }
      : { ...((configOrUrl as object) || {}) };

  const method = ((mergedConfig as { method?: string }).method || "get").toLowerCase();
  const skipDedup = Boolean((mergedConfig as { skipDeduplication?: boolean }).skipDeduplication);

  if (method === "get" && !skipDedup) {
    const key = `${(mergedConfig as { baseURL?: string }).baseURL || ""}|${(mergedConfig as { url?: string }).url || ""}|${JSON.stringify(
      (mergedConfig as { params?: unknown }).params || {}
    )}`;

    const existing = inFlightGetRequests.get(key);
    if (existing) {
      return existing as Promise<R>;
    }

    const promise = originalApiRequest(mergedConfig as any).finally(() => {
      setTimeout(() => {
        inFlightGetRequests.delete(key);
      }, 50);
    });

    inFlightGetRequests.set(key, promise);
    return promise as Promise<R>;
  }

  return originalApiRequest(mergedConfig as any) as Promise<R>;
};

export default api;
