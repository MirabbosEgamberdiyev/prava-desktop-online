import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { UserResponse, WrongAnswerResponse, OptionResponse, LocalizedText } from "../types";
import { getWrongAnswers, removeWrongAnswer } from "../api";
import { API_BASE } from "../api";
import {
  IconArrowLeft, IconTrash, IconAlertTriangle, IconCheck, IconX,
  IconRefresh,
} from "@tabler/icons-react";

function getLocal(lt?: LocalizedText | null): string {
  if (!lt) return "";
  const l = i18n.language;
  if (l === "uzc" && lt.uzc) return lt.uzc;
  if (l === "ru" && lt.ru) return lt.ru;
  if (l === "en" && lt.en) return lt.en;
  return lt.uzl || lt.uzc || lt.ru || lt.en || "";
}

function imgSrc(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

interface Props {
  user: UserResponse;
  onBack: () => void;
}

export default function WrongAnswersScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries]   = useState<WrongAnswerResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getWrongAnswers()
      .then(setEntries)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (questionId: number) => {
    await removeWrongAnswer(questionId).catch((e) => console.warn("[WrongAnswers] op failed:", e));
    setEntries((prev) => prev.filter((e) => e.questionId !== questionId));
  };

  return (
    <div className="review-screen">
      <header className="review-header">
        <button className="review-back-btn" onClick={onBack}>
          <IconArrowLeft size={18} stroke={2} />
          {t("common.back")}
        </button>
        <div className="review-header-title">
          <IconAlertTriangle size={20} stroke={2} color="#e03131" />
          <span>{t("wrongAnswers.title")}</span>
        </div>
        <div className="review-header-count">
          {!error && !loading && `${entries.length} ${t("common.questions")}`}
        </div>
      </header>

      <main className="review-content">
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : error ? (
          <div className="review-empty">
            <IconAlertTriangle size={48} stroke={1.5} color="#e03131" />
            <h3 style={{ color: "#e03131" }}>{t("common.error")}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{error}</p>
            <button
              onClick={load}
              style={{
                marginTop: 12, padding: "8px 20px",
                background: "var(--primary)", color: "#fff",
                border: "none", borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
              }}
            >
              <IconRefresh size={15} /> {t("exam.retry")}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="review-empty">
            <IconCheck size={56} stroke={1.5} color="#2f9e44" />
            <h3>{t("wrongAnswers.emptyTitle")}</h3>
            <p>{t("wrongAnswers.emptySub")}</p>
          </div>
        ) : (
          <div className="review-list">
            {entries.map((entry) => {
              const isOpen = expanded === entry.questionId;
              const text   = getLocal(entry.text);
              const opts   = entry.options || [];
              const img    = imgSrc(entry.imageUrl);

              return (
                <div key={entry.questionId} className={`review-card ${isOpen ? "open" : ""}`}>
                  <div className="review-card-top" onClick={() => setExpanded(isOpen ? null : entry.questionId)}>
                    <div className="review-card-badge wrong-badge">
                      {entry.wrongCount}✕
                    </div>
                    <p className="review-card-text">{text}</p>
                    <button
                      className="review-remove-btn"
                      onClick={(e) => { e.stopPropagation(); handleRemove(entry.questionId); }}
                      title={t("wrongAnswers.remove")}
                    >
                      <IconTrash size={14} stroke={2} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="review-card-body">
                      <div className="review-card-options">
                        {opts.map((opt: OptionResponse, idx: number) => (
                          <div
                            key={idx}
                            className={`review-option ${idx === entry.correctOptionIndex ? "correct" : ""}`}
                          >
                            {idx === entry.correctOptionIndex
                              ? <IconCheck size={14} stroke={2.5} />
                              : <IconX size={14} stroke={2.5} />
                            }
                            {getLocal(opt.text)}
                          </div>
                        ))}
                      </div>
                      {img && (
                        <div className="review-card-img-wrap">
                          <img src={img} alt="" className="review-card-img" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
