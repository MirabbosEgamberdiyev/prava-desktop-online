import { useState } from "react";
import { useTranslation } from "react-i18next";
import { register } from "../api";
import { saveTokens } from "../auth";
import { UserResponse } from "../types";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";

interface Props {
  onRegistered: (user: UserResponse) => void;
  onGoLogin: () => void;
}

export default function RegisterScreen({ onRegistered, onGoLogin }: Props) {
  const { t } = useTranslation();
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password,    setPassword]    = useState("");
  const [code,        setCode]        = useState("777777");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) { setError(t("auth.firstNameRequired")); return; }
    if (!phoneNumber.trim()) { setError(t("auth.phoneRequired")); return; }
    if (!password.trim()) { setError(t("auth.passwordRequired")); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await register(
        firstName.trim(),
        phoneNumber.trim(),
        password,
        lastName.trim() || undefined,
        code.trim() || "777777"
      );
      saveTokens(res.accessToken, res.refreshToken, res.user);
      onRegistered(res.user);
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
          <p>{t("auth.registerTitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="license-form">
          <div className="form-group">
            <label>{t("auth.firstName")} *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("auth.firstNamePlaceholder")}
              className="license-input"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t("auth.lastName")}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("auth.lastNamePlaceholder")}
              className="license-input"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>{t("auth.phone")} *</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t("auth.phonePlaceholder")}
              className="license-input"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>{t("auth.password")} *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              className="license-input"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>{t("auth.verificationCode")}</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="777777"
              className="license-input"
              disabled={loading}
            />
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
              {t("auth.verificationHint")}
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="activate-btn"
            disabled={loading || !firstName.trim() || !phoneNumber.trim() || !password.trim()}
          >
            {loading ? t("auth.registering") : t("auth.register")}
          </button>
        </form>

        <div className="machine-id-section">
          <button type="button" className="machine-id-btn" onClick={onGoLogin}>
            {t("auth.haveAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
