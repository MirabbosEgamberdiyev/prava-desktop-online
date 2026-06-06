import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { googleLogin, telegramLogin } from "../api";
import { saveTokens } from "../auth";
import { UserResponse } from "../types";

// ─── Google Client ID (web sayt bilan bir xil) ──────────────────────────────
const GOOGLE_CLIENT_ID =
  "237372892439-4bju17u6k3cjoil26p148m21ilmecd9s.apps.googleusercontent.com";

// ─── Telegram Bot ID ─────────────────────────────────────────────────────────
const TELEGRAM_BOT_ID = 8485868847;

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.04 24.04 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// ─── Declare Telegram global type ────────────────────────────────────────────
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
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
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

// ─── Shared button style ─────────────────────────────────────────────────────
const btnStyle = (bg: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border)",
  cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "opacity 0.2s",
  background: bg, color: bg === "#fff" ? "#333" : "#fff",
});

// ─── Google Login Button ─────────────────────────────────────────────────────
export function GoogleLoginBtn({
  onSuccess,
  disabled,
}: {
  onSuccess: (user: UserResponse) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleClick = useCallback(() => {
    if (!window.google?.accounts?.oauth2) {
      setError(t("auth.googleNotLoaded", { defaultValue: "Google yuklanmadi. Internet bilan tekshiring." }));
      return;
    }

    setError(null);
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: async (response) => {
        if (response.error || !response.access_token) {
          setError("Google avtorizatsiya bekor qilindi");
          return;
        }
        setLoading(true);
        try {
          const res = await googleLogin(response.access_token);
          saveTokens(res.accessToken, res.refreshToken, res.user);
          onSuccess(res.user);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      },
    });
    client.requestAccessToken();
  }, [onSuccess, t]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        style={{ ...btnStyle("#fff"), opacity: loading ? 0.6 : 1 }}
      >
        <GoogleIcon />
        {loading
          ? t("auth.loggingIn")
          : t("auth.googleLogin", { defaultValue: "Google bilan kirish" })
        }
      </button>
      {error && <p style={{ color: "#e03131", fontSize: 12, margin: "4px 0 0", textAlign: "center" }}>{error}</p>}
    </>
  );
}

// ─── Telegram Login Button ───────────────────────────────────────────────────
export function TelegramLoginBtn({
  onSuccess,
  disabled,
}: {
  onSuccess: (user: UserResponse) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleClick = useCallback(() => {
    setError(null);

    const doAuth = () => {
      if (!window.Telegram?.Login?.auth) {
        setError(t("auth.telegramNotLoaded", { defaultValue: "Telegram yuklanmadi. Internet bilan tekshiring." }));
        return;
      }

      setLoading(true);
      window.Telegram.Login.auth(
        { bot_id: TELEGRAM_BOT_ID, request_access: true },
        async (user) => {
          if (!user) {
            setLoading(false);
            return;
          }
          try {
            const res = await telegramLogin({
              id: user.id,
              firstName: user.first_name,
              lastName: user.last_name || "",
              username: user.username || "",
              photoUrl: user.photo_url || "",
              authDate: user.auth_date,
              hash: user.hash,
            });
            saveTokens(res.accessToken, res.refreshToken, res.user);
            onSuccess(res.user);
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          } finally {
            setLoading(false);
          }
        }
      );
    };

    if (window.Telegram?.Login?.auth) {
      doAuth();
    } else {
      // Load Telegram script and retry
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.onload = () => setTimeout(doAuth, 300);
      script.onerror = () => setError("Telegram skripti yuklanmadi");
      document.head.appendChild(script);
    }
  }, [onSuccess, t]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        style={{ ...btnStyle("#229ED9"), opacity: loading ? 0.6 : 1 }}
      >
        <TelegramIcon />
        {loading
          ? t("auth.loggingIn")
          : t("auth.telegramLogin", { defaultValue: "Telegram bilan kirish" })
        }
      </button>
      {error && <p style={{ color: "#e03131", fontSize: 12, margin: "4px 0 0", textAlign: "center" }}>{error}</p>}
    </>
  );
}
