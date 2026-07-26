import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { SavedQuestionResponse, OptionResponse, LocalizedText } from "../types";
import { getSavedQuestions, toggleSavedQuestion } from "../api";
import { API_BASE } from "../api";
import {
  IconArrowLeft, IconBookmarkOff, IconBookmark,
  IconCheck, IconX, IconRefresh, IconAlertTriangle,
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
  onBack: () => void;
}

export default function SavedQuestionsScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries]   = useState<SavedQuestionResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  // Toggle so'rovi ikki marta ketmasin — aks holda ikkinchi POST savolni
  // qaytadan saqlanganlar ro'yxatiga qo'shib qo'yardi.
  const [removing, setRemoving] = useState<number[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getSavedQuestions()
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (questionId: number) => {
    if (removing.includes(questionId)) return;
    setRemoving((prev) => [...prev, questionId]);
    try {
      await toggleSavedQuestion(questionId);
    } catch (e) {
      console.warn("[SavedQuestions] op failed:", e);
    } finally {
      setEntries((prev) => prev.filter((x) => x.questionId !== questionId));
      setRemoving((prev) => prev.filter((id) => id !== questionId));
    }
  };

  return (
    <div className="review-screen">
      <header className="review-header">
        <button type="button" className="review-back-btn" onClick={onBack}>
          <IconArrowLeft size={18} stroke={2} />
          {t("common.back")}
        </button>
        <div className="review-header-title">
          <IconBookmark size={20} stroke={2} color="var(--primary)" />
          <span>{t("saved.title")}</span>
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
            <IconAlertTriangle size={48} stroke={1.5} color="var(--danger)" />
            <h3 className="state-error-title">{t("common.error")}</h3>
            <p className="state-error-detail">{error}</p>
            <button type="button" className="retry-btn" onClick={load}>
              <IconRefresh size={15} /> {t("exam.retry")}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="review-empty">
            <IconBookmark size={56} stroke={1.5} color="var(--primary)" />
            <h3>{t("saved.emptyTitle")}</h3>
            <p>{t("saved.emptySub")}</p>
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
                  {/* Sarlavha klaviatura bilan ham ochiladi (ilgari faqat onClick) */}
                  <div
                    className="review-card-top"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : entry.questionId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(isOpen ? null : entry.questionId);
                      }
                    }}
                  >
                    <div className="review-card-badge saved-badge">
                      <IconBookmark size={13} stroke={2} />
                    </div>
                    <p className="review-card-text">{text}</p>
                    <button
                      type="button"
                      className="review-remove-btn"
                      onClick={(e) => { e.stopPropagation(); handleRemove(entry.questionId); }}
                      onKeyDown={(e) => e.stopPropagation()}
                      disabled={removing.includes(entry.questionId)}
                      title={t("saved.remove")}
                      aria-label={t("saved.remove")}
                    >
                      <IconBookmarkOff size={14} stroke={2} />
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
                          <img
                            src={img}
                            alt=""
                            className="review-card-img"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const el = e.currentTarget;
                              if (!el.src.endsWith("/question-default.svg")) el.src = "/question-default.svg";
                            }}
                          />
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
