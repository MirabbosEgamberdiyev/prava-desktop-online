import { useTranslation } from "react-i18next";
import { IconRefresh, IconKey, IconAlertTriangle } from "@tabler/icons-react";
import type { LicenseStatus } from "../types";
import "./LicenseBar.css";

interface Props {
  status: LicenseStatus | null;
  onRenew: () => void;
}

/**
 * Fixed top-left bar showing license days remaining and a Renew button.
 * Always visible on every post-license screen.
 */
export default function LicenseBar({ status, onRenew }: Props) {
  const { t } = useTranslation();
  if (!status) return null;

  const days = Math.max(0, status.days_remaining ?? 0);

  // Colour by urgency
  let level: "ok" | "warn" | "crit" = "ok";
  if (days <= 3) level = "crit";
  else if (days <= 14) level = "warn";

  return (
    <div className={`license-bar license-bar--${level}`} role="status">
      <div className="license-bar__icon" aria-hidden="true">
        {level === "crit" ? <IconAlertTriangle size={16} /> : <IconKey size={16} />}
      </div>
      <div className="license-bar__info">
        <div className="license-bar__days">
          {days > 0
            ? t("license.daysRemaining", { count: days, defaultValue: "{{count}} kun qoldi" })
            : t("license.expired", { defaultValue: "Muddati tugagan" })}
        </div>
        <div className="license-bar__expires">
          {t("license.until", { defaultValue: "Tugaydi" })}: {status.expires_at}
        </div>
      </div>
      <button
        type="button"
        className="license-bar__renew"
        onClick={onRenew}
        title={t("license.renewTitle", { defaultValue: "Aktivatsiya kodini yangilash" })}
      >
        <IconRefresh size={14} />
        <span>{t("license.renew", { defaultValue: "Yangilash" })}</span>
      </button>
    </div>
  );
}
