import { useState } from "react";
import { useTranslation } from "react-i18next";
import { forgotPassword, resetPassword } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";

interface Props {
  onDone: () => void;       // Parol tiklangach Login ekraniga qaytish
  onBack: () => void;       // Bekor qilish
}

type Step = "request" | "verify";

export default function ForgotPasswordScreen({ onDone, onBack }: Props) {
  const { t } = useTranslation();
  const [step, setStep]         = useState<Step>("request");
  const [identifier, setId]     = useState("");
  // Kod aynan qaysi manzilga yuborilgani — backend qaytargan kanonik qiymat.
  // Reset so'rovida shuni yuborish shart, aks holda kod tekshiruvi topilmaydi.
  const [recipient, setRecipient] = useState("");
  const [code, setCode]         = useState("");
  const [newPassword, setNew]   = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // ikki marta yuborishdan himoya
    const phone = identifier.trim().replace(/\D/g, "");
    if (phone.length < 12) {
      setError(t("auth.phoneRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await forgotPassword(phone);
      setInfo(t("auth.codeSent", { defaultValue: "Tasdiqlash kodi yuborildi" }));
      setId(phone);
      setRecipient(res?.recipient || phone);
      setStep("verify");
    } catch (err) {
      console.error("[ForgotPassword] request failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // ikki marta yuborishdan himoya
    if (code.length < 6) { setError(t("auth.codeRequired", { defaultValue: "6 xonali kod kiriting" })); return; }
    if (newPassword.length < 6) { setError(t("auth.passwordRequired")); return; }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(recipient || identifier, code.trim(), newPassword);
      onDone();
    } catch (err) {
      console.error("[ResetPassword] failed:", err);
      setError(err instanceof Error ? err.message : String(err));
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
          <p>{t("auth.forgotTitle", { defaultValue: "Parolni tiklash" })}</p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequest} className="license-form">
            <div className="form-group">
              <label>{t("auth.phone")} *</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => { setId(e.target.value); if (error) setError(null); }}
                placeholder="+998 90 123 45 67"
                className="license-input"
                disabled={loading}
                inputMode="tel"
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="activate-btn" disabled={loading || !identifier.trim()}>
              {loading
                ? t("auth.sending", { defaultValue: "Yuborilmoqda..." })
                : t("auth.sendCode", { defaultValue: "Kod yuborish" })}
            </button>
            <button
              type="button"
              className="activate-btn activate-btn--secondary"
              onClick={onBack}
              disabled={loading}
            >
              {t("common.back")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="license-form">
            {info && <div className="success-message" role="status">{info}</div>}

            <div className="form-group">
              <label>{t("auth.verificationCode")} *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); if (error) setError(null); }}
                placeholder="123456"
                className="license-input"
                disabled={loading}
                autoFocus
              />
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                {t("auth.verificationHint")}
              </p>
            </div>
            <div className="form-group">
              <label>{t("auth.newPassword", { defaultValue: "Yangi parol" })} *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => { setNew(e.target.value); if (error) setError(null); }}
                  placeholder={t("auth.passwordPlaceholder")}
                  className="license-input"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none", cursor: "pointer", fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                  tabIndex={-1}
                  aria-label={showPwd ? t("auth.hidePassword", { defaultValue: "Parolni yashirish" }) : t("auth.showPassword", { defaultValue: "Parolni ko'rsatish" })}
                >
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="activate-btn" disabled={loading || code.length < 6 || newPassword.length < 6}>
              {loading
                ? t("auth.resetting", { defaultValue: "Tiklanmoqda..." })
                : t("auth.resetPassword", { defaultValue: "Parolni tiklash" })}
            </button>
            <button
              type="button"
              className="activate-btn activate-btn--secondary"
              onClick={() => { setStep("request"); setError(null); setInfo(null); setCode(""); setNew(""); }}
              disabled={loading}
            >
              {t("common.back")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
