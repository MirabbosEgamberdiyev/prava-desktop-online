import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { TicketResponse, LocalizedText, ComprehensiveStatisticsResponse } from "../types";
import { getTickets, getMyStats } from "../api";
import {
  IconArrowLeft, IconTicket, IconClock, IconListNumbers,
  IconCheck, IconPlayerPlay, IconAlertTriangle, IconRefresh,
} from "@tabler/icons-react";

interface Props {
  onBack: () => void;
  onStartTicket: (ticket: TicketResponse) => void;
}

function getLocal(lt?: LocalizedText | null): string {
  if (!lt) return "";
  const l = i18n.language;
  if (l === "uzc" && lt.uzc) return lt.uzc;
  if (l === "ru" && lt.ru) return lt.ru;
  if (l === "en" && lt.en) return lt.en;
  return lt.uzl || lt.uzc || lt.ru || lt.en || "";
}

export default function BiletlarScreen({ onBack, onStartTicket }: Props) {
  const { t } = useTranslation();
  const [tickets, setTickets]   = useState<TicketResponse[]>([]);
  const [statsData, setStats]   = useState<ComprehensiveStatisticsResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    // ⚠️ Ilgari Promise.all ishlatilardi: statistika so'rovi yiqilsa BUTUN
    // yuklash rad etilib, muvaffaqiyatli kelgan biletlar ham yo'qolardi va
    // ekran "ma'lumot yo'q" deb ko'rsatardi. allSettled bilan biletlar
    // baribir chiziladi, statistika esa ixtiyoriy bezak bo'lib qoladi.
    Promise.allSettled([getTickets(), getMyStats()])
      .then(([tRes, sRes]) => {
        if (tRes.status === "fulfilled") {
          setTickets(tRes.value);
        } else {
          console.warn("[BiletlarScreen] getTickets failed:", tRes.reason);
          setTickets([]);
          setError(tRes.reason instanceof Error ? tRes.reason.message : String(tRes.reason));
        }
        if (sRes.status === "fulfilled") setStats(sRes.value);
        else console.warn("[BiletlarScreen] getMyStats failed:", sRes.reason);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const ticketStatsMap = useMemo(() => {
    const map: Record<number, NonNullable<ComprehensiveStatisticsResponse["ticketStats"]>[0]> = {};
    for (const ts of statsData?.ticketStats ?? []) {
      if (ts.ticketId != null) map[ts.ticketId] = ts;
    }
    return map;
  }, [statsData]);

  return (
    <div className="topics-screen">
      <div className="topics-header">
        <button type="button" className="quiz-back-btn" onClick={onBack} aria-label={t("common.back")}>
          <IconArrowLeft size={18} />
        </button>
        <h2 className="topics-title">{t("home.biletlar")}</h2>
        {!loading && tickets.length > 0 && (
          <span className="topics-count-chip">{tickets.length}</span>
        )}
      </div>

      {loading && <div className="loading-screen"><div className="spinner" /></div>}

      {!loading && error && tickets.length === 0 && (
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-state-icon"><IconAlertTriangle size={48} stroke={1.5} color="var(--danger)" /></div>
          <p className="empty-state-text state-error-title">{t("common.error")}</p>
          <p className="empty-state-sub state-error-detail">{error}</p>
          <button type="button" className="retry-btn" onClick={load}>
            <IconRefresh size={15} /> {t("exam.retry")}
          </button>
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-state-icon"><IconTicket size={48} stroke={1} color="var(--text-muted)" /></div>
          <p className="empty-state-text">{t("common.noData")}</p>
          <button type="button" className="retry-btn" onClick={load}>
            <IconRefresh size={15} /> {t("exam.retry")}
          </button>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="tc-grid">
          {tickets.map((ticket) => {
            const tStat     = ticketStatsMap[ticket.id];
            const attempted = tStat?.totalExams ?? 0;
            const passed    = tStat?.passedExams ?? 0;
            const bestScore = tStat?.bestScore ?? null;

            const badgeType = attempted === 0 ? null : passed > 0 ? "passed" : "ongoing";
            const btnLabel  = attempted > 0 ? t("tickets.continue") : t("tickets.start");

            return (
              <div key={ticket.id} className={`tc-card ${attempted > 0 ? "tc-card--active" : ""}`}>
                <div className="tc-header">
                  <div className="tc-title-group">
                    <span className="tc-title">{getLocal(ticket.name)}</span>
                    {badgeType && (
                      <span className={`tc-badge tc-badge--${badgeType}`}>
                        {badgeType === "passed" ? t("tickets.badgePassed") : t("tickets.badgeOngoing")}
                      </span>
                    )}
                  </div>
                  <div className="tc-num-badge">#{ticket.ticketNumber}</div>
                </div>

                <div className="tc-meta">
                  <span className="tc-meta-item">
                    <IconListNumbers size={13} />
                    {ticket.questionCount ?? 0} {t("common.questions")}
                  </span>
                  <span className="tc-meta-item">
                    <IconClock size={13} />
                    {ticket.durationMinutes ?? 0} {t("common.min")}
                  </span>
                </div>

                {attempted > 0 && bestScore != null && (
                  <div className="tc-stats">
                    <div className="tc-stat-row">
                      <span className="tc-stat-label">
                        <IconCheck size={12} /> {t("stats.bestScore")}
                      </span>
                      <span className={`tc-stat-val ${bestScore >= (ticket.passingScore ?? 90) ? "tc-val-green" : "tc-val-red"}`}>
                        {Math.round(bestScore)}%
                      </span>
                    </div>
                    <div className="tc-stat-row">
                      <span className="tc-stat-label">{t("stats.timesAttempted")}</span>
                      <span className="tc-stat-val">×{attempted}</span>
                    </div>
                  </div>
                )}

                <div className="tc-footer">
                  <button
                    type="button"
                    className="tc-start-btn"
                    onClick={() => onStartTicket(ticket)}
                    aria-label={`${btnLabel} — #${ticket.ticketNumber} ${getLocal(ticket.name)}`}
                  >
                    <IconPlayerPlay size={15} />
                    {btnLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
