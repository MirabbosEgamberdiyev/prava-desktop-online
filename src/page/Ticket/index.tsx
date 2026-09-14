import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { OfflineTicket, TicketStat } from "../../types/desktop";
import { getTickets, getTicketStats, getLang } from "../../services/desktopAdapter";
import SEO from "../../components/common/SEO";
import {
  IconArrowLeft,
  IconTicket,
  IconClock,
  IconListNumbers,
  IconCheck,
  IconPlayerPlay,
  IconLock,
} from "@tabler/icons-react";

export default function Tickets_Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : 1;

  const [tickets, setTickets] = useState<OfflineTicket[]>([]);
  const [statsMap, setStatsMap] = useState<Record<number, TicketStat>>({});
  const [loading, setLoading] = useState(true);

  const localizeName = (tk: OfflineTicket): string => {
    if (!tk) return "";
    const l = getLang();
    if (l === "uzc" && tk.name_uzc) return tk.name_uzc;
    if (l === "ru" && tk.name_ru) return tk.name_ru;
    return tk.name_uzl || tk.name_ru || tk.name_uzc || `${t("home.biletlar", "Bilet")} #${tk.ticket_number || ""}`;
  };

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([getTickets(), getTicketStats(userId)])
      .then(([tkts, stats]) => {
        setTickets(Array.isArray(tkts) ? tkts : []);
        const map: Record<number, TicketStat> = {};
        if (Array.isArray(stats)) {
          for (const s of stats) {
            if (s && s.ticket_id != null) map[s.ticket_id] = s;
          }
        }
        setStatsMap(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    loadData();
    const onStorage = () => loadData();
    window.addEventListener("prava-storage-changed", onStorage);
    return () => window.removeEventListener("prava-storage-changed", onStorage);
  }, [loadData]);

  const onBack = () => navigate("/me");

  const onStartTicket = (ticket: OfflineTicket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  return (
    <>
      <SEO
        title="Biletlar - YHXBB imtihon biletlari"
        description="YHXBB imtihon biletlarini yeching. Har bir biletda real imtihon savollari mavjud."
        canonical="/tickets"
      />
      <div className="topics-screen">
        {/* ── Header ── */}
        <div className="topics-header">
          <button className="quiz-back-btn" onClick={onBack} type="button">
            <IconArrowLeft size={18} />
          </button>
          <h2 className="topics-title">{t("home.biletlar", "Biletlar")}</h2>
          {!loading && tickets.length > 0 && (
            <span className="topics-count-chip">{tickets.length}</span>
          )}
        </div>

        {loading && (
          <div className="loading-screen">
            <div className="spinner" />
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <div className="empty-state" style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div className="empty-state-icon">
              <IconTicket size={48} stroke={1.2} color="var(--text-muted)" />
            </div>
            <p className="empty-state-text" style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              {t("common.noData", "Hozircha biletlar yuklanmadi")}
            </p>
            <button
              type="button"
              className="saas-btn-primary"
              onClick={() => navigate("/me")}
              style={{ marginTop: 8 }}
            >
              {t("nav.home", "Bosh sahifaga qaytish")}
            </button>
          </div>
        )}

        {!loading && tickets.length > 0 && (
          <div className="tc-grid">
            {tickets.map((ticket) => {
              const stat = statsMap[ticket.id];
              const done = stat?.times_done ?? 0;
              const passed = stat?.times_passed ?? 0;
              const bestCorrect = stat?.best_correct ?? 0;

              const badgeType =
                done === 0 ? null : passed > 0 ? "passed" : "ongoing";

              const btnLabel =
                done > 0
                  ? t("tickets.continue", "Davom etish")
                  : t("tickets.start", "Boshlash");

              const isBlocked = ticket.is_blocked === true;

              return (
                <div
                  key={ticket.id}
                  className={`tc-card ${done > 0 && !isBlocked ? "tc-card--active" : ""}`}
                  style={isBlocked ? { opacity: 0.72, position: "relative" } : {}}
                >
                  {/* ── Bloklangan overlay belgisi ── */}
                  {isBlocked && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "rgba(0,0,0,0.55)",
                        borderRadius: 6,
                        padding: "3px 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                        zIndex: 1,
                      }}
                    >
                      <IconLock size={12} /> {t("tickets.blocked", "Bloklangan")}
                    </div>
                  )}

                  {/* ── Top: sarlavha (chap) + raqam badge (o'ng) ── */}
                  <div className="tc-header">
                    <div className="tc-title-group">
                      <span className="tc-title">{localizeName(ticket)}</span>
                      {!isBlocked && badgeType && (
                        <span className={`tc-badge tc-badge--${badgeType}`}>
                          {badgeType === "passed"
                            ? t("tickets.badgePassed", "O'tgan")
                            : t("tickets.badgeOngoing", "Jarayonda")}
                        </span>
                      )}
                    </div>
                    <div className="tc-num-badge">#{ticket.ticket_number}</div>
                  </div>

                  {/* ── Meta: savol, vaqt ── */}
                  <div className="tc-meta">
                    <span className="tc-meta-item">
                      <IconListNumbers size={13} />
                      {ticket.question_count} {t("common.questions", "savol")}
                    </span>
                    <span className="tc-meta-item">
                      <IconClock size={13} />
                      {ticket.question_count} {t("common.min", "daq")}
                    </span>
                  </div>

                  {/* ── Statistika (faqat ishlangan biletlarda) ── */}
                  {!isBlocked && done > 0 && (
                    <div className="tc-stats">
                      <div className="tc-stat-row">
                        <span className="tc-stat-label">
                          <IconClock size={12} />
                          {(() => {
                            const totalSec = stat?.total_seconds ?? 0;
                            const m = Math.floor(totalSec / 60);
                            const s = totalSec % 60;
                            return m > 0
                              ? `${m} ${t("common.min", "daq")} ${s}s`
                              : `${s}s`;
                          })()}
                        </span>
                        <span
                          className={`tc-stat-val ${
                            bestCorrect >=
                            Math.ceil((ticket.question_count * ticket.passing_score) / 100)
                              ? "tc-val-green"
                              : "tc-val-red"
                          }`}
                        >
                          <IconCheck size={12} />
                          {bestCorrect}/{ticket.question_count}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── Bajarish / Bloklangan tugmasi ── */}
                  <div className="tc-footer">
                    {isBlocked ? (
                      <button
                        className="tc-start-btn"
                        disabled
                        style={{
                          background: "var(--border)",
                          color: "var(--text-muted)",
                          cursor: "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        type="button"
                      >
                        <IconLock size={15} />
                        {t("tickets.blocked", "Bloklangan")}
                      </button>
                    ) : (
                      <button
                        className="tc-start-btn"
                        onClick={() => onStartTicket(ticket)}
                        type="button"
                      >
                        <IconPlayerPlay size={15} />
                        {btnLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
