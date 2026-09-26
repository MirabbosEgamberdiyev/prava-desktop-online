import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconFlame,
  IconPlayerPlay,
  IconTargetArrow,
  IconTicket,
  IconTrophy,
} from "@tabler/icons-react";
import type { NbaDecision } from "../../features/Dashboard/nextBestAction";
import "./dashboard.css";

interface View {
  badge: string;
  accent: string;
  badgeBg: string;
  title: string;
  subtitle: string;
  pill?: { icon: ReactNode; text: string };
  button: string;
  gradient: string;
  icon: ReactNode;
  run: () => void;
}

const noArrow = (s: string) => s.replace(/\s*→\s*$/, "");

/** Hero card for the deterministic next step (see features/Dashboard/nextBestAction). */
export default function NextBestActionCard({ decision, onOpenExamPicker }: { decision: NbaDecision; onOpenExamPicker: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  let v: View;
  switch (decision.kind) {
    case "resume":
      v = {
        badge: t("dashboard.nba.badgeContinue", "DAVOM ETTIRISH"),
        accent: "#7c3aed",
        badgeBg: "rgba(139, 92, 246, 0.15)",
        title: t("dashboard.nba.sessionResumeTitle", "Tugallanmagan mashg'ulotni davom ettiring"),
        subtitle: t("dashboard.nba.marathonResumeDesc", {
          current: decision.current,
          total: decision.total,
          defaultValue: "Siz {{total}} ta savoldan {{current}}-savolgacha yetib kelgansiz. To'xtab qolmang!",
        }),
        pill: { icon: <IconPlayerPlay size={14} />, text: `${decision.current} / ${decision.total}` },
        button: t("dashboard.nba.resumeBtn", "Davom ettirish"),
        gradient: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
        icon: <IconPlayerPlay size={26} stroke={2} />,
        run: () => navigate(decision.route),
      };
      break;
    case "mistakes":
      v = {
        badge: t("dashboard.nba.badgeFixMistakes", "XATOLARNI TUZATISH"),
        accent: "#dc2626",
        badgeBg: "rgba(239, 68, 68, 0.14)",
        title: t("dashboard.nba.mistakesTitle", "Xatolar ustida ishlash tavsiya etiladi"),
        subtitle: t("dashboard.nba.mistakesDesc", { count: decision.count, defaultValue: "Sizda {{count}} ta xato ishlangan savol to'planib qolgan." }),
        pill: { icon: <IconFlame size={14} />, text: t("dashboard.nba.mistakesCount", { count: decision.count, defaultValue: `${decision.count}` }) },
        button: t("dashboard.nba.fixMistakesBtn", "Xatolarni bartaraf etish"),
        gradient: "linear-gradient(135deg, #f87171 0%, #dc2626 100%)",
        icon: <IconFlame size={26} stroke={2} />,
        run: () => navigate(decision.route),
      };
      break;
    case "weakTopic":
      v = {
        badge: t("dashboard.nba.badgeWeakTopic", "ZAIF MAVZU"),
        accent: "#d97706",
        badgeBg: "rgba(245, 158, 11, 0.15)",
        title: t("dashboard.nba.weakTopicTitle", { topic: decision.topicName, defaultValue: "Eng zaif mavzu: {{topic}}" }),
        subtitle: t("dashboard.nba.weakTopicDesc", { count: decision.count, defaultValue: "Ushbu mavzuda {{count}} ta xato qayd etildi." }),
        pill: { icon: <IconAlertTriangle size={14} />, text: t("dashboard.nba.mistakesCount", { count: decision.count, defaultValue: `${decision.count}` }) },
        button: t("dashboard.nba.practiceTopicBtn", "Mavzuni kuchaytirish"),
        gradient: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
        icon: <IconAlertTriangle size={26} stroke={2} />,
        run: () => navigate(decision.route),
      };
      break;
    case "nextTicket":
      v = {
        badge: t("dashboard.nba.badgeNextTicket", "NAVBATDAGI BILET"),
        accent: "#059669",
        badgeBg: "rgba(16, 185, 129, 0.14)",
        title: t("dashboard.nba.nextTicketTitle", { ticketNumber: decision.ticketNumber, defaultValue: "{{ticketNumber}}-biletni yechishga tayyormisiz?" }),
        subtitle: t("dashboard.nba.nextTicketDesc", "Biletlarni tartib bilan yechish imtihon formatiga to'liq ko'nikish beradi."),
        pill: { icon: <IconTicket size={14} />, text: `${decision.ticketNumber} / ${decision.total}` },
        button: t("dashboard.nba.startTicketBtn", "Biletni boshlash"),
        gradient: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
        icon: <IconTicket size={26} stroke={2} />,
        run: () => navigate(decision.route),
      };
      break;
    case "diagnostic":
      v = {
        badge: t("dashboard.nba.badgeDiagnostic", "DIAGNOSTIKA"),
        accent: "#0284c7",
        badgeBg: "rgba(2, 132, 199, 0.14)",
        title: t("dashboard.nba.diagnosticTitle", "Bilim darajangizni aniqlash uchun sinov testi"),
        subtitle: t("dashboard.nba.diagnosticDesc", "20 ta savoldan iborat boshlang'ich test orqali kuchli va zaif tomonlaringizni aniqlang."),
        pill: { icon: <IconTargetArrow size={14} />, text: t("dashboard.nba.questionsCount", { count: 20, defaultValue: "20" }) },
        button: t("dashboard.nba.startDiagnosticBtn", "Diagnostik testni boshlash"),
        gradient: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
        icon: <IconTargetArrow size={26} stroke={2} />,
        run: onOpenExamPicker,
      };
      break;
    default:
      v = {
        badge: t("dashboard.nba.badgeExamReady", "RASMIY IMTIHON"),
        accent: "#4f46e5",
        badgeBg: "rgba(99, 102, 241, 0.15)",
        title: t("dashboard.nba.examReadyTitle", "Bilimingiz mustahkam! Davlat imtihonida sinang"),
        subtitle: t("dashboard.nba.examReadyDesc", { readiness: decision.readiness, defaultValue: "Tayyorgarlik darajangiz {{readiness}}%." }),
        pill: { icon: <IconTrophy size={14} />, text: t("dashboard.nba.readyPct", { pct: decision.readiness, defaultValue: `${decision.readiness}%` }) },
        button: t("dashboard.nba.startExamSimBtn", "Davlat imtihoni simulyatori"),
        gradient: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
        icon: <IconTrophy size={26} stroke={2} />,
        run: onOpenExamPicker,
      };
  }

  return (
    <section
      className="dash-nba dash-card-focus"
      style={{ ["--nba-accent" as string]: v.accent }}
      aria-label={v.title}
      onClick={v.run}
    >
      <div className="dash-nba-content">
        <div className="dash-nba-badges">
          <span className="dash-nba-badge" style={{ background: v.badgeBg, color: v.accent }}>
            {v.badge}
          </span>
          {v.pill && (
            <span className="dash-nba-pill">
              {v.pill.icon}
              <span>{v.pill.text}</span>
            </span>
          )}
        </div>
        <h3>{v.title}</h3>
        <p>{v.subtitle}</p>
      </div>
      <div className="dash-nba-action">
        <div className="dash-nba-icon" style={{ background: v.gradient }} aria-hidden="true">
          {v.icon}
        </div>
        <button
          type="button"
          className="dash-btn"
          style={{ background: v.gradient }}
          onClick={(e) => {
            e.stopPropagation();
            v.run();
          }}
        >
          <span>{noArrow(v.button)}</span>
          <IconArrowRight size={17} stroke={2.5} />
        </button>
      </div>
    </section>
  );
}
