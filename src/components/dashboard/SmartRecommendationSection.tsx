import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconChevronRight,
  IconFlame,
  IconTargetArrow,
} from "@tabler/icons-react";
import "./dashboard.css";

interface WeakTopic {
  id: number;
  name: string;
  wrongCount: number;
}

interface Props {
  weakTopics: WeakTopic[];
  totalWrongs: number;
  practicedCount: number;
  onOpenExamPicker: () => void;
}

/**
 * Weak topics + quick mistake fixing (web SmartRecommendationSection parity) with honest
 * empty states: new user → diagnostic test, experienced user without mistakes → mastery.
 */
export default function SmartRecommendationSection({ weakTopics, totalWrongs, practicedCount, onOpenExamPicker }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const noArrow = (s: string) => s.replace(/\s*→\s*$/, "");

  return (
    <section className="dash-section" aria-label={t("dashboard.recommendation.title", "Aqlli tavsiya va xatolar ustida ishlash")}>
      <div className="section-headline">
        <h3>{t("dashboard.recommendation.title", "Aqlli tavsiya va xatolar ustida ishlash")}</h3>
        <p>{t("dashboard.recommendation.subtitle", "")}</p>
      </div>

      <div className="dash-smart-grid">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <span className="dash-chip amber">
              <IconAlertTriangle size={13} stroke={2.5} />
              {t("dashboard.recommendation.weakTopicsBadge", "ZAIF MAVZULAR")}
            </span>
            <button type="button" className="dash-link" onClick={() => navigate("/topics")}>
              {noArrow(t("dashboard.recommendation.viewAllLink", "Barchasini ko'rish"))}
              <IconArrowRight size={14} stroke={2.5} />
            </button>
          </div>
          <h4>{t("dashboard.recommendation.weakTopicsTitle", "Eng ko'p xato tushgan yo'nalishlar")}</h4>

          {weakTopics.length > 0 ? (
            <div className="dash-list" role="list">
              {weakTopics.slice(0, 5).map((topic, i) => (
                <button
                  key={topic.id}
                  type="button"
                  role="listitem"
                  className="dash-list-item"
                  title={topic.name}
                  onClick={() => navigate(`/marafon?topicId=${topic.id}`)}
                >
                  <span className="dash-list-num">{i + 1}</span>
                  <span className="dash-list-name">{topic.name}</span>
                  <span className="dash-list-count">
                    {t("dashboard.recommendation.mistakesCount", { count: topic.wrongCount, defaultValue: `${topic.wrongCount}` })}
                  </span>
                  <IconChevronRight size={15} />
                </button>
              ))}
            </div>
          ) : practicedCount === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">
                <IconTargetArrow size={24} stroke={2} />
              </div>
              <h4>{t("dashboard.recommendation.diagnosticEmptyTitle", "Hozircha xatolar mavjud emas")}</h4>
              <p className="dash-desc">{t("dashboard.recommendation.diagnosticEmptyDesc", "")}</p>
              <button type="button" className="dash-btn" onClick={onOpenExamPicker}>
                {noArrow(t("dashboard.recommendation.startDiagnosticBtn", "Sinov testini boshlash"))}
              </button>
            </div>
          ) : (
            <div className="dash-empty">
              <div className="dash-empty-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#059669" }}>
                <IconCheck size={24} stroke={2.5} />
              </div>
              <h4>{t("dashboard.recommendation.masteryTitle", "Barcha mavzular o'zlashtirildi!")}</h4>
              <p className="dash-desc">{t("dashboard.recommendation.masteryDesc", "")}</p>
              <button type="button" className="dash-btn" style={{ background: "#059669" }} onClick={onOpenExamPicker}>
                {noArrow(t("dashboard.recommendation.startMockExamBtn", "Haqiqiy imtihon topshirish"))}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="dash-panel" style={{ flex: 1 }}>
            <span className="dash-chip red" style={{ alignSelf: "flex-start" }}>
              <IconFlame size={12} stroke={2.5} />
              {t("dashboard.recommendation.quickFixBadge", "TEZKOR TUZATISH")}
            </span>
            <h4>
              {totalWrongs > 0
                ? `${totalWrongs} ${t("dashboard.recommendation.mistakesTitle", "ta xato javob")}`
                : t("dashboard.recommendation.noMistakesYet", "Xatolar mavjud emas")}
            </h4>
            <p className="dash-desc">
              {totalWrongs > 0
                ? t("dashboard.recommendation.mistakesDesc", "")
                : t("dashboard.recommendation.noMistakesDesc", "")}
            </p>
            <button
              type="button"
              className="dash-btn"
              style={{ marginTop: "auto", alignSelf: "flex-start", background: totalWrongs > 0 ? "#dc2626" : undefined }}
              onClick={() => (totalWrongs > 0 ? navigate("/wrong-exam") : onOpenExamPicker())}
            >
              {noArrow(
                totalWrongs > 0
                  ? t("dashboard.recommendation.fixMistakesBtn", "Xatolar ustida ishlashni boshlash")
                  : t("dashboard.recommendation.startExamBtn", "Sinov imtihonini boshlash")
              )}
              <IconArrowRight size={16} stroke={2.5} />
            </button>
          </div>

          <button type="button" className="dash-panel dash-goal dash-card-focus" onClick={() => navigate("/statistics")} style={{ textAlign: "left", flexDirection: "row", fontFamily: "inherit" }}>
            <span className="dash-goal-icon">
              <IconTargetArrow size={22} stroke={2.2} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: 14 }}>{t("dashboard.recommendation.goalTitle", "Sizning maqsadingiz")}</h4>
              <span className="dash-desc" style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)" }}>
                {t("dashboard.recommendation.goalDesc", "")}
              </span>
            </span>
            <IconChevronRight size={18} color="var(--text-muted)" />
          </button>
        </div>
      </div>
    </section>
  );
}
