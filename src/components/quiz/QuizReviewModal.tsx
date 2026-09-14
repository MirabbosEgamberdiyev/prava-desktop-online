import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconBulb } from "@tabler/icons-react";
import type { OfflineQuestion } from "../../types/desktop";
import {
  localizeQ,
  localizeOpt,
  localizeExp,
  parseOptions,
} from "../../services/desktopAdapter";
import SecureImage from "../common/SecureImage";

export interface QuizReviewModalProps {
  opened?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  questions: OfflineQuestion[];
  answers: Record<number, { selected: number; correct: number }>;
  onToggleSave?: (q: OfflineQuestion) => void;
  savedIds?: Set<number>;
}

export const QuizReviewModal: React.FC<QuizReviewModalProps> = ({
  opened,
  isOpen,
  onClose,
  questions,
  answers,
  onToggleSave: _onToggleSave,
  savedIds: _savedIds,
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "mistakes">("mistakes");

  const isVisible = opened ?? isOpen ?? false;
  if (!isVisible) return null;

  const mistakesIndices = questions
    .map((q, idx) => ({ q, idx, ans: answers[idx] }))
    .filter(
      (item) => item.ans && item.ans.selected !== item.ans.correct
    );

  const displayedList =
    filter === "mistakes" && mistakesIndices.length > 0
      ? mistakesIndices
      : questions.map((q, idx) => ({ q, idx, ans: answers[idx] }));

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--card-bg, var(--surface, #fff))",
          borderRadius: "20px",
          border: "1.5px solid var(--border)",
          boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-muted, rgba(0,0,0,0.02))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--text)" }}>
              {t("gamification.reviewMistakes", "Xatolarni tahlil qilish")}
            </h3>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(224, 49, 49, 0.12)",
                color: "#e03131",
              }}
            >
              {mistakesIndices.length} {t("common.wrong", "ta xato")}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Filter Toggle */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--border)",
                padding: "2px",
                borderRadius: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => setFilter("mistakes")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: filter === "mistakes" ? "var(--surface)" : "transparent",
                  color: filter === "mistakes" ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                {t("common.wrong", "Faqat xatolar")}
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: filter === "all" ? "var(--surface)" : "transparent",
                  color: filter === "all" ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                {t("common.all", "Barchasi")}
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {displayedList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: "var(--text-muted)" }}>
              {t("gamification.noMistakes", "Ajoyib! Birorta ham xato qilmadingiz.")}
            </div>
          ) : (
            displayedList.map(({ q, idx, ans }) => {
              const options = parseOptions(q.options_json);
              const isWrong = ans && ans.selected !== ans.correct;
              const explanation = localizeExp(q);

              return (
                <div
                  key={q.id}
                  style={{
                    borderRadius: "14px",
                    border: `1.5px solid ${isWrong ? "rgba(224, 49, 49, 0.3)" : "rgba(47, 158, 68, 0.3)"}`,
                    background: isWrong ? "rgba(224, 49, 49, 0.02)" : "rgba(47, 158, 68, 0.02)",
                    padding: "16px",
                  }}
                >
                  {/* Question Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: isWrong ? "#e03131" : "#2f9e44",
                        background: isWrong ? "rgba(224, 49, 49, 0.1)" : "rgba(47, 158, 68, 0.1)",
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {idx + 1}-savol • {isWrong ? t("common.wrong", "Xato") : t("common.correct", "To'g'ri")}
                    </span>
                  </div>

                  {/* Image if present */}
                  {q.image_path && (
                    <div style={{ marginBottom: "12px", maxHeight: "180px", overflow: "hidden", borderRadius: "8px" }}>
                      <SecureImage
                        path={q.image_path}
                        alt="Question illustration"
                        style={{ width: "100%", maxHeight: "180px", objectFit: "contain", borderRadius: "8px" }}
                      />
                    </div>
                  )}

                  {/* Question text */}
                  <div
                    style={{
                      fontSize: "14.5px",
                      fontWeight: 700,
                      color: "var(--text)",
                      lineHeight: 1.4,
                      marginBottom: "14px",
                    }}
                  >
                    {localizeQ(q)}
                  </div>

                  {/* Options List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {options.map((opt, optIdx) => {
                      const isSelected = ans?.selected === optIdx;
                      const isCorrect = q.correct_option === optIdx;

                      let borderColor = "var(--border)";
                      let bg = "var(--surface)";
                      let textColor = "var(--text)";

                      if (isCorrect) {
                        borderColor = "#2f9e44";
                        bg = "rgba(47, 158, 68, 0.1)";
                        textColor = "#2f9e44";
                      } else if (isSelected && !isCorrect) {
                        borderColor = "#e03131";
                        bg = "rgba(224, 49, 49, 0.1)";
                        textColor = "#e03131";
                      }

                      return (
                        <div
                          key={optIdx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "9px 12px",
                            borderRadius: "10px",
                            border: `1.5px solid ${borderColor}`,
                            background: bg,
                            fontSize: "13px",
                            fontWeight: isSelected || isCorrect ? 700 : 500,
                            color: textColor,
                          }}
                        >
                          <span
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: 800,
                              background: isCorrect
                                ? "#2f9e44"
                                : isSelected
                                ? "#e03131"
                                : "var(--border)",
                              color: isCorrect || isSelected ? "#fff" : "var(--text-muted)",
                              flexShrink: 0,
                            }}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>

                          <span style={{ flex: 1 }}>{localizeOpt(opt)}</span>

                          {isCorrect && (
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#2f9e44" }}>
                              ✓ {t("examResult.correctAnswer", "To'g'ri javob")}
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#e03131" }}>
                              ✕ {t("examResult.yourAnswer", "Sizning javobingiz")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {explanation && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "rgba(25, 113, 194, 0.08)",
                        border: "1px solid rgba(25, 113, 194, 0.2)",
                        fontSize: "12.5px",
                        color: "var(--text)",
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                      }}
                    >
                      <IconBulb size={18} color="#1971c2" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 700, color: "#1971c2" }}>
                          {t("activeTest.explanation", "YHQ tushuntirishi")}:{" "}
                        </span>
                        {explanation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            background: "var(--surface-muted, rgba(0,0,0,0.02))",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 20px",
              background: "var(--primary, #1971c2)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("common.close", "Yopish")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizReviewModal;
