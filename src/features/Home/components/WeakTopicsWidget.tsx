import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconBulb,
  IconClipboardList,
} from "@tabler/icons-react";
import { getWrongAnswers, getTopics, getFullStats, localizeTopic } from "../../../services/desktopAdapter";

interface WeakTopicSummary {
  topicId: number;
  name: string;
  count: number;
}

interface Props {
  userId: number;
}

export default function WeakTopicsWidget({ userId }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalWrongs, setTotalWrongs] = useState(0);
  const [weakTopics, setWeakTopics] = useState<WeakTopicSummary[]>([]);
  const [progressPct, setProgressPct] = useState(0);

  const loadData = async () => {
    try {
      const [wrongs, topics, stats] = await Promise.all([
        getWrongAnswers(userId),
        getTopics(),
        getFullStats(userId).catch(() => null),
      ]);

      const validWrongs = Array.isArray(wrongs)
        ? wrongs.filter((w) => w && w.question)
        : [];

      // Calculate total questions attempted
      const readyQ = stats?.question_readiness?.ready ?? 0;
      const averageQ = stats?.question_readiness?.average ?? 0;
      const weakQ = stats?.question_readiness?.weak ?? 0;
      const totalPracticed = readyQ + averageQ + weakQ;

      // Synchronization: If 0 questions were ever practiced, mistakes count must be 0
      const effectiveWrongs = totalPracticed === 0 ? 0 : validWrongs.length;
      setTotalWrongs(effectiveWrongs);

      if (effectiveWrongs === 0 || totalPracticed === 0) {
        setWeakTopics([]);
        setProgressPct(0); // If 0 questions answered, masteryPercent is 0, NEVER 100%
        setLoading(false);
        return;
      }

      // Calculate mastery / readiness progress on practiced questions
      const correctCount = Math.max(0, totalPracticed - effectiveWrongs);
      const mastery = Math.round((correctCount / totalPracticed) * 100);
      setProgressPct(Math.min(100, Math.max(0, mastery)));

      // Group mistakes by topic
      const topicCountMap: Record<number, number> = {};
      for (const entry of validWrongs) {
        const tid = entry.question?.topic_id;
        if (tid != null) {
          topicCountMap[tid] = (topicCountMap[tid] || 0) + 1;
        }
      }

      const topicList = Array.isArray(topics) ? topics : [];
      const sorted = Object.entries(topicCountMap)
        .map(([tidStr, count]) => {
          const tid = Number(tidStr);
          const found = topicList.find((tp) => tp.id === tid);
          return {
            topicId: tid,
            name: found ? localizeTopic(found) : `Mavzu #${tid}`,
            count,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 4); // Top weak topics

      setWeakTopics(sorted);
    } catch {
      setWeakTopics([]);
      setTotalWrongs(0);
      setProgressPct(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const onStorage = () => loadData();
    window.addEventListener("prava-storage-changed", onStorage);
    return () => window.removeEventListener("prava-storage-changed", onStorage);
  }, [userId, i18n.language]);

  if (loading) {
    return null;
  }

  // If user has 0 mistakes, show Variant B (Dynamic Welcome & Topic 1 Focus)
  if (totalWrongs === 0) {
    return (
      <section className="next-best-action-wrapper" aria-label="Keyingi tavsiya">
        <div className="next-best-action-card variant-newbie">
          <div className="nba-newbie-content">
            <div className="nba-newbie-icon">
              <IconBulb size={28} stroke={2} />
            </div>
            <div className="nba-newbie-text">
              <div className="nba-badge success">
                <IconCheck size={13} stroke={2.5} />
                <span>{t("home.startStepBadge", "Boshlang'ich qadam")}</span>
              </div>
              <h3 className="nba-title">
                {t("home.startTopic1Title", "1-Mavzudan o‘rganishni boshlang")}
              </h3>
              <p className="nba-desc">
                {t(
                  "home.startTopic1Desc",
                  "Yo'l harakati qoidalarini noldan, qulay va tizimli o'rganing. 1200+ rasmiy test savollari va qoidalar sizni kutmoqda."
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/topics")}
            className="nba-cta-btn primary"
            type="button"
          >
            <span>{t("home.startTopic1Btn", "1-Mavzuni boshlash")}</span>
            <IconArrowRight size={18} stroke={2.5} />
          </button>
        </div>
      </section>
    );
  }

  // Variant A: Mistakes exist - Unified Focus Block
  return (
    <section className="next-best-action-wrapper" aria-label="Asosiy fokus bloki">
      <div className="next-best-action-card variant-focus">
        {/* Left Column: Topics Requiring Attention */}
        <div className="nba-focus-col nba-col-topics">
          <div className="nba-col-header">
            <div className="nba-badge warning">
              <IconAlertTriangle size={13} stroke={2.5} />
              <span>{t("home.attentionTopicsBadge", "DIQQAT TALAB QILADIGAN MAVZULAR")}</span>
            </div>
            <h3 className="nba-col-title">
              {t("home.weakTopicsHeader", "Zaif mavzular ro'yxati")}
            </h3>
            <p className="nba-col-desc">
              {t("home.weakTopicsSub", "Mavzuni tanlang va aynan shu bo'yicha bilimlarni mustahkamlang:")}
            </p>
          </div>

          <div className="nba-topic-list">
            {weakTopics.map((topic) => (
              <button
                key={topic.topicId}
                className="nba-topic-item"
                type="button"
                onClick={() => navigate(`/marafon?topicId=${topic.topicId}`)}
              >
                <span className="nba-topic-name">{topic.name}</span>
                <span className="nba-topic-count">
                  {topic.count} {t("home.mistakesCountLabel", "ta xato")}
                </span>
                <IconArrowRight size={15} className="nba-topic-arrow" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Mistakes Practice Action */}
        <div className="nba-focus-col nba-col-action">
          <div className="nba-col-header">
            <div className="nba-badge info">
              <IconClipboardList size={13} stroke={2.5} />
              <span>{t("home.mistakesPracticeBadge", "XATOLAR USTIDA ISHLASH")}</span>
            </div>
            <h3 className="nba-col-title">
              {t("home.mistakesCountTitle", "Jami xato javoblar: {{count}} ta", { count: totalWrongs })}
            </h3>
            <p className="nba-col-desc">
              {t(
                "home.mistakesPracticeDesc",
                "Xatolar ustida muntazam ishlash haqiqiy davlat imtihonidan birinchi urinishda o'tish ehtimolini 94% ga oshiradi."
              )}
            </p>
          </div>

          <div className="nba-progress-box">
            <div className="nba-progress-header">
              <span className="nba-progress-label">{t("home.readinessProgress", "O'zlashtirish ko'rsatkichi:")}</span>
              <span className="nba-progress-value">{progressPct}%</span>
            </div>
            <div className="nba-progress-track">
              <div
                className="nba-progress-fill"
                style={{ width: `${Math.max(5, progressPct)}%` }}
              />
            </div>
          </div>

          <button
            className="nba-cta-btn secondary"
            onClick={() => navigate("/wrong-answers")}
            type="button"
          >
            <span>{t("home.retakeWeakest20Btn", "Eng zaif 20 ta savolni qayta ishlash")}</span>
            <IconArrowRight size={18} stroke={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
