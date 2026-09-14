import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
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

let isProactiveRefreshing = false;

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 0. OFFLINE_ONLY Circuit breaker: if user chose explicit offline mode, abort immediately (0 ms latency)
    if (networkModeManager.isOfflineOnly()) {
      const offlineErr: any = new AxiosError("Faqat oflayn rejim faollashtirilgan", "ERR_OFFLINE_MODE", config);
      offlineErr.isOffline = true;
      return Promise.reject(offlineErr);
    }
    // 1. Tokenni olish
    const token = Cookies.get(ACCESS_TOKEN_KEY);

    // 2. Tilni cookiedan olish
    const language = Cookies.get("i18next") || "uzl";

    if (config.headers) {
      // TILNI BIRIKTIRISH
      config.headers["Accept-Language"] = language;
    }

    // 3. Proactive token refresh: 5 daqiqadan kam qolsa oldindan yangilash
    if (token && isTokenExpiringSoon(token) && !isProactiveRefreshing && !isRefreshing) {
      const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        isProactiveRefreshing = true;
        isRefreshing = true; // Block reactive refresh while proactive is in progress
        window.dispatchEvent(new CustomEvent("auth-refresh-start"));
        try {
          const response = await refreshClient.post("/api/v1/auth/refresh", {
            refreshToken,
          });
          const newAccessToken =
            response.data.data?.accessToken || response.data.accessToken;
          const newRefreshToken =
            response.data.data?.refreshToken || response.data.refreshToken;

          if (newAccessToken) {
            const isSecure = window.location.protocol === "https:";
            Cookies.set(ACCESS_TOKEN_KEY, newAccessToken, {
              expires: 1,
              secure: isSecure,
              sameSite: isSecure ? "strict" : "lax",
            });
            if (newRefreshToken) {
              Cookies.set(REFRESH_TOKEN_KEY, newRefreshToken, {
                expires: 30,
                secure: isSecure,
                sameSite: isSecure ? "strict" : "lax",
              });
            }
            // Extend userData cookie expiry to match access token
            const existingUserData = Cookies.get(USER_DATA_KEY);
            if (existingUserData) {
              Cookies.set(USER_DATA_KEY, existingUserData, {
                expires: 1,
                secure: isSecure,
                sameSite: isSecure ? "strict" : "lax",
              });
            }
            if (config.headers) {
              config.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return config;
          }
        } catch {
          // Proactive refresh failed — proceed with existing token
        } finally {
          isProactiveRefreshing = false;
          isRefreshing = false;
          window.dispatchEvent(new CustomEvent("auth-refresh-end"));
        }
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

// Refresh token logikasi
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
    } else if (!axios.isCancel(error) && error.code !== "ERR_CANCELED") {
      // Tarmoq uzilishi, timeout yoki server javob bermagan holat (status: 0)
      const SELF_HANDLED = [
        "/auth/logout",
        "/api/v2/exams/active",
        "/api/v1/auth/me",
        "/api/v1/auth/config",
        "/api/v1/app/wrong-answers",
        "/api/v1/app/saved-questions",
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

      // Agar allaqachon refresh qilinayotgan bo'lsa, navbatga qo'shish
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      window.dispatchEvent(new CustomEvent("auth-refresh-start"));

      try {
        const response = await refreshClient.post("/api/v1/auth/refresh", {
          refreshToken,
        });

        const newAccessToken = response.data.data?.accessToken || response.data.accessToken;
        const newRefreshToken = response.data.data?.refreshToken || response.data.refreshToken;

        if (newAccessToken) {
          const isSecure = window.location.protocol === "https:";

          Cookies.set(ACCESS_TOKEN_KEY, newAccessToken, {
            expires: 1,
            secure: isSecure,
            sameSite: isSecure ? "strict" : "lax",
          });

          if (newRefreshToken) {
            Cookies.set(REFRESH_TOKEN_KEY, newRefreshToken, {
              expires: 30,
              secure: isSecure,
              sameSite: isSecure ? "strict" : "lax",
            });
          }

          // Extend userData cookie expiry to match access token
          const existingUserData = Cookies.get(USER_DATA_KEY);
          if (existingUserData) {
            Cookies.set(USER_DATA_KEY, existingUserData, {
              expires: 1,
              secure: isSecure,
              sameSite: isSecure ? "strict" : "lax",
            });
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          return api(originalRequest);
        }

        throw new Error("No access token in refresh response");
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        const status = refreshError?.response?.status;
        // Only log out if the backend explicitly rejected the refresh token (400, 401, 403)
        // If it was a network drop, timeout, or server 5xx, preserve tokens so offline mode remains active!
        if (status === 400 || status === 401 || status === 403) {
          Cookies.remove(ACCESS_TOKEN_KEY);
          Cookies.remove(REFRESH_TOKEN_KEY);
          Cookies.remove(USER_DATA_KEY);
          window.dispatchEvent(new CustomEvent("auth-token-expired"));
          window.dispatchEvent(new CustomEvent("auth-logout"));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        window.dispatchEvent(new CustomEvent("auth-refresh-end"));
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
