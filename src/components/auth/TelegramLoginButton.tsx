import { useState, useCallback } from "react";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../../api/api";
import { ENV } from "../../config/env";
import { getErrorMessage } from "../../types/errors";

interface TelegramLoginButtonProps {
  mode?: "login" | "register";
  compact?: boolean;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (
          options: { bot_id: number; request_access?: boolean },
          callback: (user: TelegramUser | false) => void
        ) => void;
      };
    };
  }
}

const TELEGRAM_BOT_ID = ENV.TELEGRAM_BOT_ID;

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const TelegramLoginButton = ({ mode = "login", compact = false }: TelegramLoginButtonProps) => {
  const { t, i18n } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/me";

  const handleTelegramLogin = useCallback(() => {
    // Try popup API first
    if (window.Telegram?.Login?.auth) {
      setLoading(true);
      window.Telegram.Login.auth(
        { bot_id: TELEGRAM_BOT_ID, request_access: true },
        async (user: TelegramUser | false) => {
          if (!user) {
            setLoading(false);
            return;
          }

          try {
            const response = await api.post("/api/v1/auth/telegram", {
              id: user.id,
              firstName: user.first_name,
              lastName: user.last_name || "",
              username: user.username || "",
              photoUrl: user.photo_url || "",
              authDate: user.auth_date,
              hash: user.hash,
            });

            if (response.data.success) {
              const userLang = response.data.data.user?.preferredLanguage;
              if (userLang) {
                i18n.changeLanguage(userLang);
              }

              authLogin(response.data.data);
              navigate(from, { replace: true });

              notifications.show({
                title: t("auth.telegram.successTitle"),
                message: t("auth.telegram.successMessage"),
                color: "green",
                withBorder: true,
              });
            }
          } catch (err: unknown) {
            notifications.show({
              color: "red",
              title: t("common.error"),
              message: getErrorMessage(err, t("auth.telegram.errorMessage")),
            });
          } finally {
            setLoading(false);
          }
        }
      );
    } else {
      // Fallback: load Telegram widget script and retry
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.onload = () => {
        if (window.Telegram?.Login?.auth) {
          handleTelegramLogin();
        } else {
          notifications.show({
            color: "yellow",
            title: t("common.error"),
            message: t("auth.telegram.errorMessage"),
          });
        }
      };
      script.onerror = () => {
        notifications.show({
          color: "red",
          title: t("common.error"),
          message: t("auth.telegram.errorMessage"),
        });
      };
      document.head.appendChild(script);
    }
  }, [authLogin, navigate, t, i18n]);

  return (
    <Button
      leftSection={<TelegramIcon />}
      variant="filled"
      color="#229ED9"
      size={compact ? "sm" : "md"}
      h={compact ? 40 : 44}
      fullWidth
      radius="md"
      loading={loading}
      onClick={handleTelegramLogin}
      styles={{
        root: { fontWeight: 600, fontSize: compact ? 13 : undefined },
      }}
    >
      {compact
        ? "Telegram"
        : mode === "login"
        ? t("auth.telegram.loginButton")
        : t("auth.telegram.registerButton")}
    </Button>
  );
};

export default TelegramLoginButton;
