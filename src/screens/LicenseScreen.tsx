import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { activateLicense, getMachineId } from "../api";
import { LicenseStatus } from "../types";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";

interface Props {
  onActivated: (status: LicenseStatus) => void;
  onCancel?: () => void;
}

export default function LicenseScreen({ onActivated, onCancel }: Props) {
  const { t } = useTranslation();
  const [activationCode, setActivationCode] = useState("");
  const [machineId, setMachineId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMachineId().then(setMachineId).catch((e) => console.warn("[LicenseScreen] getMachineId failed:", e));
  }, []);

  // "Nusxalandi" timeout'ini unmount'da tozalash
  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) {
      setError(t("license.errorEmpty"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const status = await activateLicense(activationCode.trim());
      onActivated(status);
    } catch (err) {
      // Tauri invoke string bilan reject qiladi, lekin Error/obyekt ham kelishi
      // mumkin — normallashtirmasak ekranda "[object Object]" chiqib qolardi.
      setError(
        typeof err === "string" ? err
        : err instanceof Error ? err.message
        : t("license.errorInvalid", { defaultValue: "Aktivatsiya kodi noto'g'ri" })
      );
    } finally {
      setLoading(false);
    }
  };

  const markCopied = () => {
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(machineId);
      markCopied();
    } catch {
      const ta = document.createElement("textarea");
      ta.value = machineId;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      markCopied();
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
          <h2 style={{ margin: "8px 0 0", fontSize: 20, fontWeight: 700 }}>{t("license.title")}</h2>
          <p>{t("license.subtitle")}</p>
        </div>

        <div className="machine-id-box">
          <div className="machine-id-header">{t("license.machineId")}</div>
          <div className="machine-id-row">
            <code className="machine-id-value">{machineId || t("license.machineIdLoading")}</code>
            {machineId && (
              <button type="button" className="copy-btn" onClick={handleCopy}>
                {copied ? t("license.copied") : t("license.copy")}
              </button>
            )}
          </div>
          <p className="machine-id-hint">{t("license.machineIdHint")}</p>
        </div>

        <form onSubmit={handleActivate} className="license-form">
          <div className="form-group">
            <label htmlFor="activation-code">{t("license.activationCode")}</label>
            <input
              id="activation-code"
              type="text"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              placeholder={t("license.activationPlaceholder")}
              className="license-input"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="activate-btn"
            disabled={loading || !activationCode.trim()}
          >
            {loading ? t("license.activating") : t("license.activate")}
          </button>

          {onCancel && (
            <button
              type="button"
              className="activate-btn"
              style={{ marginTop: 10, background: "transparent", color: "inherit", border: "1px solid currentColor" }}
              onClick={onCancel}
              disabled={loading}
            >
              {t("common.back", { defaultValue: "Ortga" })}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
