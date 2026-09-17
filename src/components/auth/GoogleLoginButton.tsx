import { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@mantine/core";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../../api/api";
import { getErrorMessage } from "../../types/errors";
import { showToast } from "../../utils/notificationUtils";
import OAuthBrowserModal, { type InstalledBrowser } from "./OAuthBrowserModal";

interface GoogleLoginButtonProps {
  mode?: "login" | "register";
  compact?: boolean;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.04 24.04 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export const GoogleLoginButton = ({ mode = "login", compact = false }: GoogleLoginButtonProps) => {
  const { t, i18n } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [browserModalOpen, setBrowserModalOpen] = useState(false);

  const locationState = location.state as { from?: string | { pathname: string; search?: string } } | undefined;
  let from = "/me";
  if (typeof locationState?.from === "string") {
    from = locationState.from;
  } else if (locationState?.from?.pathname) {
    from = locationState.from.pathname + (locationState.from.search || "");
  }

  const isTauri =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

  // Listen for desktop OAuth success events emitted by Tauri
  useEffect(() => {
    if (!isTauri) return;

    let unlistenFn: (() => void) | null = null;
    let mounted = true;

    const setupListener = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen<any>("desktop-auth-success", (event) => {
          if (!mounted) return;
          const payload = event.payload;
          if (payload?.accessToken) {
            authLogin(payload);
            navigate(from, { replace: true });
            showToast({
              id: "auth-google-success",
              dedupeKey: "auth-google-success",
              title: t("auth.google.successTitle", { defaultValue: "Muvaffaqiyat" }),
              message: t("auth.google.successMessage", { defaultValue: "Google orqali tizimga kirdingiz!" }),
              color: "green",
              withBorder: true,
            });
          }
        });
        unlistenFn = unlisten;
      } catch {
        // ignore
      }
    };

    setupListener();

    return () => {
      mounted = false;
      if (unlistenFn) unlistenFn();
    };
  }, [isTauri, authLogin, navigate, from, t]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (loading) return;
      setLoading(true);
      try {
        const response = await api.post("/api/v1/auth/google", {
          accessToken: tokenResponse.access_token,
        });

        if (response.data.success) {
          const userLang = response.data.data.user?.preferredLanguage;
          if (userLang) {
            i18n.changeLanguage(userLang);
          }

          authLogin(response.data.data);
          navigate(from, { replace: true });

          showToast({
            id: "auth-google-success",
            dedupeKey: "auth-google-success",
            title: t("auth.google.successTitle", { defaultValue: "Muvaffaqiyat" }),
            message: t("auth.google.successMessage", { defaultValue: "Google orqali tizimga kirdingiz!" }),
            color: "green",
            withBorder: true,
          });
        }
      } catch (err: unknown) {
        showToast({
          id: "auth-google-error",
          dedupeKey: "auth-google-error",
          color: "red",
          title: t("common.error", { defaultValue: "Xatolik" }),
          message: getErrorMessage(err, t("auth.google.errorMessage", { defaultValue: "Google orqali kirishda xatolik yuz berdi" })),
        });
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      showToast({
        id: "auth-google-failed",
        dedupeKey: "auth-google-failed",
        color: "red",
        title: t("common.error", { defaultValue: "Xatolik" }),
        message: t("auth.google.errorMessage", { defaultValue: "Google orqali kirishda xatolik yuz berdi" }),
      });
    },
  });

  const handleClick = async () => {
    if (loading) return;

    if (isTauri) {
      setBrowserModalOpen(true);
    } else {
      googleLogin();
    }
  };

  const handleSelectBrowser = async (browser: InstalledBrowser) => {
    setBrowserModalOpen(false);
    setLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const oauthUrl = "https://pravaonline.uz/auth/login?oauth=google";
      await invoke("launch_browser_url", {
        browserPath: browser.path ? browser.path : null,
        url: oauthUrl,
      });

      showToast({
        id: "auth-browser-opened",
        title: browser.name,
        message:
          i18n.language === "ru"
            ? "Браузер открыт для авторизации. После входа вы вернетесь в приложение."
            : i18n.language === "uzc"
            ? "Браузер очилди. Google орқали кирганингиздан сўнг иловага автоматик қайтасиз."
            : "Brauzer ochildi. Google orqali kirganingizdan so'ng ilovaga avtomatik qaytasiz.",
        color: "blue",
        autoClose: 6000,
      });
    } catch (err: unknown) {
      showToast({
        id: "auth-browser-launch-error",
        color: "red",
        title: t("common.error", { defaultValue: "Xatolik" }),
        message: getErrorMessage(err, "Brauzerni ishga tushirib bo'lmadi"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInternalWindow = async () => {
    setBrowserModalOpen(false);
    setLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_oauth_window", { provider: "google" });
    } catch (err: unknown) {
      showToast({
        id: "auth-internal-window-error",
        color: "red",
        title: t("common.error", { defaultValue: "Xatolik" }),
        message: getErrorMessage(err, t("auth.google.errorMessage", { defaultValue: "Ichki oynada ochishda xatolik" })),
      });
    } finally {
      setLoading(false);
    }
  };

  const buttonText = compact
    ? "Google"
    : mode === "login"
    ? t("auth.google.loginButton", { defaultValue: "Google bilan kirish" })
    : t("auth.google.registerButton", { defaultValue: "Google bilan ro'yxatdan o'tish" });

  return (
    <>
      <Button
        leftSection={<GoogleIcon />}
        variant="default"
        size={compact ? "sm" : "md"}
        h={compact ? 40 : 46}
        fullWidth
        radius="md"
        loading={loading}
        onClick={handleClick}
        styles={{
          root: {
            fontWeight: 600,
            fontSize: compact ? 13 : "14px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
            transition: "all 0.16s ease",
            "&:hover": {
              backgroundColor: "var(--surface-muted)",
            },
          },
        }}
      >
        {buttonText}
      </Button>

      {isTauri && (
        <OAuthBrowserModal
          opened={browserModalOpen}
          onClose={() => setBrowserModalOpen(false)}
          onSelectBrowser={handleSelectBrowser}
          onOpenInternalWindow={handleOpenInternalWindow}
          loading={loading}
        />
      )}
    </>
  );
};

export default GoogleLoginButton;
