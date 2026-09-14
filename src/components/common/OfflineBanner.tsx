import { IconWifiOff, IconWifi } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useConnectionMonitor } from "../../hooks/useConnectionMonitor";

/**
 * Imtihon davomida internet holatini ko'rsatadi.
 *
 * `useConnectionMonitor` hooki mavjud edi, lekin hech qayerda ISHLATILMAGAN edi
 * (o'lik kod). Natijada internet uzilganda foydalanuvchi buni bilmasdan
 * javob berishda davom etardi va faqat "Yakunlash" bosganda xato ko'rardi.
 *
 * Endi: offline bo'lganda doimiy ogohlantirish + javoblar qurilmada
 * saqlanayotgani haqida tinchlantiruvchi xabar; internet qaytganda esa
 * qisqa muddatli tasdiq.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline, wasOffline } = useConnectionMonitor();

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
            {t("errors.noInternetTitle", { defaultValue: "Internet aloqasi yo'q" })}
          </strong>
          {" — "}
          {t("exam.offlineAnswersSafe", {
            defaultValue:
              "Javoblaringiz qurilmangizda saqlanmoqda. Aloqa tiklangach avtomatik yuboriladi.",
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
