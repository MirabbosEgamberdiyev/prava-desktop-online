/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import Cookies from "js-cookie";
import { authCookieOptions } from "./tokenCookies";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { User, AuthData } from "../types";
import api from "../api/api";
import { showToast } from "../utils/notificationUtils";
import { AccountManager, readRememberMePreference } from "./accountManager";
import { dbClient } from "../database/dbClient";
import { clearLocalUserData, flushOutboxBeforeLogout, runLocalStorageMigrations } from "./localDataCleanup";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_DATA_KEY = "userData";

export type AuthState =
  | "UNAUTHENTICATED"
  | "AUTHENTICATING"
  | "AUTHENTICATED"
  | "REFRESHING"
  | "RESTORING"
  | "LOGGING_OUT"
  | "TOKEN_EXPIRED"
  | "ERROR";

export interface AuthContextType {
  authState: AuthState;
  isAuthenticated: boolean;
  user: User | null;
  login: (authData: AuthData) => void;
  register: (authData: AuthData) => void;
  /** Explicit logout. Flushes the outbox (≤5 s), then clears this user's local data. */
  logout: (opts?: { redirectTo?: string }) => Promise<void>;
  transitionTo: (nextState: AuthState) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * JWT payload'dan exp vaqtini olish.
 */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Auth holatini tekshirish:
 * - Access token mavjud va eskirmaganmi
 * - Access token eskirgan bo'lsa, refresh token bormi (API interceptor yangilaydi)
 * - Hech biri yo'q → cookie'larni tozalash
 */
const checkAuthStatus = (): boolean => {
  const accessToken = Cookies.get(ACCESS_TOKEN_KEY);
  if (!accessToken) return false;

  const expiry = getTokenExpiry(accessToken);

  // Token hali amal qilmoqda
  if (expiry && expiry > Date.now()) return true;

  // Access token eskirgan — refresh token bormi?
  const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
  if (refreshToken) return true; // API interceptor yangilaydi

  // Hech qanday valid token yo'q — cookie'larni tozalash
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
  Cookies.remove(USER_DATA_KEY);
  return false;
};

const getInitialUser = (): User | null => {
  const user = Cookies.get(USER_DATA_KEY);
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const initialAuth = checkAuthStatus();
  const [authState, setAuthState] = useState<AuthState>(
    initialAuth ? "AUTHENTICATED" : "UNAUTHENTICATED"
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAuth);
  const [user, setUser] = useState<User | null>(getInitialUser());
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const authStateRef = useRef(authState);
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  // One-time, idempotent local-storage migrations (strip tokens/PII from saved accounts, ...).
  useEffect(() => {
    runLocalStorageMigrations();
  }, []);

  // Per-user IndexedDB scope: drop guest outbox rows + one-time claim of pre-v3 rows.
  const scopedUserId = isAuthenticated ? user?.id ?? null : null;
  useEffect(() => {
    if (scopedUserId === null || scopedUserId === undefined) return;
    dbClient.prepareForUser(scopedUserId).catch(() => {});
  }, [scopedUserId]);

  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const transitionTo = useCallback((nextState: AuthState) => {
    authStateRef.current = nextState;
    setAuthState(nextState);

    if (nextState === "AUTHENTICATED") {
      setIsAuthenticated(true);
    } else if (
      nextState === "UNAUTHENTICATED" ||
      nextState === "TOKEN_EXPIRED" ||
      nextState === "LOGGING_OUT"
    ) {
      setIsAuthenticated(false);
    }
  }, []);

  // Stable callback — no stale state closures
  const syncAuthState = useCallback(() => {
    // If currently performing active transition, don't interrupt
    if (
      authStateRef.current === "AUTHENTICATING" ||
      authStateRef.current === "LOGGING_OUT" ||
      authStateRef.current === "REFRESHING"
    ) {
      return;
    }

    const isValid = checkAuthStatus();
    if (isAuthenticatedRef.current && !isValid) {
      transitionTo("UNAUTHENTICATED");
      setUser(null);
    } else if (!isAuthenticatedRef.current && isValid) {
      transitionTo("AUTHENTICATED");
      setUser(getInitialUser());
    }
  }, [transitionTo]);

  useEffect(() => {
    // Check every 30 seconds
    const interval = setInterval(syncAuthState, 30_000);

    // Also check on window focus (user returning to tab/app)
    const onFocus = () => syncAuthState();
    window.addEventListener("focus", onFocus);

    // Instant multi-window synchronization
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_sync_event") {
        syncAuthState();
      }
    };
    window.addEventListener("storage", onStorage);

    // Refresh start / end event listeners from API interceptor
    const onRefreshStart = () => {
      if (authStateRef.current === "AUTHENTICATED") {
        setAuthState("REFRESHING");
      }
    };
    const onRefreshEnd = () => {
      if (authStateRef.current === "REFRESHING") {
        setAuthState("AUTHENTICATED");
      }
    };
    window.addEventListener("auth-refresh-start", onRefreshStart);
    window.addEventListener("auth-refresh-end", onRefreshEnd);

    // Token expired event
    const onTokenExpired = () => {
      transitionTo("TOKEN_EXPIRED");
      showToast({
        id: "auth-session-expired",
        dedupeKey: "auth-session-expired",
        title: t("errors.sessionExpiredTitle", { defaultValue: "Sessiya muddati tugadi" }),
        message: t("errors.sessionExpiredMessage", {
          defaultValue: "Xavfsizlik maqsadida iltimos qaytadan tizimga kiring.",
        }),
        color: "red",
        withBorder: true,
      });
    };
    window.addEventListener("auth-token-expired", onTokenExpired);

    // Listen for forced logout from API interceptor
    const onForceLogout = () => {
      transitionTo("UNAUTHENTICATED");
      setUser(null);
      try {
        localStorage.setItem("auth_sync_event", `logout_${Date.now()}`);
      } catch {
        // ignore
      }
      navigate("/", { replace: true });
    };
    window.addEventListener("auth-logout", onForceLogout);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-refresh-start", onRefreshStart);
      window.removeEventListener("auth-refresh-end", onRefreshEnd);
      window.removeEventListener("auth-token-expired", onTokenExpired);
      window.removeEventListener("auth-logout", onForceLogout);
    };
  }, [syncAuthState, navigate, t, transitionTo]);

  const saveAuthData = (authData: AuthData) => {
    const { accessToken, refreshToken, user: userData, expiresIn, rememberMe } = authData;

    // expiresIn millisekundda kelsa kun hisobiga o'tkazamiz, kelmasa 1 kun
    const expiryDays = expiresIn ? expiresIn / (1000 * 60 * 60 * 24) : 1;
    // Explicit cookie attributes; tokens are not HttpOnly on http://tauri.localhost —
    // see src/auth/tokenCookies.ts (audit P2-D1). rememberMe=false → session cookies.
    const tokenCookieOpts = authCookieOptions("access", rememberMe !== false ? expiryDays : null);

    Cookies.set(ACCESS_TOKEN_KEY, accessToken, tokenCookieOpts);

    if (refreshToken) {
      // Refresh token: 30 kun, sameSite strict
      const refreshOpts = authCookieOptions("refresh", rememberMe !== false ? undefined : null);
      Cookies.set(REFRESH_TOKEN_KEY, refreshToken, refreshOpts);
    }

    Cookies.set(USER_DATA_KEY, JSON.stringify(userData), tokenCookieOpts);

    try {
      // "Accounts on this device": display name + masked identifier only, and only with remember-me.
      const remember = rememberMe ?? readRememberMePreference();
      if (remember) AccountManager.saveAccount(userData);
      else if (userData?.id) AccountManager.removeAccount(userData.id);
      localStorage.setItem("auth_sync_event", `login_${Date.now()}`);
    } catch {
      // ignore
    }

    setIsAuthenticated(true);
    setUser(userData);
  };

  const lastProcessedTokenRef = useRef<string>("");
  const isAuthListenerAttachedRef = useRef(false);

  useEffect(() => {
    const isTauri =
      typeof window !== "undefined" &&
      Boolean(
        (window as unknown as { __TAURI_INTERNALS__?: unknown })
          .__TAURI_INTERNALS__
      );

    if (!isTauri || isAuthListenerAttachedRef.current) return;
    isAuthListenerAttachedRef.current = true;

    let unlistenFn: (() => void) | undefined;
    let isMounted = true;

    import("@tauri-apps/api/event")
      .then(({ listen }) => {
        if (!isMounted) return;
        return listen<{
          accessToken: string;
          refreshToken?: string;
          user?: User;
        }>("desktop-auth-success", async (event) => {
          const { accessToken, refreshToken, user: userData } = event.payload;
          if (!accessToken) return;

          // Strict token deduplication
          if (lastProcessedTokenRef.current === accessToken) {
            return;
          }
          lastProcessedTokenRef.current = accessToken;

          transitionTo("AUTHENTICATING");
          let finalUser = userData;
          if (!finalUser || !finalUser.id) {
            try {
              const res = await api.get("/api/v1/auth/me", {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (res.data?.success && res.data?.data) {
                finalUser = res.data.data;
              }
            } catch {
              // ignore
            }
          }

          const userLang = finalUser?.preferredLanguage;
          if (userLang) {
            i18n.changeLanguage(userLang);
          }

          saveAuthData({
            accessToken,
            refreshToken: refreshToken || "",
            user: finalUser || ({} as User),
          });

          transitionTo("AUTHENTICATED");

          showToast({
            id: "auth-desktop-login-success",
            dedupeKey: "auth-desktop-login-success",
            cooldownMs: 15_000,
            title: t("auth.loginSuccess", { defaultValue: "Xush kelibsiz!" }),
            message: t("auth.loginSuccessDesc", {
              defaultValue: "Prava Online tizimiga muvaffaqiyatli kirdingiz",
            }),
            color: "green",
            withBorder: true,
          });

          navigate("/me", { replace: true });
        });
      })
      .then((unsub) => {
        if (!isMounted && unsub) {
          unsub();
        } else {
          unlistenFn = unsub;
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      isAuthListenerAttachedRef.current = false;
      if (unlistenFn) unlistenFn();
    };
  }, [navigate, t, i18n, transitionTo]);

  const login = (authData: AuthData) => {
    if (authStateRef.current === "LOGGING_OUT") return;
    transitionTo("AUTHENTICATING");
    saveAuthData(authData);
    transitionTo("AUTHENTICATED");
  };

  const register = (authData: AuthData) => {
    if (authStateRef.current === "LOGGING_OUT") return;
    transitionTo("AUTHENTICATING");
    saveAuthData(authData);
    transitionTo("AUTHENTICATED");
  };

  const logout = async (opts?: { redirectTo?: string }) => {
    if (authStateRef.current === "LOGGING_OUT") return;
    transitionTo("LOGGING_OUT");
    const loggingOutUserId = user?.id ?? getInitialUser()?.id ?? null;
    try {
      // Push what is still queued while the tokens are valid (best-effort, ≤5 s).
      await flushOutboxBeforeLogout();
      const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await api.post("/api/v1/auth/logout", { refreshToken });
      }
    } catch {
      // Logout API xatosi bo'lsa ham, local tokenlarni tozalaymiz
    } finally {
      Cookies.remove(ACCESS_TOKEN_KEY);
      Cookies.remove(REFRESH_TOKEN_KEY);
      Cookies.remove(USER_DATA_KEY);
      await clearLocalUserData(loggingOutUserId);
      try {
        localStorage.setItem("auth_sync_event", `logout_${Date.now()}`);
      } catch {
        // ignore
      }
      setUser(null);
      transitionTo("UNAUTHENTICATED");
      navigate(opts?.redirectTo ?? "/", { replace: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        isAuthenticated,
        user,
        login,
        register,
        logout,
        transitionTo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
