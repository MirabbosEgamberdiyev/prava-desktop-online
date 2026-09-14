import { useState, useCallback, useRef } from "react";
import {
  Button,
  Modal,
  Stack,
  Text,
  TextInput,
  Group,
  Anchor,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import { showToast } from "../../utils/notificationUtils";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../../api/api";
import { ENV } from "../../config/env";
import { getErrorMessage } from "../../types/errors";
import { IconBrandTelegram, IconKey, IconExternalLink } from "@tabler/icons-react";

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
  const [modalOpened, setModalOpened] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [submittingToken, setSubmittingToken] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/me";

  const clearSafetyTimeout = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startSafetyTimeout = () => {
    clearSafetyTimeout();
    timeoutRef.current = window.setTimeout(() => {
      setLoading(false);
      setModalOpened(true);
    }, 12000);
  };

  const handleTokenSubmit = async (tokenValue?: string) => {
    if (submittingToken) return;
    const raw = (tokenValue || tokenInput).trim();
    if (!raw) return;

    let token = raw;
    if (raw.includes("token=")) {
      try {
        const url = new URL(raw, "https://pravaonline.uz");
        token = url.searchParams.get("token") || raw;
      } catch {
        const match = raw.match(/token=([a-zA-Z0-9_-]+)/);
        if (match) token = match[1];
      }
    }

    setSubmittingToken(true);
    try {
      const response = await api.post("/api/v1/auth/telegram/token-login", {
        token,
      });

      if (response.data.success) {
        const userLang = response.data.data.user?.preferredLanguage;
        if (userLang) {
          i18n.changeLanguage(userLang);
        }

        authLogin(response.data.data);
        setModalOpened(false);
        navigate(from, { replace: true });

        showToast({
          id: "auth-telegram-token-success",
          dedupeKey: "auth-telegram-token-success",
          title: t("auth.telegram.successTitle", { defaultValue: "Muvaffaqiyatli kirildi!" }),
          message: t("auth.telegram.successMessage", {
            defaultValue: "Telegram orqali tizimga kirdingiz",
          }),
          color: "green",
          withBorder: true,
        });
      }
    } catch (err: unknown) {
      showToast({
        id: "auth-telegram-token-error",
        dedupeKey: "auth-telegram-token-error",
        color: "red",
        title: t("common.error", { defaultValue: "Xatolik" }),
        message: getErrorMessage(
          err,
          t("auth.telegramCallbackInvalid", {
            defaultValue: "Telegram login kodi yaroqsiz yoki muddati o'tgan",
          })
        ),
      });
    } finally {
      setSubmittingToken(false);
    }
  };

  const isTauri = typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

  const handleTelegramLogin = useCallback(async () => {
    if (loading) return;
    if (isTauri) {
      setLoading(true);
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("open_oauth_window", { provider: "telegram" });
      } catch (err: unknown) {
        showToast({
          id: "auth-telegram-window-error",
          dedupeKey: "auth-telegram-window-error",
          color: "red",
          title: t("common.error"),
          message: getErrorMessage(err, t("auth.telegram.errorMessage")),
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (window.Telegram?.Login?.auth) {
      setLoading(true);
      startSafetyTimeout();

      try {
        window.Telegram.Login.auth(
          { bot_id: TELEGRAM_BOT_ID, request_access: true },
          async (user: TelegramUser | false) => {
            clearSafetyTimeout();
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

                showToast({
                  id: "auth-telegram-auth-success",
                  dedupeKey: "auth-telegram-auth-success",
                  title: t("auth.telegram.successTitle"),
                  message: t("auth.telegram.successMessage"),
                  color: "green",
                  withBorder: true,
                });
              }
            } catch (err: unknown) {
              showToast({
                id: "auth-telegram-auth-error",
                dedupeKey: "auth-telegram-auth-error",
                color: "red",
                title: t("common.error"),
                message: getErrorMessage(err, t("auth.telegram.errorMessage")),
              });
            } finally {
              setLoading(false);
            }
          }
        );
      } catch {
        clearSafetyTimeout();
        setLoading(false);
        setModalOpened(true);
      }
    } else {
      // Fallback: load Telegram widget script and retry
      setLoading(true);
      startSafetyTimeout();
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.onload = () => {
        clearSafetyTimeout();
        if (window.Telegram?.Login?.auth) {
          handleTelegramLogin();
        } else {
          setLoading(false);
          setModalOpened(true);
        }
      };
      script.onerror = () => {
        clearSafetyTimeout();
        setLoading(false);
        setModalOpened(true);
      };
      document.head.appendChild(script);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLogin, navigate, t, i18n, from]);

  const botUsername = ENV.TELEGRAM_BOT_USERNAME || "pravaonlineuzbot";
  const botUrl = `https://t.me/${botUsername}?start=desktop`;

  return (
    <>
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
          ? t("auth.telegram.loginButton", { defaultValue: "Telegram bilan kirish" })
          : t("auth.telegram.registerButton", { defaultValue: "Telegram orqali ro'yxatdan o'tish" })}
      </Button>

      {isTauri && !compact && (
        <Text
          size="xs"
          c="dimmed"
          ta="center"
          mt={4}
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => setModalOpened(true)}
        >
          {t("auth.telegram.botOption", { defaultValue: "Yoki @pravaonlineuzbot orqali kirish" })}
        </Text>
      )}

      {/* Modal: Telegram Bot orqali tezkor kirish (Desktop uchun 100% ishonchli usul) */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={
          <Group gap="xs">
            <ThemeIcon size="md" color="#229ED9" radius="md">
              <IconBrandTelegram size={20} />
            </ThemeIcon>
            <Text fw={700} fz="md">
              Telegram orqali kirish
            </Text>
          </Group>
        }
        centered
        radius="lg"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Desktop ilovada eng qulay va tezkor kirish — Telegram botimiz orqali:
          </Text>

          <Stack
            gap="xs"
            p="md"
            style={{
              background: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
            }}
          >
            <Text size="xs" fw={700} c="dimmed">
              1-QADAM:
            </Text>
            <Text size="sm">
              Quyidagi tugmani bosing va botga <Text span fw={700} c="#229ED9">/start</Text> buyrug‘ini yuboring:
            </Text>
            <Anchor href={botUrl} target="_blank" rel="noopener noreferrer">
              <Button
                fullWidth
                variant="light"
                color="#229ED9"
                leftSection={<IconBrandTelegram size={18} />}
                rightSection={<IconExternalLink size={16} />}
              >
                @{botUsername} botini ochish
              </Button>
            </Anchor>
          </Stack>

          <Divider label="va keyin" labelPosition="center" />

          <Stack
            gap="xs"
            p="md"
            style={{
              background: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
            }}
          >
            <Text size="xs" fw={700} c="dimmed">
              2-QADAM:
            </Text>
            <Text size="sm">
              Bot sizga yuborgan <Text span fw={600}>kirish havolasi</Text> yoki <Text span fw={600}>login kodini</Text> bu yerga kiriting:
            </Text>
            <TextInput
              placeholder="Masalan: https://pravaonline.uz/auth/telegram-callback?token=... yoki kod"
              leftSection={<IconKey size={18} />}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTokenSubmit();
                }
              }}
              size="sm"
              radius="md"
            />
            <Button
              fullWidth
              color="#229ED9"
              loading={submittingToken}
              disabled={!tokenInput.trim()}
              onClick={() => handleTokenSubmit()}
              radius="md"
            >
              Tizimga kirish
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
};

export default TelegramLoginButton;

