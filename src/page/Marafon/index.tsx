import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { OfflineQuestion, OfflineTopic } from "../../types/desktop";
import {
  getMarathonQuestions,
  getTopics,
  addWrongAnswer,
  saveExamResult,
  toggleSavedQuestion,
  getSavedQuestions,
  recordQuestionAttempt,
  localizeQ,
  localizeOpt,
  localizeExp,
  localizeTopic,
  parseOptions,
  getActiveMarathonSessionId,
  submitExamSession,
} from "../../services/desktopAdapter";
import ColorMode from "../../components/other/ColorMode";
import LanguagePicker from "../../components/language/LanguagePicker";
import ImageZoomModal, { ZoomableImage } from "../../components/common/ImageZoomModal";
import GamificationResult from "../../components/quiz/GamificationResult";
import QuizReviewModal from "../../components/quiz/QuizReviewModal";
import TestSetupCard from "../../components/quiz/TestSetupCard";
import SEO from "../../components/common/SEO";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconX,
  IconSteeringWheel,
  IconBulb,
  IconBookmark,
  IconBookmarkFilled,
  IconAlertTriangle,
} from "@tabler/icons-react";

type Phase = "setup" | "loading" | "exam" | "result";

interface Answer {
  selected: number;
  correct: number;
}

const COUNT_OPTIONS = [10, 20, 30, 50, 0]; // 0 = barchasi

export default function Marafon_Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : 1;

  const location = useLocation();
  const rawTopicId = searchParams.get("topicId") || (location.state as any)?.topicId;
  const initialTopicId = rawTopicId ? Number(rawTopicId) : null;

  // Setup state
  const [topics, setTopics] = useState<OfflineTopic[]>([]);
  const [selTopic, setSelTopic] = useState<number | null>(initialTopicId);
  const [countIdx, setCountIdx] = useState(0);

  // Exam state
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [showExp, setShowExp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);

  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  const activeQnumRef = useRef<HTMLButtonElement | null>(null);
  answersRef.current = answers;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phase === "exam" && Object.keys(answers).length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase, answers]);

  const onBack = () => {
    if (phase === "setup") {
      navigate("/me");
    } else {
      setPhase("setup");
    }
  };

  useEffect(() => {
    getTopics().then((data) => setTopics(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    getSavedQuestions(userId)
      .then((entries) => {
        if (Array.isArray(entries)) {
          setSavedIds(new Set(entries.filter((e) => e?.question?.id != null).map((e) => e.question.id)));
        }
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    setShowExp(false);
  }, [current]);

  useEffect(() => {
    activeQnumRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [current]);

  const startExam = useCallback(() => {
    setPhase("loading");
    setAnswers({});
    answersRef.current = {};
    setCurrent(0);
    setErrorMsg(null);

    const maxQ =
      selTopic != null
        ? topics.find((t) => t.id === selTopic)?.question_count ?? 0
        : topics.reduce((s, t) => s + (t.question_count || 0), 0);

    const chosenOption = COUNT_OPTIONS[countIdx];
    const limit =
      chosenOption === 0
        ? (maxQ > 0 ? maxQ : 1190)
        : (maxQ > 0 ? Math.min(chosenOption, maxQ) : chosenOption);

    getMarathonQuestions(selTopic ?? undefined, limit)
      .then((qs) => {
        if (qs.length === 0) {
          setErrorMsg(t("marathon.noQuestions", "Savollar topilmadi"));
          setPhase("result");
          return;
        }
        setQuestions(qs);
        setPhase("exam");
      })
      .catch((e) => {
        setErrorMsg(String(e));
        setPhase("result");
      });
  }, [selTopic, countIdx, topics, t]);

  const triggerFinish = useCallback(() => {
    if (autoRef.current) {
      clearTimeout(autoRef.current);
      autoRef.current = null;
    }
    const curAnswers = answersRef.current;
    const correct = Object.values(curAnswers).filter((a) => a.selected === a.correct).length;
    const total = questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    setPhase("result");
    saveExamResult({
      userId,
      score,
      totalQuestions: total,
      correctAnswers: correct,
      durationSeconds: 0,
      examType: "marathon",
    }).catch(() => {});

    const activeId = getActiveMarathonSessionId();
    if (activeId && questions.length > 0) {
      const submitList = questions.map((q, idx) => ({
        questionId: q.id,
        selectedOptionIndex: curAnswers[idx]?.selected ?? null,
      }));
      submitExamSession(activeId, submitList).catch(() => {});
    }
  }, [questions, userId]);

  const handleSelect = (optIdx: number) => {
    if (answers[current] !== undefined) return;
    const q = questions[current];
    if (!q) return;
    const opts = parseOptions(q.options_json);
    if (optIdx >= opts.length) return;
    if (autoRef.current) {
      clearTimeout(autoRef.current);
      autoRef.current = null;
    }

    const isCorrect = optIdx === q.correct_option;
    if (!isCorrect) addWrongAnswer(userId, q).catch(() => {});
    recordQuestionAttempt(userId, q.id, isCorrect, "marathon").catch(() => {});

    const newAns = {
      ...answers,
      [current]: { selected: optIdx, correct: q.correct_option },
    };
    setAnswers(newAns);
    answersRef.current = newAns;

    if (current < questions.length - 1) {
      autoRef.current = setTimeout(() => setCurrent((c) => c + 1), 800);
    }
  };

  const handleToggleExp = () => {
    const willOpen = !showExp;
    setShowExp(willOpen);
    if (willOpen) {
      if (autoRef.current) {
        clearTimeout(autoRef.current);
        autoRef.current = null;
      }
    } else if (current < questions.length - 1) {
      autoRef.current = setTimeout(() => setCurrent((c) => c + 1), 500);
    }
  };

  const handleToggleSave = (q: OfflineQuestion) => {
    if (autoRef.current) {
      clearTimeout(autoRef.current);
      autoRef.current = null;
    }
    toggleSavedQuestion(userId, q);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  };

  // F1–F5 and 1–5 keyboard shortcuts
  useEffect(() => {
    if (phase !== "exam") return;
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const map: Record<string, number> = {
        F1: 0, F2: 1, F3: 2, F4: 3, F5: 4,
        "1": 0, "2": 1, "3": 2, "4": 3, "5": 4,
      };
      if (e.key in map) {
        e.preventDefault();
        handleSelect(map[e.key]);
      }
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight")
        setCurrent((c) => Math.min((questions.length || 1) - 1, c + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, answers, current, questions.length]);

  // ─── SETUP ───
  if (phase === "setup") {
    const isSingleTopic = selTopic != null;
    const pageTitle = isSingleTopic
      ? t("testSetup.topicTestTitle", "Mavzulashtirilgan test")
      : t("testSetup.marathonTitle", "Katta Marafon");

    return (
      <>
        <SEO
          title={`${pageTitle} - Prava Online`}
          description="Yo'l harakati qoidalari bo'yicha mustahkamlash testi"
          canonical="/marafon"
        />
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
          <header className="home-header">
            <div className="home-header-inner">
              <div
                className="home-header-logo"
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                onClick={() => navigate("/me")}
              >
                <img src="/logo.png" width={32} height={32} alt="Prava" onError={(e) => { (e.target as HTMLImageElement).src = "/logo.svg"; }} />
                <span className="home-header-brand">PRAVA<span className="brand-accent">ONLINE</span></span>
              </div>
              <div className="home-header-right">
                <LanguagePicker />
                <ColorMode />
              </div>
            </div>
          </header>

          <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 12px" }}>
            <TestSetupCard
              topics={topics}
              selectedTopicId={selTopic}
              onSelectTopic={(id) => setSelTopic(id)}
              countOptions={COUNT_OPTIONS}
              selectedCountIdx={countIdx}
              onSelectCountIdx={(idx) => setCountIdx(idx)}
              onStart={startExam}
              onBack={onBack}
              localizeTopic={localizeTopic}
            />
          </main>
        </div>
      </>
    );
  }

  // ─── LOADING ───
  if (phase === "loading") {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>{t("common.loading", "Yuklanmoqda...")}</p>
      </div>
    );
  }

  // ─── RESULT ───
  if (phase === "result") {
    const answeredCount = Object.values(answers).length;
    const correct = Object.values(answers).filter((a) => a.selected === a.correct).length;
    const total = questions.length;
    const wrong = answeredCount - correct;
    const unanswered = Math.max(0, total - answeredCount);
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const isSingleTopic = selTopic != null;
    const screenTitle = isSingleTopic
      ? t("testSetup.topicTestTitle", "Mavzulashtirilgan test")
      : t("testSetup.marathonTitle", "Katta Marafon");

    return (
      <>
        <SEO
          title={`${screenTitle} natijasi`}
          description="Prava Online test natijalari va statistikasi"
          canonical="/marafon"
        />
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
          <header className="home-header">
            <div className="home-header-inner">
              <div
                className="home-header-logo"
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                onClick={() => navigate("/me")}
              >
                <img src="/logo.png" width={32} height={32} alt="Prava" onError={(e) => { (e.target as HTMLImageElement).src = "/logo.svg"; }} />
                <span className="home-header-brand">PRAVA<span className="brand-accent">ONLINE</span></span>
              </div>
              <div className="home-header-right">
                <LanguagePicker />
                <ColorMode />
              </div>
            </div>
          </header>

          <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 12px" }}>
            <GamificationResult
              score={score}
              correct={correct}
              wrong={wrong}
              unanswered={unanswered}
              totalQuestions={total}
              errorMsg={errorMsg}
              onReviewMistakes={() => setReviewOpen(true)}
              onRetry={() => {
                setPhase("setup");
              }}
              onBackHome={() => navigate("/me")}
              title={`${screenTitle} natijasi`}
            />
          </main>

          <QuizReviewModal
            opened={reviewOpen}
            onClose={() => setReviewOpen(false)}
            questions={questions}
            answers={answers}
          />
        </div>
      </>
    );
  }

  // ─── EXAM ───
  const q = questions[current];
  const options = parseOptions(q.options_json);
  const answered = answers[current];
  const explanation = answered !== undefined ? localizeExp(q) : null;
  const correct = Object.values(answers).filter((a) => a.selected === a.correct).length;
  const wrong = Object.values(answers).length - correct;

  return (
    <>
      <SEO
        title="Marafon davom etmoqda"
        description="Prava Online marafon testi"
        canonical="/marafon"
      />
      <div className="exam-screen">
        {/* ── Top bar ── */}
        <div className="exam-topbar">
          <div className="exam-topbar-left">
            <button
              className="exam-finish-btn"
              onClick={() => {
                const answeredCount = Object.keys(answers).length;
                if (answeredCount < questions.length) {
                  setConfirmFinishOpen(true);
                } else {
                  triggerFinish();
                }
              }}
              type="button"
            >
              {t("activeTest.finishTest", "Yakunlash")} <IconX size={15} />
            </button>
          </div>

          <div className="exam-topbar-center">
            <span className="exam-counter">
              {current + 1} / {questions.length}
            </span>
          </div>

          <div className="exam-topbar-right">
            <span className="exam-score-chip green">
              <IconCheck size={13} /> {correct}
            </span>
            <span className="exam-score-chip red">
              <IconX size={13} /> {wrong}
            </span>
            <ColorMode />
            <LanguagePicker />
          </div>
        </div>

        {/* ── Question text ── */}
        <div className="exam-question-header">
          <p className="exam-question-text">{localizeQ(q)}</p>
          <button
            className={`exam-bookmark-btn${savedIds.has(q.id) ? " saved" : ""}`}
            onClick={() => handleToggleSave(q)}
            title={
              savedIds.has(q.id)
                ? t("saved.remove", "Saqlangandan o'chirish")
                : t("common.save", "Saqlash")
            }
            type="button"
          >
            {savedIds.has(q.id) ? (
              <IconBookmarkFilled size={18} />
            ) : (
              <IconBookmark size={18} />
            )}
          </button>
        </div>

        {/* ── Two-column body ── */}
        <div className="exam-two-col">
          {/* Left: options + explanation */}
          <div className="exam-col-options">
            {options.map((opt, idx) => {
              let cls = "exam-option";
              if (answered) {
                if (idx === q.correct_option) cls += " correct";
                else if (idx === answered.selected) cls += " wrong";
              }
              return (
                <button
                  key={idx}
                  className={cls}
                  onClick={() => handleSelect(idx)}
                  disabled={!!answered}
                  type="button"
                >
                  <span className="exam-option-key">F{idx + 1}</span>
                  <span className="exam-option-text">{localizeOpt(opt)}</span>
                  {answered && idx === q.correct_option && (
                    <IconCheck size={15} className="opt-icon correct" />
                  )}
                  {answered &&
                    idx === answered.selected &&
                    idx !== q.correct_option && (
                      <IconX size={15} className="opt-icon wrong" />
                    )}
                </button>
              );
            })}

            {/* Explanation toggle */}
            {explanation && (
              <div className="quiz-explanation-wrap" style={{ marginTop: 10 }}>
                <button
                  className="quiz-explanation-toggle"
                  onClick={handleToggleExp}
                  type="button"
                >
                  <IconBulb size={15} />
                  {showExp
                    ? t("marathon.hideExplanation", "Izohni yashirish")
                    : t("marathon.showExplanation", "Izohni ko'rish")}
                </button>
                {showExp && (
                  <div className="quiz-explanation-text">{explanation}</div>
                )}
              </div>
            )}
          </div>

          {/* Right: image or placeholder */}
          <div className="exam-col-image">
            {q.image_path ? (
              <ZoomableImage
                path={q.image_path}
                className="exam-question-img"
                onOpen={(src) => setZoomSrc(src)}
              />
            ) : (
              <div className="exam-img-placeholder">
                <IconSteeringWheel size={52} stroke={1} color="var(--border)" />
                <span className="exam-placeholder-text">pravaonline.uz</span>
              </div>
            )}
          </div>
        </div>

        {/* Zoom modal */}
        {zoomSrc && <ImageZoomModal src={zoomSrc} onClose={() => setZoomSrc(null)} />}

        {/* ── Bottom: question numbers + nav ── */}
        <div className="exam-bottom">
          <div className="exam-bottom-row">
            <button
              className="exam-nav-btn"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              type="button"
            >
              <IconChevronLeft size={17} /> {t("exam.prev", "Oldingi")}
            </button>

            <div className="exam-qnums-wrap">
              <div className="exam-qnums scrollable">
                {(() => {
                  const total = questions.length;
                  const windowSize = 60;
                  let startIdx = 0;
                  let endIdx = total;
                  if (total > windowSize) {
                    startIdx = Math.max(0, current - Math.floor(windowSize / 2));
                    endIdx = Math.min(total, startIdx + windowSize);
                    if (endIdx - startIdx < windowSize) {
                      startIdx = Math.max(0, endIdx - windowSize);
                    }
                  }
                  const visibleIndices: number[] = [];
                  for (let i = startIdx; i < endIdx; i++) {
                    visibleIndices.push(i);
                  }
                  return (
                    <>
                      {startIdx > 0 && (
                        <button
                          className="exam-qnum"
                          onClick={() => setCurrent(0)}
                          type="button"
                          title="1-savol"
                        >
                          1..
                        </button>
                      )}
                      {visibleIndices.map((i) => {
                        const a = answers[i];
                        let cls = "exam-qnum";
                        if (i === current) cls += " active";
                        else if (a) cls += a.selected === a.correct ? " correct" : " wrong";
                        return (
                          <button
                            key={i}
                            ref={i === current ? activeQnumRef : undefined}
                            className={cls}
                            onClick={() => setCurrent(i)}
                            type="button"
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                      {endIdx < total && (
                        <button
                          className="exam-qnum"
                          onClick={() => setCurrent(total - 1)}
                          type="button"
                          title={`${total}-savol`}
                        >
                          ..{total}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {current === questions.length - 1 ? (
              <button
                className="exam-nav-btn primary"
                onClick={() => {
                  const answeredCount = Object.keys(answers).length;
                  if (answeredCount < questions.length) {
                    setConfirmFinishOpen(true);
                  } else {
                    triggerFinish();
                  }
                }}
                type="button"
              >
                {t("activeTest.finishTest", "Yakunlash")} <IconCheck size={17} />
              </button>
            ) : (
              <button
                className="exam-nav-btn primary"
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                type="button"
              >
                {t("exam.next", "Keyingi")} <IconChevronRight size={17} />
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Modal before early finish */}
        {confirmFinishOpen && (
          <div
            className="modal-overlay"
            onClick={() => setConfirmFinishOpen(false)}
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
                maxWidth: "420px",
                width: "100%",
                background: "var(--card-bg, var(--surface, #fff))",
                borderRadius: "18px",
                padding: "24px",
                border: "1.5px solid var(--border)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(224, 49, 49, 0.12)",
                  color: "#e03131",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <IconAlertTriangle size={28} stroke={2} />
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>
                {t("activeTest.confirmFinishTitle", "Testni yakunlaysizmi?")}
              </h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "13.5px", color: "var(--text-muted)", lineHeight: 1.45 }}>
                {t("activeTest.confirmFinishDesc", "Belgilanmagan savollar xato deb hisoblanadi. Rostdan ham testni yakunlamoqchimisiz?")}
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setConfirmFinishOpen(false)}
                  style={{
                    flex: 1,
                    minHeight: "42px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {t("activeTest.cancel", "Davom etish")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmFinishOpen(false);
                    triggerFinish();
                  }}
                  style={{
                    flex: 1,
                    minHeight: "42px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#e03131",
                    color: "#fff",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {t("activeTest.confirm", "Yakunlash")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
