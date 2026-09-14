import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  offlineDatasetManager,
  type PreloadProgress,
  EXPECTED_QUESTIONS_COUNT,
  EXPECTED_TICKETS_COUNT,
} from "../../services/offlineDatasetManager";
import {
  IconCheck,
  IconDownload,
  IconRefresh,
  IconDatabase,
  IconPhoto,
  IconTicket,
  IconAlertCircle,
  IconX,
} from "@tabler/icons-react";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OfflinePreparationModal({ opened, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<PreloadProgress>(offlineDatasetManager.getProgress());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opened) return;
    const unsub = offlineDatasetManager.subscribe((p) => {
      setProgress(p);
      if (p.status === "READY") {
        setLoading(false);
      }
    });

    // Check readiness on open
    offlineDatasetManager.checkReadiness().then((res) => {
      if (res.ready) {
        setProgress((prev) => ({ ...prev, status: "READY", overallPercent: 100 }));
      }
    });

    return () => unsub();
  }, [opened]);

  if (!opened) return null;

  const handleStartPreload = async () => {
    setLoading(true);
    try {
      await offlineDatasetManager.startPreload(true);
      if (onSuccess) onSuccess();
    } catch {
      setLoading(false);
    }
  };

  const isComplete = progress.status === "READY";
  const isFailed = progress.status === "FAILED";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--mantine-color-body, #ffffff)",
          color: "var(--mantine-color-text, #1e293b)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--mantine-color-default-border, #e2e8f0)",
          overflow: "hidden",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--mantine-color-default-border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: isComplete ? "#ecfdf5" : "#eff6ff",
                color: isComplete ? "#10b981" : "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isComplete ? <IconCheck size={22} /> : <IconDownload size={22} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                {t("offline.prepTitle", "Offline rejimni tayyorlash")}
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                {isComplete
                  ? t("offline.prepReadySubtitle", "Internet bo'lmasa ham imtihon topshira olasiz")
                  : t("offline.prepSubtitle", "Barcha savol va rasmlar qurilmaga yuklanadi")}
              </p>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              style={{
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
              }}
            >
              <IconX size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {/* Main Progress Bar */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
              <span>{t("offline.overallProgress", "Umumiy yuklanish")}</span>
              <span style={{ color: isComplete ? "#10b981" : "#3b82f6" }}>
                {progress.overallPercent}%
              </span>
            </div>
            <div
              style={{
                height: "10px",
                width: "100%",
                backgroundColor: "#e2e8f0",
                borderRadius: "9999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress.overallPercent}%`,
                  backgroundColor: isComplete ? "#10b981" : isFailed ? "#ef4444" : "#3b82f6",
                  transition: "width 0.3s ease",
                  borderRadius: "9999px",
                }}
              />
            </div>
          </div>

          {/* Detailed Metric Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            {/* Questions item */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                backgroundColor: "var(--mantine-color-default-hover, #f8fafc)",
                borderRadius: "10px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <IconDatabase size={18} color="#6366f1" />
                <span>{t("offline.questions", "Savollar")}</span>
              </div>
              <span style={{ fontWeight: 600, color: "#334155" }}>
                {progress.questionsCurrent} / {EXPECTED_QUESTIONS_COUNT}
              </span>
            </div>

            {/* Tickets item */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                backgroundColor: "var(--mantine-color-default-hover, #f8fafc)",
                borderRadius: "10px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <IconTicket size={18} color="#0ea5e9" />
                <span>{t("offline.tickets", "Biletlar")}</span>
              </div>
              <span style={{ fontWeight: 600, color: "#334155" }}>
                {progress.ticketsCurrent} / {EXPECTED_TICKETS_COUNT}
              </span>
            </div>

            {/* Media item */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                backgroundColor: "var(--mantine-color-default-hover, #f8fafc)",
                borderRadius: "10px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <IconPhoto size={18} color="#f59e0b" />
                <span>{t("offline.media", "Savol rasmlari")}</span>
              </div>
              <span style={{ fontWeight: 600, color: "#334155" }}>
                {progress.mediaCurrent} / {progress.mediaTotal || 747}
              </span>
            </div>
          </div>

          {/* Status Message */}
          {progress.currentTaskMessage && (
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: isFailed ? "#ef4444" : "#64748b", textAlign: "center" }}>
              {isFailed && <IconAlertCircle size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />}
              {progress.currentTaskMessage}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            {isComplete ? (
              <button
                onClick={() => {
                  onClose();
                  if (onSuccess) onSuccess();
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <IconCheck size={18} />
                {t("offline.startNow", "Boshlash")}
              </button>
            ) : (
              <>
                <button
                  disabled={loading}
                  onClick={handleStartPreload}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "#3b82f6",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {loading ? (
                    <>
                      <IconRefresh size={18} className="animate-spin" />
                      {t("offline.downloading", "Yuklanmoqda...")}
                    </>
                  ) : (
                    <>
                      <IconDownload size={18} />
                      {t("offline.startDownload", "Offline tayyorlash")}
                    </>
                  )}
                </button>
                <button
                  disabled={loading}
                  onClick={onClose}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    color: "#64748b",
                    border: "1px solid #cbd5e1",
                    fontWeight: 500,
                    fontSize: "14px",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {t("common.cancel", "Yopish")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
