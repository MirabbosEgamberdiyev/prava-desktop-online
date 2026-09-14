import { useState, useEffect } from "react";
import { IconWifiOff, IconWifi } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useConnectionMonitor } from "../../hooks/useConnectionMonitor";
import { OutboxQueue } from "../../sync/outboxQueue";

/**
 * Imtihon davomida internet holatini ko'rsatadi.
 *
 * Offline bo'lganda doimiy ogohlantirish + javoblar qurilmada
 * saqlanayotgani va kutayotgan navbat soni haqida tinchlantiruvchi xabar;
 * internet qaytganda esa avtomatik sinxronlash tasdig'i.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline, wasOffline } = useConnectionMonitor();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const updateCount = async () => {
      try {
        const pending = await OutboxQueue.getPending();
        if (mounted) setPendingCount(pending.length);
      } catch {
        // ignore
      }
    };

    updateCount();
    window.addEventListener("prava-storage-changed", updateCount);
    window.addEventListener("sync-status-changed", updateCount);

    return () => {
      mounted = false;
      window.removeEventListener("prava-storage-changed", updateCount);
      window.removeEventListener("sync-status-changed", updateCount);
    };
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="assertive"
        style={{
          flexShrink: 0,
          width: "100%",
          minHeight: "38px",
          background: "linear-gradient(90deg, #d9480f 0%, #f76707 100%)",
          color: "#ffffff",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 2px 10px rgba(217, 72, 15, 0.35)",
          zIndex: 999,
          lineHeight: 1.4,
          textAlign: "center",
        }}
      >
        <IconWifiOff size={18} stroke={2.2} style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ fontWeight: 800 }}>
            {t("errors.noInternetTitle", { defaultValue: "Internet aloqasi yo'q (Oflayn rejim)" })}
          </strong>
          {" — "}
          {pendingCount > 0
            ? t("exam.offlineAnswersCount", {
                defaultValue: `Javoblaringiz (${pendingCount} ta o'zgarish) qurilmada xavfsiz saqlanmoqda. Aloqa tiklangach avtomatik sinxronlanadi.`,
                count: pendingCount,
              })
            : t("exam.offlineAnswersSafe", {
                defaultValue:
                  "Ilova 100% oflayn rejimda ishlamoqda. Javoblaringiz qurilmangizda xavfsiz saqlanadi.",
              })}
        </span>
      </div>
    );
  }

  if (wasOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          flexShrink: 0,
          width: "100%",
          minHeight: "36px",
          background: "linear-gradient(90deg, #2b8a3e 0%, #37b24d 100%)",
          color: "#ffffff",
          padding: "7px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 2px 10px rgba(43, 138, 62, 0.35)",
          zIndex: 999,
          lineHeight: 1.4,
          textAlign: "center",
        }}
      >
        <IconWifi size={18} stroke={2.2} style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ fontWeight: 800 }}>
            {t("exam.backOnlineTitle", { defaultValue: "Internet aloqasi tiklandi" })}
          </strong>
          {" — "}
          {t("exam.backOnline", {
            defaultValue: "Ma'lumotlar server bilan sinxronlanmoqda.",
          })}
        </span>
      </div>
    );
  }

  return null;
}

export default OfflineBanner;
