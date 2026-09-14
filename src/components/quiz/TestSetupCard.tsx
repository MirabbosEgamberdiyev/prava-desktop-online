import React from "react";
import { useTranslation } from "react-i18next";
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconBook2,
  IconFlame,
  IconListNumbers,
} from "@tabler/icons-react";
import type { OfflineTopic } from "../../types/desktop";

export interface TestSetupCardProps {
  topics: OfflineTopic[];
  selectedTopicId: number | null;
  onSelectTopic: (topicId: number | null) => void;
  countOptions: number[];
  selectedCountIdx: number;
  onSelectCountIdx: (idx: number) => void;
  onStart: () => void;
  onBack: () => void;
  localizeTopic: (tp: OfflineTopic) => string;
}

export const TestSetupCard: React.FC<TestSetupCardProps> = ({
  topics,
  selectedTopicId,
  onSelectTopic,
  countOptions,
  selectedCountIdx,
  onSelectCountIdx,
  onStart,
  onBack,
  localizeTopic,
}) => {
  const { t } = useTranslation();

  const currentTopic =
    selectedTopicId != null ? topics.find((t) => t.id === selectedTopicId) : null;

  const totalAllQuestions = topics.reduce((s, tp) => s + (tp.question_count || 0), 0) || 1190;
  const maxQ = currentTopic ? currentTopic.question_count : totalAllQuestions;

  // Strict Terminology Separation:
  // Single Topic -> "Mavzulashtirilgan test"
  // All Topics -> "Katta Marafon"
  const isSingleTopic = selectedTopicId != null;
  const screenTitle = isSingleTopic
    ? t("testSetup.topicTestTitle", "Mavzulashtirilgan test")
    : t("testSetup.marathonTitle", "Katta Marafon");

  return (
    <div
      className="test-setup-container"
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px 16px",
        width: "100%",
      }}
    >
      <div
        className="test-setup-card"
        style={{
          background: "var(--card-bg, var(--surface, #fff))",
          borderRadius: "20px",
          border: "1.5px solid var(--border)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          padding: "28px 24px",
        }}
      >
        {/* Header with Back button and Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label={t("common.back", "Ortga")}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "var(--surface-muted, rgba(0,0,0,0.04))",
              border: "1px solid var(--border)",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <IconArrowLeft size={20} />
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isSingleTopic ? (
                <IconBook2 size={20} color="#1971c2" />
              ) : (
                <IconFlame size={20} color="#7950f2" />
              )}
              <h2
                style={{
                  margin: 0,
                  fontSize: "19px",
                  fontWeight: 800,
                  color: "var(--text)",
                  letterSpacing: "-0.2px",
                }}
              >
                {screenTitle}
              </h2>
            </div>
            {currentTopic && (
              <p
                style={{
                  margin: "3px 0 0 0",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {localizeTopic(currentTopic)}
              </p>
            )}
          </div>
        </div>

        {/* Topic Selector (Single display of question count) */}
        <div style={{ marginBottom: "22px" }}>
          <label
            htmlFor="setup-topic-select"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "8px",
            }}
          >
            {t("testSetup.selectTopic", "Mavzuni tanlang")}
          </label>
          <select
            id="setup-topic-select"
            value={selectedTopicId ?? ""}
            onChange={(e) =>
              onSelectTopic(e.target.value === "" ? null : Number(e.target.value))
            }
            style={{
              width: "100%",
              height: "44px",
              padding: "0 14px",
              borderRadius: "12px",
              border: "1.5px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "14px",
              fontWeight: 600,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">{t("testSetup.allTopics", "Barcha mavzular")}</option>
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {localizeTopic(tp)} ({tp.question_count})
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Question Count Selector Chips */}
        <div style={{ marginBottom: "26px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <label
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {t("testSetup.questionCount", "Savollar soni")}
            </label>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
              }}
            >
              <IconListNumbers size={14} />
              {t("testSetup.available", "Mavjud")}: {maxQ}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "8px",
            }}
          >
            {countOptions.map((n, idx) => {
              const isAll = n === 0;
              const label = isAll
                ? `${t("testSetup.allQuestions", "Barchasi")}`
                : String(n);

              // Dynamic Validation:
              // If N > maxQ, it becomes disabled (opacity-30 pointer-events-none)
              const isOptionExcessive = !isAll && maxQ > 0 && n > maxQ;
              const isSelected = selectedCountIdx === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => !isOptionExcessive && onSelectCountIdx(idx)}
                  disabled={isOptionExcessive}
                  title={
                    isOptionExcessive
                      ? t("testSetup.limitExceededTooltip", "Bu mavzuda faqat {{count}} ta savol mavjud", {
                          count: maxQ,
                        })
                      : undefined
                  }
                  style={{
                    height: "44px",
                    borderRadius: "10px",
                    border: isSelected
                      ? "2px solid var(--primary, #1971c2)"
                      : "1.5px solid var(--border)",
                    background: isSelected
                      ? "var(--primary-light, rgba(25, 113, 194, 0.1))"
                      : "var(--surface)",
                    color: isSelected ? "var(--primary, #1971c2)" : "var(--text)",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: isOptionExcessive ? "not-allowed" : "pointer",
                    opacity: isOptionExcessive ? 0.3 : 1,
                    pointerEvents: isOptionExcessive ? "none" : "auto",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Start Button */}
        <button
          type="button"
          onClick={onStart}
          style={{
            width: "100%",
            height: "48px",
            borderRadius: "12px",
            background: "var(--primary, #1971c2)",
            color: "#fff",
            border: "none",
            fontSize: "15px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(25, 113, 194, 0.35)",
            transition: "all 0.15s ease",
          }}
        >
          <IconPlayerPlay size={19} stroke={2.5} />
          <span>{t("testSetup.startTest", "Testni boshlash")}</span>
        </button>
      </div>
    </div>
  );
};

export default TestSetupCard;
