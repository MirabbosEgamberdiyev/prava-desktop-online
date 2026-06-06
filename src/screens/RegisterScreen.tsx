import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserResponse, AuthResponse } from "../types";
import { saveTokens } from "../auth";
import { http } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";
import {
  IconUser, IconLock, IconEye, IconEyeOff,
  IconAt, IconDeviceMobile, IconArrowLeft,
  IconMailShare, IconMessageShare,
} from "@tabler/icons-react";

interface Props {
  onRegistered: (user: UserResponse) => void;
  onGoLogin: () => void;
}

type VerificationType = "EMAIL" | "SMS";

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;
  if (/[@$!%*?&#]/.test(password)) strength += 25;
  return strength;
}

function getStrengthColor(strength: number): string {
  if (strength <= 25) return "#e03131";
  if (strength <= 50) return "#e67700";
  if (strength <= 75) return "#fcc419";
  return "#2f9e44";
}

export default function RegisterScreen({ onRegistered, onGoLogin }: Props) {
  const { t } = useTranslation();

  // Step 1: form data
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [email,        setEmail]        = useState("");
  const [phoneNumber,  setPhoneNumber]  = useState("");
  const [password,     setPassword]     = useState("");
  const [showPwd,      setShowPwd]      = useState(false);
  const [verifyType,   setVerifyType]   = useState<VerificationType>("EMAIL");

  // Step 2: OTP
  const [step,    setStep]    = useState<1 | 2>(1);
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const isEmailMode = verifyType === "EMAIL";

  const buildPayload = () => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim() || null,
    phoneNumber: phoneNumber.trim().replace(/\D/g, "") || null,
    password,
    verificationType: verifyType,
  });

  // Step 1: Init — send form data, backend sends OTP
  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || firstName.trim().length < 2) {
      setError(t("auth.firstNameRequired")); return;
    }
    if (isEmailMode && (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))) {
      setError(t("auth.emailRequired", { defaultValue: "To'g'ri email kiriting" })); return;
    }
    if (!isEmailMode && (!phoneNumber.trim() || phoneNumber.replace(/\D/g, "").length < 12)) {
      setError(t("auth.phoneRequired")); return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordMin", { defaultValue: "Parol kamida 8 ta belgi bo'lishi kerak" })); return;
    }

    setLoading(true);
    try {
      await http("/api/v1/auth/register/init", {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      });
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete — verify OTP and finish registration
  const handleComplete = async () => {
    if (code.length < 6) { setError(t("auth.codeRequired", { defaultValue: "6 xonali kodni kiriting" })); return; }
    setLoading(true);
    setError(null);
    try {
      const codeParam = encodeURIComponent(code);
      const res = await http<AuthResponse>(`/api/v1/auth/register/complete?code=${codeParam}`, {
        method: "POST",
        body: JSON.stringify(buildPayload()),
      });
      saveTokens(res.accessToken, res.refreshToken, res.user);
      onRegistered(res.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const pwdStrength = getPasswordStrength(password);

  return (
    <div className="license-screen">
      <div className="license-topbar">
        <LanguagePicker />
        <ThemeToggle />
      </div>
      <div className="license-card" style={{ maxWidth: 440 }}>
        <div className="license-logo">
          <img src="/logo.png" alt="Prava" onError={(e) => (e.currentTarget.style.display = "none")} />
          <h2 style={{ margin: 0 }}>Prava Online</h2>
          <p>{t("auth.registerTitle")}</p>
        </div>

        {/* ── STEP 1: Registration Form ── */}
        {step === 1 && (
          <form onSubmit={handleInit} className="license-form">
            {/* Name */}
            <div style={{ display: "flex", gap: 8 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t("auth.firstName")} *</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                    <IconUser size={16} />
                  </span>
                  <input
                    type="text" value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t("auth.firstNamePlaceholder")}
                    className="license-input" style={{ paddingLeft: 34 }}
                    disabled={loading} autoFocus
                  />
                </div>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t("auth.lastName")}</label>
                <input
                  type="text" value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("auth.lastNamePlaceholder")}
                  className="license-input" disabled={loading}
                />
              </div>
            </div>

            {/* Verification Type Switcher */}
            <div className="form-group">
              <label>{t("auth.verifyMethod", { defaultValue: "Tasdiqlash usuli" })}</label>
              <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                {(["EMAIL", "SMS"] as VerificationType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setVerifyType(type);
                      if (type === "SMS" && !phoneNumber) setPhoneNumber("998");
                    }}
                    style={{
                      flex: 1, padding: "8px 12px", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      fontSize: 13, fontWeight: 600,
                      background: verifyType === type ? "var(--primary)" : "var(--bg)",
                      color: verifyType === type ? "#fff" : "var(--text-muted)",
                      transition: "all 0.2s",
                    }}
                  >
                    {type === "EMAIL" ? <IconAt size={14} /> : <IconDeviceMobile size={14} />}
                    {type === "EMAIL" ? "Email" : "SMS"}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email {isEmailMode && "*"}</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                  <IconAt size={16} />
                </span>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className="license-input" style={{ paddingLeft: 34 }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label>{t("auth.phone")} {!isEmailMode && "*"}</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                  <IconDeviceMobile size={16} />
                </span>
                <input
                  type="text" value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="998XXXXXXXXX" maxLength={13}
                  className="license-input" style={{ paddingLeft: 34 }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label>{t("auth.password")} *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                  <IconLock size={16} />
                </span>
                <input
                  type={showPwd ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  className="license-input" style={{ paddingLeft: 34, paddingRight: 38 }}
                  disabled={loading}
                />
                <button
                  type="button" onClick={() => setShowPwd((s) => !s)}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", display: "flex", padding: 4,
                  }}
                  tabIndex={-1}
                >
                  {showPwd ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{
                  height: 4, borderRadius: 4, marginTop: 6,
                  background: "var(--border)", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 4,
                    width: `${pwdStrength}%`,
                    background: getStrengthColor(pwdStrength),
                    transition: "width 0.3s, background 0.3s",
                  }} />
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit" className="activate-btn"
              disabled={loading || !firstName.trim()}
            >
              {loading ? t("auth.registering") : t("auth.register")}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === 2 && (
          <div className="license-form">
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%", margin: "0 auto 12px",
                background: isEmailMode
                  ? "linear-gradient(135deg,#4dabf7,#1971c2)"
                  : "linear-gradient(135deg,#69db7c,#2f9e44)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isEmailMode
                  ? <IconMailShare size={28} color="#fff" />
                  : <IconMessageShare size={28} color="#fff" />
                }
              </div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>
                {isEmailMode
                  ? t("auth.otpSentEmail", { defaultValue: "Tasdiqlash kodi emailga yuborildi" })
                  : t("auth.otpSentPhone", { defaultValue: "Tasdiqlash kodi telefoningizga yuborildi" })
                }
              </p>
              <p style={{ fontWeight: 700, color: "var(--primary)", fontSize: 14, margin: 0 }}>
                {isEmailMode ? email : phoneNumber}
              </p>
            </div>

            <div className="form-group">
              <label>{t("auth.verificationCode")}</label>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {[0,1,2,3,4,5].map((i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={code[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const newCode = code.split("");
                      newCode[i] = val;
                      setCode(newCode.join("").slice(0, 6));
                      // Auto-focus next
                      if (val && i < 5) {
                        const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                        next?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !code[i] && i > 0) {
                        const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement;
                        prev?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      setCode(pasted);
                    }}
                    className="license-input"
                    style={{
                      width: 44, height: 48, textAlign: "center",
                      fontSize: 20, fontWeight: 700, padding: 0,
                    }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="button" className="activate-btn"
              disabled={loading || code.length < 6}
              onClick={handleComplete}
            >
              {loading ? t("auth.registering") : t("auth.confirm", { defaultValue: "Tasdiqlash" })}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setCode(""); setError(null); }}
              style={{
                marginTop: 12, padding: "8px 16px", background: "transparent",
                border: "none", cursor: "pointer", color: "var(--text-muted)",
                fontSize: 13, display: "flex", alignItems: "center", gap: 4,
                justifyContent: "center", width: "100%",
              }}
            >
              <IconArrowLeft size={14} />
              {t("common.back")}
            </button>
          </div>
        )}

        <div className="machine-id-section">
          <button type="button" className="machine-id-btn" onClick={onGoLogin}>
            {t("auth.haveAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
