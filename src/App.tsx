import { useEffect } from "react";
import { HashRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { DesktopThemeProvider } from "./context/DesktopThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import AppRoutes from "./routes";
import GoogleOneTap from "./components/auth/GoogleOneTap";
import { showToast } from "./utils/notificationUtils";
import { useTranslation } from "react-i18next";
import { ScrollManager } from "./components/common/ScrollManager";
import { networkHeartbeat } from "./sync/networkHeartbeat";

/**
 * Global API error listener with deduplication cooldown.
 * Prevents toast spam when polling endpoints (like /me, /statistics) hit repeated errors.
 */
function ApiErrorListener() {
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        status: number;
        message: string;
        url?: string;
        isOffline?: boolean;
      };

      // Network / Connectivity errors (status: 0)
      if (detail.status === 0) {
        // Agar OfflineBanner allaqachon ko'rinib turgan bo'lsa, ekran burchagida takroriy toast chiqarmaymiz
        if (!networkHeartbeat.getStatus().isOnline) {
          return;
        }

        showToast({
          id: "global-network-toast",
          dedupeKey: "global-network-toast",
          cooldownMs: 30_000,
          title: t("errors.noInternetTitle", "Internet aloqasi yo‘q"),
          message: t("errors.networkError", "Internetga ulanishni tekshiring"),
          color: "orange",
          autoClose: 4000,
        });
        return;
      }

      const endpoint = detail.url || `status-${detail.status}`;
      if (detail.status === 403) {
        showToast({
          id: `status-403-${endpoint}`,
          dedupeKey: `status-403-${endpoint}`,
          cooldownMs: 30_000,
          title: t("common.error"),
          message: detail.message || t("errors.accessDenied"),
          color: "orange",
          autoClose: 5000,
        });
      } else if (detail.status >= 500) {
        showToast({
          id: `status-500-${endpoint}`,
          dedupeKey: `status-500-${endpoint}`,
          cooldownMs: 30_000,
          title: t("common.error"),
          message: detail.message || t("errors.serverError"),
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
