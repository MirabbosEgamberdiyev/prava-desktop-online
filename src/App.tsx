import { useEffect, useRef } from "react";
import { HashRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { DesktopThemeProvider } from "./context/DesktopThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import AppRoutes from "./routes";
import GoogleOneTap from "./components/auth/GoogleOneTap";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { ScrollManager } from "./components/common/ScrollManager";

/**
 * Global API error listener with deduplication cooldown.
 * Prevents toast spam when polling endpoints (like /me, /statistics) hit repeated errors.
 */
function ApiErrorListener() {
  const { t } = useTranslation();
  const lastToastRef = useRef<Record<string, number>>({});
  const COOLDOWN_MS = 60_000; // 1 minute cooldown per endpoint

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        status: number;
        message: string;
        url?: string;
      };

      // Deduplication: skip if same endpoint showed toast recently
      const endpoint = detail.url || `status-${detail.status}`;
      const now = Date.now();
      if (now - (lastToastRef.current[endpoint] || 0) < COOLDOWN_MS) return;
      lastToastRef.current[endpoint] = now;

      if (detail.status === 403) {
        notifications.show({
          title: t("common.error"),
          message: detail.message || t("errors.accessDenied"),
          color: "orange",
          autoClose: 5000,
        });
      } else if (detail.status >= 500) {
        notifications.show({
          title: t("common.error"),
          message: detail.message || t("errors.serverError"),
          color: "red",
          autoClose: 5000,
        });
      } else if (detail.status === 0) {
        notifications.show({
          title: t("errors.noInternetTitle"),
          message: detail.message || t("errors.networkError"),
          color: "red",
          autoClose: 5000,
        });
      }
    };

    window.addEventListener("api-error", handler);
    return () => window.removeEventListener("api-error", handler);
  }, [t]);

  return null;
}

/**
 * Inner app wrapper that resets ErrorBoundary on route change.
 */
function AppInner() {
  const location = useLocation();

  return (
    <DesktopThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <ApiErrorListener />
          <GoogleOneTap />
          <ScrollManager />
          <ErrorBoundary resetKey={location.pathname}>
            <AppRoutes />
          </ErrorBoundary>
        </LanguageProvider>
      </AuthProvider>
    </DesktopThemeProvider>
  );
}

function App() {
  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  );
}

export default App;
