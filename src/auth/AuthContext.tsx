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
import { useNavigate } from "react-router-dom";
import type { User, AuthData } from "../types";
import api from "../api/api";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_DATA_KEY = "userData";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (authData: AuthData) => void;
  register: (authData: AuthData) => void;
  logout: () => Promise<void>;
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

const getInitialUser = () => {
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
  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(checkAuthStatus());
  const [user, setUser] = useState<User | null>(getInitialUser());
  const navigate = useNavigate();

  // Keep a ref in sync so syncAuthState never closes over stale state
  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Stable callback — no state in deps, reads current value via ref
  const syncAuthState = useCallback(() => {
    const isValid = checkAuthStatus();
    if (isAuthenticatedRef.current && !isValid) {
      setIsAuthenticated(false);
      setUser(null);
    } else if (!isAuthenticatedRef.current && isValid) {
      setIsAuthenticated(true);
      setUser(getInitialUser());
    }
  }, []);

  useEffect(() => {
    // Check every 30 seconds
    const interval = setInterval(syncAuthState, 30_000);

    // Also check on window focus (user returning to tab)
    const onFocus = () => syncAuthState();
    window.addEventListener("focus", onFocus);

    // Instant multi-tab synchronization
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_sync_event") {
        syncAuthState();
      }
    };
    window.addEventListener("storage", onStorage);

    // Listen for forced logout from API interceptor (e.g. refresh token expired)
    const onForceLogout = () => {
      setIsAuthenticated(false);
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
      window.removeEventListener("auth-logout", onForceLogout);
    };
  }, [syncAuthState, navigate]);

  const saveAuthData = (authData: AuthData) => {
    const { accessToken, refreshToken, user: userData, expiresIn } = authData;

    // expiresIn millisekundda kelsa kun hisobiga o'tkazamiz, kelmasa 1 kun
    const expiryDays = expiresIn ? expiresIn / (1000 * 60 * 60 * 24) : 1;

    // HTTP da secure: true cookie saqlanmaydi, shuning uchun protocol'ga qarab o'rnatamiz
    const isSecure = window.location.protocol === "https:";

    Cookies.set(ACCESS_TOKEN_KEY, accessToken, {
      expires: expiryDays,
      secure: isSecure,
      sameSite: isSecure ? "strict" : "lax",
    });

    if (refreshToken) {
      Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
        expires: 30, // Refresh token uchun 30 kun
        secure: isSecure,
        sameSite: isSecure ? "strict" : "lax",
      });
    }

    Cookies.set(USER_DATA_KEY, JSON.stringify(userData), {
      expires: expiryDays,
      secure: isSecure,
      sameSite: isSecure ? "strict" : "lax",
    });

    try {
      localStorage.setItem("auth_sync_event", `login_${Date.now()}`);
    } catch {
      // ignore
    }

    setIsAuthenticated(true);
    setUser(userData);
  };

  const login = (authData: AuthData) => {
    saveAuthData(authData);
  };

  const register = (authData: AuthData) => {
    saveAuthData(authData);
  };

  const logout = async () => {
    try {
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
      try {
        localStorage.setItem("auth_sync_event", `logout_${Date.now()}`);
      } catch {
        // ignore
      }
      setIsAuthenticated(false);
      setUser(null);
      navigate("/", { replace: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, register, logout }}
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
