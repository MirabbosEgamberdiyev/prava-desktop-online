import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { ComprehensiveStatisticsResponse, LocalizedText } from "../types";
import { getMyStats } from "../api";
import {
  IconArrowLeft, IconTrophy, IconCheck, IconX, IconTicket,
  IconChartBar, IconBook2, IconAlertTriangle, IconRefresh,
} from "@tabler/icons-react";

interface Props { onBack: () => void; }

type Tab = "summary" | "tickets" | "topics";

function getLocal(lt?: LocalizedText | null): string {
  if (!lt) return "";
  const l = i18n.language;
  if (l === "uzc" && lt.uzc) return lt.uzc;
  if (l === "ru" && lt.ru) return lt.ru;
  if (l === "en" && lt.en) return lt.en;
  return lt.uzl || lt.uzc || lt.ru || lt.en || "";
}

export default function StatsScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const [tab, setTab]         = useState<Tab>("summary");
  const [stats, setStats]     = useState<ComprehensiveStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // ⚠️ Ilgari so'rov muvaffaqiyatsiz bo'lsa xato yutib yuborilardi va ekran
  // "hali imtihon topshirmagansiz" deb ko'rsatardi — foydalanuvchi statistikasi
  // yo'qolgandek tuyulardi. Endi xato holati va "qayta urinish" bor.
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyStats()
      .then(setStats)
      .catch((e) => {
        console.warn("[StatsScreen] getMyStats failed:", e);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="stats-screen">
      <header className="stats-header">
        <button type="button" className="quiz-back-btn" style={{ position: "static" }} onClick={onBack} aria-label={t("common.back")}>
          <IconArrowLeft size={18} />
        </button>
        <h2 className="stats-header-title">{t("stats.title")}</h2>
      </header>

      {/* Tabs */}
      <div className="stats-tabs" role="tablist" aria-label={t("stats.title")}>
        <button
          type="button" role="tab" aria-selected={tab === "summary"}
          className={`stats-tab-btn${tab === "summary" ? " active" : ""}`}
          onClick={() => setTab("summary")}
        >
          <IconChartBar size={15} />
          {t("stats.tabSummary")}
        </button>
        <button
          type="button" role="tab" aria-selected={tab === "tickets"}
          className={`stats-tab-btn${tab === "tickets" ? " active" : ""}`}
          onClick={() => setTab("tickets")}
        >
          <IconTicket size={15} />
          {t("stats.tabTickets")}
        </button>
        <button
          type="button" role="tab" aria-selected={tab === "topics"}
          className={`stats-tab-btn${tab === "topics" ? " active" : ""}`}
          onClick={() => setTab("topics")}
        >
          <IconBook2 size={15} />
          {t("stats.tabTopics")}
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : error ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="empty-state-icon"><IconAlertTriangle size={48} stroke={1.5} color="var(--danger)" /></div>
          <p className="empty-state-text state-error-title">{t("common.error")}</p>
          <p className="empty-state-sub state-error-detail">{error}</p>
          <button type="button" className="retry-btn" onClick={load}>
            <IconRefresh size={15} /> {t("exam.retry")}
          </button>
        </div>
      ) : (
        <div className="stats-content">
          <div className="stats-container">

            {/* ── SUMMARY ── */}
            {tab === "summary" && (
              <div className="stats-section-card">
                <div className="stats-section-header">
                  <span className="stats-section-icon"><IconChartBar size={17} /></span>
                  <span className="stats-section-title">{t("stats.tabSummary")}</span>
                </div>
                {!stats?.summary ? (
                  <p className="stats-empty-hint">{t("stats.noExams")}</p>
                ) : (
                  <div style={{ padding: "16px" }}>
                    <div className="stats-cards" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                      <SummaryCard
                        icon={<IconTrophy size={22} />}
                        value={String(stats.summary.totalExams ?? 0)}
                        label={t("stats.totalExams")}
                        color="var(--accent-purple)"
                      />
                      <SummaryCard
                        icon={<IconCheck size={22} />}
                        value={`${Math.round(stats.summary.averageScore ?? 0)}%`}
                        label={t("stats.avgScore")}
                        color="var(--success)"
                      />
                      <SummaryCard
                        icon={<IconCheck size={22} />}
                        value={String(stats.summary.correctAnswers ?? 0)}
                        label={t("stats.totalCorrect")}
                        color="var(--primary)"
                      />
                      <SummaryCard
                        icon={<IconX size={22} />}
                        value={String(stats.summary.wrongAnswers ?? 0)}
                        label={t("stats.totalWrong")}
                        color="var(--danger)"
                      />
                    </div>

                    {/* Pass rate bar */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                        <span>{t("stats.passRate")}</span>
                        <span style={{ color: "var(--primary)" }}>{Math.round(stats.summary.passRate ?? 0)}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={t("stats.passRate")}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(stats.summary.passRate ?? 0)}
                        style={{ height: 10, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}
                      >
                        <div style={{
                          height: "100%", borderRadius: 99,
                          // 0..100 oralig'idan chiqib ketmasin (backend 100 dan
                          // katta qiymat qaytarsa bar konteynerdan oshib ketardi)
                          width: `${Math.min(100, Math.max(0, stats.summary.passRate ?? 0))}%`,
                          background: (stats.summary.passRate ?? 0) >= 70
                            ? "var(--success)"
                            : "var(--warning)",
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TICKETS ── */}
            {tab === "tickets" && (
              <div className="stats-section-card">
                <div className="stats-section-header">
                  <span className="stats-section-icon"><IconTicket size={17} /></span>
                  <span className="stats-section-title">{t("stats.tabTickets")}</span>
                </div>
                {!stats?.ticketStats || stats.ticketStats.length === 0 ? (
                  <p className="stats-empty-hint">{t("stats.noTickets")}</p>
                ) : (
                  <div className="td-list">
                    {stats.ticketStats.map((tk) => {
                      const passed = (tk.passedExams ?? 0) > 0;
                      const attempted = (tk.totalExams ?? 0) > 0;
                      return (
                        <div key={tk.ticketId} className={`td-row${passed ? " ready" : attempted ? " average" : ""}`}>
                          <div className="td-left">
                            <span className="td-num">#{tk.ticketNumber}</span>
                            <span className="td-name">{getLocal(tk.ticketName)}</span>
                          </div>
                          <div className="td-right">
                            {tk.bestScore != null && (
                              <span className="td-score">{Math.round(tk.bestScore)}%</span>
                            )}
                            {attempted && (
                              <span className="td-attempts">×{tk.totalExams}</span>
                            )}
                            {passed ? (
                              <span className="rd-badge rd-ready"><IconCheck size={11} />{t("stats.passed")}</span>
                            ) : attempted ? (
                              <span className="rd-badge rd-avg">{t("stats.failed")}</span>
                            ) : (
                              <span className="rd-badge rd-none">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TOPICS ── */}
            {tab === "topics" && (
              <div className="stats-section-card">
                <div className="stats-section-header">
                  <span className="stats-section-icon"><IconBook2 size={17} /></span>
                  <span className="stats-section-title">{t("stats.tabTopics")}</span>
                </div>
                {!stats?.topicStats || stats.topicStats.length === 0 ? (
                  <p className="stats-empty-hint">{t("stats.noTopics")}</p>
                ) : (
                  <div className="td-list">
                    {stats.topicStats.map((tp) => (
                      <div key={tp.topicId} className="td-row">
                        <div className="td-left">
                          <span className="td-name">{getLocal(tp.topicName)}</span>
                        </div>
                        <div className="td-right">
                          <span className="td-score">{Math.round(tp.averageScore ?? 0)}%</span>
                          <span className="td-attempts">×{tp.totalExams}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="stats-card">
      <div style={{ color, display: "flex" }}>{icon}</div>
      <div className="stats-card-value">{value}</div>
      <div className="stats-card-label">{label}</div>
    </div>
  );
}
