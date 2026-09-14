import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import { ENV } from "../config/env";
import i18n from "../utils/i18n";

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
    } else if (error.code === "ERR_NETWORK" || !error.response) {
      window.dispatchEvent(
        new CustomEvent("api-error", {
          detail: { status: 0, message: i18n.t("errors.networkError"), url: requestUrl },
        }),
      );
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
      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove(ACCESS_TOKEN_KEY);
        Cookies.remove(REFRESH_TOKEN_KEY);
        Cookies.remove(USER_DATA_KEY);
        window.dispatchEvent(new CustomEvent("auth-logout"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
