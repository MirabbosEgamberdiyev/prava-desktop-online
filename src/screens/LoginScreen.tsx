import { useState } from "react";
import { useTranslation } from "react-i18next";
import { login } from "../api";
import { saveTokens } from "../auth";
import { UserResponse } from "../types";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";

interface Props {
  onLoggedIn: (user: UserResponse) => void;
  onGoRegister: () => void;
}

export default function LoginScreen({ onLoggedIn, onGoRegister }: Props) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]     = useState(false);
  const [error,      setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError(t("auth.identifierRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await login(identifier.trim(), password);
      saveTokens(res.accessToken, res.refreshToken, res.user);
      onLoggedIn(res.user);
    } catch (err) {
      setError(String(err));
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
          <div className="form-group">
            <label>{t("auth.phone")}</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t("auth.identifierPlaceholder")}
              className="license-input"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t("auth.password")}</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                className="license-input"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer", fontSize: 14,
                  color: "var(--text-muted)", lineHeight: 1,
                }}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPwd ? "🙈" : "👁"}
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
            disabled={loading || !identifier.trim() || !password.trim()}
          >
            {loading ? t("auth.loggingIn") : t("auth.login")}
          </button>
        </form>

        <div className="machine-id-section">
          <button type="button" className="machine-id-btn" onClick={onGoRegister}>
            {t("auth.noAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
