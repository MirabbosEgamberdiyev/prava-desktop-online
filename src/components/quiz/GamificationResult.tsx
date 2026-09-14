import React from "react";
import { useTranslation } from "react-i18next";
import {
  IconTrophy,
  IconTargetArrow,
  IconRotate,
  IconCheck,
  IconX,
  IconClock,
  IconSearch,
  IconRefresh,
  IconArrowLeft,
  IconSparkles,
} from "@tabler/icons-react";

export interface GamificationResultProps {
  score: number; // 0 to 100
  correct: number;
  wrong: number;
  unanswered?: number;
  totalQuestions?: number;
  total?: number;
  badge?: string;
  isTimeUp?: boolean;
  onReviewMistakes?: () => void;
  onRetry: () => void;
  onBackHome?: () => void;
  onHome?: () => void;
  title?: string;
  errorMsg?: string | null;
}

export const GamificationResult: React.FC<GamificationResultProps> = ({
  score,
  correct,
  wrong,
  unanswered = 0,
  totalQuestions,
  total,
  badge,
  isTimeUp: _isTimeUp,
  onReviewMistakes,
  onRetry,
  onBackHome,
  onHome,
  title,
  errorMsg,
}) => {
  const { t } = useTranslation();
  const actualTotal = totalQuestions ?? total ?? correct + wrong + unanswered;
  const handleHome = onBackHome ?? onHome ?? (() => {});

  // Exact 3-Tier Gamification Logic
  // 90-100%: Gold Trophy
  // 70-89%: Target
  // 0-69%: Retry
  const isGoldTier = score >= 90;
  const isTargetTier = score >= 70 && score < 90;

  const tierConfig = isGoldTier
    ? {
        tier: "gold",
        icon: <IconTrophy size={42} stroke={1.8} color="#fff" />,
        badgeBg: "linear-gradient(135deg, #fcc419, #f59f00)",
        color: "#f59f00",
        message: t("gamification.tierGold", "Ajoyib natija! Imtihonga deyarli tayyorsiz!"),
        title: title || t("gamification.tierGoldTitle", "Ajoyib natija!"),
      }
    : isTargetTier
    ? {
        tier: "target",
        icon: <IconTargetArrow size={42} stroke={1.8} color="#fff" />,
        badgeBg: "linear-gradient(135deg, #38d9a9, #0c8599)",
        color: "#0c8599",
        message: t("gamification.tierTarget", "Yaxshi ko'rsatkich! Yana bir oz mashq qilsangiz yetarli."),
        title: title || t("gamification.tierTargetTitle", "Yaxshi ko'rsatkich!"),
      }
    : {
        tier: "retry",
        icon: <IconRotate size={42} stroke={1.8} color="#fff" />,
        badgeBg: "linear-gradient(135deg, #ffa94d, #e8590c)",
        color: "#e8590c",
        message: t("gamification.tierRetry", "Taslim bo'lmang! Xatolar ustida ishlab, qayta topshiring."),
        title: title || t("gamification.tierRetryTitle", "Taslim bo'lmang!"),
      };

  return (
    <div className="quiz-result-screen" style={{ width: "100%", padding: "24px 16px" }}>
      <div
        className="quiz-result-card"
        style={{
          maxWidth: "540px",
          margin: "0 auto",
          background: "var(--card-bg, var(--surface, #fff))",
          borderRadius: "20px",
          border: "1.5px solid var(--border)",
          boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        {/* Optional Context Badge */}
        {badge && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "20px",
              background: "var(--border)",
              color: "var(--text-muted)",
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            {badge}
          </div>
        )}

        {/* Gamification Badge */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            margin: "0 auto 16px",
            background: errorMsg ? "#e03131" : tierConfig.badgeBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 24px ${tierConfig.color}40`,
          }}
        >
          {errorMsg ? <IconX size={40} color="#fff" stroke={2.5} /> : tierConfig.icon}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "var(--text)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.3px",
          }}
        >
          {errorMsg ? t("common.error", "Xatolik") : tierConfig.title}
        </h2>

        {/* Motivational Message */}
        <p
          style={{
            fontSize: "14px",
            color: "var(--text-muted)",
            margin: "0 0 20px 0",
            lineHeight: 1.5,
          }}
        >
          {errorMsg ? errorMsg : tierConfig.message}
        </p>

        {!errorMsg && (
          <>
            {/* Big Score Percentage */}
            <div
              style={{
                fontSize: "52px",
                fontWeight: 900,
                color: tierConfig.color,
                lineHeight: 1,
                margin: "0 0 24px 0",
                letterSpacing: "-1px",
              }}
            >
              {score}%
            </div>

            {/* Results 3-Matrix (Green, Red, Gray) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: unanswered > 0 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              {/* Correct */}
              <div
                style={{
                  background: "rgba(47, 158, 68, 0.08)",
                  border: "1px solid rgba(47, 158, 68, 0.25)",
                  borderRadius: "14px",
                  padding: "12px 8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "#2f9e44", fontWeight: 800, fontSize: "18px" }}>
                  <IconCheck size={18} stroke={2.5} />
                  <span>{correct}</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
                  {t("common.correct", "To'g'ri")}
                </div>
              </div>

              {/* Incorrect */}
              <div
                style={{
                  background: "rgba(224, 49, 49, 0.08)",
                  border: "1px solid rgba(224, 49, 49, 0.25)",
                  borderRadius: "14px",
                  padding: "12px 8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "#e03131", fontWeight: 800, fontSize: "18px" }}>
                  <IconX size={18} stroke={2.5} />
                  <span>{wrong}</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
                  {t("common.wrong", "Noto'g'ri")}
                </div>
              </div>

              {/* Unanswered */}
              {unanswered > 0 && (
                <div
                  style={{
                    background: "rgba(134, 142, 150, 0.08)",
                    border: "1px solid rgba(134, 142, 150, 0.25)",
                    borderRadius: "14px",
                    padding: "12px 8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "#868e96", fontWeight: 800, fontSize: "18px" }}>
                    <IconClock size={18} stroke={2} />
                    <span>{unanswered}</span>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
                    {t("exam.unanswered", "Javobsiz")}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Button Hierarchy */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* 1. Primary CTA: Review Mistakes (Only if wrong answers exist) */}
          {!errorMsg && wrong > 0 && onReviewMistakes && (
            <button
              type="button"
              onClick={onReviewMistakes}
              style={{
                width: "100%",
                minHeight: "46px",
                background: "var(--primary, #1971c2)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 14px rgba(25, 113, 194, 0.3)",
              }}
            >
              <IconSearch size={18} stroke={2.2} />
              <span>{t("gamification.reviewMistakes", "Xatolarni tahlil qilish")}</span>
            </button>
          )}

          {/* If 100% (zero mistakes) */}
          {!errorMsg && wrong === 0 && actualTotal > 0 && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(47, 158, 68, 0.12)",
                color: "#2f9e44",
                fontSize: "13px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <IconSparkles size={16} />
              <span>{t("gamification.allCorrect", "Barcha savollarga to'g'ri javob berildi!")}</span>
            </div>
          )}

          {/* 2. Secondary CTA: Retry Test */}
          <button
            type="button"
            onClick={onRetry}
            style={{
              width: "100%",
              minHeight: "44px",
              background: "transparent",
              color: "var(--text)",
              border: "1.5px solid var(--border)",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <IconRefresh size={17} stroke={2} />
            <span>{t("gamification.retryTest", "Qayta urinish")}</span>
          </button>

          {/* 3. Tertiary: Back to Home */}
          <button
            type="button"
            onClick={handleHome}
            style={{
              width: "100%",
              minHeight: "40px",
              background: "none",
              color: "var(--text-muted)",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
          >
            <IconArrowLeft size={16} />
            <span>{t("gamification.backHome", "Bosh sahifaga qaytish")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamificationResult;
