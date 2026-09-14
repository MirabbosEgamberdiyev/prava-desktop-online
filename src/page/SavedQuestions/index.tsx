import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { SavedQuestionEntry } from "../../types/desktop";
import {
  getSavedQuestions,
  toggleSavedQuestion,
  parseOptions,
  localizeQ,
  localizeOpt,
  localizeExp,
} from "../../services/desktopAdapter";
import {
  IconArrowLeft,
  IconBookmark,
  IconBookmarkOff,
  IconCheck,
  IconX,
  IconBulb,
} from "@tabler/icons-react";
import ImageZoomModal, { ZoomableImage } from "../../components/common/ImageZoomModal";
import SEO from "../../components/common/SEO";

export default function SavedQuestions_Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : 1;

  const [entries, setEntries] = useState<SavedQuestionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const loadData = () => {
    getSavedQuestions(userId)
      .then((data) => setEntries(Array.isArray(data) ? data.filter((e) => e && e.question) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const onStorage = () => loadData();
    window.addEventListener("prava-storage-changed", onStorage);
    return () => window.removeEventListener("prava-storage-changed", onStorage);
  }, [userId]);

  const handleRemove = async (questionId: number) => {
    await toggleSavedQuestion(userId, questionId).catch(() => {});
    setEntries((prev) => prev.filter((e) => e?.question?.id !== questionId));
  };



  const onBack = () => navigate("/me");

  return (
    <>
      <SEO
        title="Saqlangan savollar"
        description="Belgilangan muhim savollar ro'yxati"
        canonical="/saved-questions"
      />
      <div className="review-screen">
        <header className="review-header">
          <button className="review-back-btn" onClick={onBack} type="button">
            <IconArrowLeft size={18} stroke={2} />
            {t("common.back", "Orqaga")}
          </button>
          <div className="review-header-title">
            <IconBookmark size={20} stroke={2} color="#1971c2" />
            <span>{t("saved.title", "Saqlangan savollar")}</span>
          </div>
          <div className="review-header-count">
            {entries.length} {t("common.questions", "savol")}
          </div>
        </header>

        <main className="review-content">
          {loading ? (
            <div className="loading-screen">
              <div className="spinner" />
            </div>
          ) : entries.length === 0 ? (
            <div className="review-empty">
              <IconBookmark size={56} stroke={1.5} color="var(--primary)" />
              <h3>{t("saved.emptyTitle", "Saqlangan savollar yo'q")}</h3>
              <p>
                {t(
                  "saved.emptySub",
                  "Test yoki imtihon davomida muhim savollarni saqlab qo'yishingiz mumkin."
                )}
              </p>
              <button
                type="button"
                className="saas-btn-primary"
                onClick={() => navigate("/tickets")}
                style={{ marginTop: 12 }}
              >
                {t("home.biletlar", "Biletlarni yechish")}
              </button>
            </div>
          ) : (
            <div className="review-list">
              {entries.map((entry) => {
                const q = entry.question;
                const opts = parseOptions(q.options_json);
                const isOpen = expanded === q.id;
                return (
                  <div key={q.id} className={`review-card ${isOpen ? "open" : ""}`}>
                    <div
                      className="review-card-top"
                      onClick={() => setExpanded(isOpen ? null : q.id)}
                    >
                      <div className="review-card-badge saved-badge">
                        <IconBookmark size={14} stroke={2} />
                      </div>
                      <p className="review-card-text">{localizeQ(q)}</p>
                      <button
                        className="review-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(q.id);
                        }}
                        title={t("saved.remove", "Saqlangandan o'chirish")}
                        type="button"
                      >
                        <IconBookmarkOff size={14} stroke={2} />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="review-card-body">
                        <div className="review-card-options">
                          {opts.map((opt) => (
                            <div
                              key={opt.index}
                              className={`review-option ${
                                opt.index === q.correct_option ? "correct" : ""
                              }`}
                            >
                              {opt.index === q.correct_option ? (
                                <IconCheck size={14} stroke={2.5} />
                              ) : (
                                <IconX size={14} stroke={2.5} />
                              )}
                              {localizeOpt(opt)}
                            </div>
                          ))}
                        </div>
                        {q.image_path && (
                          <div className="review-card-img-wrap">
                            <ZoomableImage
                              path={q.image_path}
                              className="review-card-img"
                              onOpen={(src) => setZoomSrc(src)}
                            />
                          </div>
                        )}
                        {localizeExp(q) && (
                          <div className="quiz-explanation-wrap" style={{ marginTop: 10 }}>
                            <div className="quiz-explanation-text" style={{ display: "block" }}>
                              <strong>
                                <IconBulb size={15} style={{ verticalAlign: "middle", marginRight: 4 }} />
                                {t("exam.explanation", "Izoh")}:
                              </strong>{" "}
                              {localizeExp(q)}
                            </div>
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
        {zoomSrc && <ImageZoomModal src={zoomSrc} onClose={() => setZoomSrc(null)} />}
      </div>
    </>
  );
}
