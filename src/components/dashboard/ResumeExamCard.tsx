import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconPlayerPlay, IconRotateClockwise } from "@tabler/icons-react";
import type { ResumableSession } from "../../features/Dashboard/resumeSession";
import "./dashboard.css";

function minutesLeft(until: number | null, now: number): number | null {
  if (until == null || !Number.isFinite(until)) return null;
  return Math.max(0, Math.ceil((until - now) / 60000));
}

/**
 * "Continue unfinished test" card (web ResumeExamCard parity). Source: the desktop crash-recovery
 * session in IndexedDB — the target page restores questions, answers and the original deadline.
 */
export default function ResumeExamCard({ session }: { session: ResumableSession | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (!session) return null;

  const title =
    session.kind === "marathon"
      ? t("dashboard.resume.marathonTitle", "Tugallanmagan marafon")
      : session.kind === "ticket"
        ? t("dashboard.resume.ticketTitle", {
            number: session.ticketNumber ?? "",
            defaultValue: "Tugallanmagan bilet {{number}}",
          })
        : session.kind === "wrong"
          ? t("dashboard.resume.wrongTitle", "Tugallanmagan xatolar mashqi")
          : t("dashboard.resume.examTitle", "Tugallanmagan imtihon");

  const left = minutesLeft(session.deadline, Date.now());
  const pct = session.total > 0 ? Math.round((session.answered / session.total) * 100) : 0;

  return (
    <section className="dash-resume" aria-label={t("dashboard.resume.aria", "Tugallanmagan imtihon")}>
      <div className="dash-resume-left">
        <div className="dash-resume-icon" aria-hidden="true">
          <IconRotateClockwise size={24} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2>{title}</h2>
          <p>
            {t("dashboard.resume.progress", {
              answered: session.answered,
              total: session.total,
              defaultValue: "{{answered}} / {{total}} ta savolga javob berilgan",
            })}
            {left != null &&
              ` • ${
                left > 0
                  ? t("dashboard.resume.minutesLeft", { count: left, defaultValue: "{{count}} daqiqa qoldi" })
                  : t("dashboard.resume.timeUp", "Vaqt tugagan — natijani yuboring")
              }`}
          </p>
          <div className="dash-progress" aria-hidden="true">
            <div style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <button type="button" className="dash-btn" onClick={() => navigate(session.route)}>
        <IconPlayerPlay size={18} />
        <span>{t("dashboard.resume.continue", "Davom ettirish")}</span>
      </button>
    </section>
  );
}
