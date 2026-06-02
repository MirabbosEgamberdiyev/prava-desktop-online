import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { activateLicense, getMachineId } from "../api";
import { LicenseStatus } from "../types";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";

interface Props {
  onActivated: (status: LicenseStatus) => void;
}

export default function LicenseScreen({ onActivated }: Props) {
  const { t } = useTranslation();
  const [activationCode, setActivationCode] = useState("");
  const [machineId, setMachineId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMachineId().then(setMachineId).catch(() => {});
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
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = machineId;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        </form>
      </div>
    </div>
  );
}
