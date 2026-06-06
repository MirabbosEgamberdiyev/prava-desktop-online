import { useState } from "react";
import { useTranslation } from "react-i18next";
import { login } from "../api";
import { saveTokens } from "../auth";
import { UserResponse } from "../types";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";
import { IconUser, IconLock, IconEye, IconEyeOff } from "@tabler/icons-react";
import { GoogleLoginBtn, TelegramLoginBtn } from "../components/SocialAuth";

interface Props {
  onLoggedIn: (user: UserResponse) => void;
  onGoRegister: () => void;
  onForgotPassword?: () => void;
}

export default function LoginScreen({ onLoggedIn, onGoRegister, onForgotPassword }: Props) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || identifier.trim().length < 3) {
      setError(t("auth.identifierRequired"));
      return;
    }
    if (!password || password.length < 6) {
      setError(t("auth.passwordRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await login(identifier.trim(), password);
      saveTokens(res.accessToken, res.refreshToken, res.user);
      onLoggedIn(res.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="license-screen">
      <div className="license-topbar">
        <LanguagePicker />
        <ThemeToggle />
      </div>
      <div className="license-card">
        <div className="license-logo">
          <img src="/logo.png" alt="Prava" onError={(e) => (e.currentTarget.style.display = "none")} />
          <h2 style={{ margin: 0 }}>Prava Online</h2>
          <p>{t("auth.loginTitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="license-form">
          {/* Identifier */}
          <div className="form-group">
            <label>{t("auth.phone")}</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", display: "flex",
              }}>
                <IconUser size={16} />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("auth.identifierPlaceholder")}
                className="license-input"
                style={{ paddingLeft: 34 }}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label>{t("auth.password")}</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", display: "flex",
              }}>
                <IconLock size={16} />
              </span>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                className="license-input"
                style={{ paddingLeft: 34, paddingRight: 38 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", display: "flex", padding: 4,
                }}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPwd ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                style={{
                  margin: "6px 0 0", padding: 0, background: "transparent", border: "none",
                  color: "var(--primary)", cursor: "pointer", fontSize: 12, textDecoration: "underline",
                }}
                disabled={loading}
              >
                {t("auth.forgotPassword", { defaultValue: "Parolni unutdingizmi?" })}
              </button>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="activate-btn"
            disabled={loading || !identifier.trim() || !password}
          >
            {loading ? t("auth.loggingIn") : t("auth.login")}
          </button>
        </form>

        {/* Social Login */}
        <div style={{ margin: "16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {t("auth.orContinueWith", { defaultValue: "yoki" })}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <GoogleLoginBtn onSuccess={onLoggedIn} disabled={loading} />
          <TelegramLoginBtn onSuccess={onLoggedIn} disabled={loading} />
        </div>

        <div className="machine-id-section">
          <button type="button" className="machine-id-btn" onClick={onGoRegister}>
            {t("auth.noAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
