import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { OfflineQuestion } from "../../types/desktop";
import {
  getExamQuestions,
  saveExamResult,
  addWrongAnswer,
  recordQuestionAttempt,
  localizeQ,
  localizeOpt,
  parseOptions,
  getActiveExamSessionId,
  submitExamSession,
  toggleSavedQuestion,
} from "../../services/desktopAdapter";
import storageService from "../../services/storageService";
import SecureImage from "../../components/common/SecureImage";
import ExamTimerDisplay from "../../components/quiz/ExamTimerDisplay";
import { offlineMediaManager } from "../../services/offlineMediaManager";
import { getImageUrl } from "../../utils/imageUtils";
import ImageZoomModal from "../../components/common/ImageZoomModal";
import ColorMode from "../../components/other/ColorMode";
import LanguagePicker from "../../components/language/LanguagePicker";
import SEO from "../../components/common/SEO";
import GamificationResult from "../../components/quiz/GamificationResult";
import QuizReviewModal from "../../components/quiz/QuizReviewModal";
import { dbClient } from "../../database";
import { generateUUID } from "../../sync";
import { showToast } from "../../utils/notificationUtils";
import OfflinePreparationModal from "../../components/offline/OfflinePreparationModal";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconSteeringWheel,
  IconAlertTriangle,
  IconDownload,
  IconBookmark,
  IconBookmarkFilled,
} from "@tabler/icons-react";

type Phase = "loading" | "exam" | "result";

interface Answer {
  selected: number;
  correct: number;
}

export default function Exam_Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : 1;

  const countParam = Number(searchParams.get("count"));
  const questionCount = countParam && countParam > 0 ? countParam : 20;
  const MAX_WRONG = Math.floor(questionCount / 10); // 20→2, 40→4, 50→5, 60→6, 80→8, 100→10

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [timeLeft, setTimeLeft] = useState(questionCount * 60);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [savedScore, setSavedScore] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(() => {
    try {
      const list = storageService.getSavedQuestions();
      return new Set(list.map((s) => s.question.id));
    } catch {
      return new Set();
    }
  });

  const handleToggleSave = (q: OfflineQuestion) => {
    toggleSavedQuestion(userId, q);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  };

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const onBack = () => navigate("/me");

  // Beforeunload listener during exam
  useEffect(() => {
    if (phase !== "exam") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase]);

  // Scroll current question into view
  useEffect(() => {
    const el = document.getElementById(`qnum-${current}`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [current]);

  const localSessionIdRef = useRef<string>(generateUUID());

  const loadQuestions = useCallback(
    async (forceFresh = false) => {
      setPhase("loading");
      setAnswers({});
      answersRef.current = {};
      setCurrent(0);
      setIsTimeUp(false);
      setTimeLeft(questionCount * 60);
      setErrorMsg(null);

      // Crash recovery: check for existing active exam session in SQLite / IndexedDB
      if (!forceFresh) {
        try {
          const active = await dbClient.getActiveExamSession("EXAM");
          if (
            active &&
            active.questions_json &&
            active.time_remaining_seconds > 10 &&
            Date.now() - active.started_at < 60 * 60 * 1000
          ) {
            const restoredQs: OfflineQuestion[] = JSON.parse(active.questions_json);
            const restoredAns: Record<number, Answer> = JSON.parse(active.answers_json || "{}");

            if (restoredQs.length > 0) {
              localSessionIdRef.current = active.local_id;
              setQuestions(restoredQs);
              setAnswers(restoredAns);
              answersRef.current = restoredAns;
              setCurrent(active.current_index || 0);
              setTimeLeft(active.time_remaining_seconds);
              startTimeRef.current = active.started_at;
              setPhase("exam");

              showToast({
                id: "exam-crash-restored",
                dedupeKey: "exam-crash-restored",
                title: t("exam.sessionRestored", "Sessiya tiklandi"),
                message: t(
                  "exam.sessionRestoredDesc",
                  "Avvalgi yakunlanmagan imtihon holati avtomatik tiklandi"
                ),
                color: "blue",
              });
              return;
            }
          }
        } catch (err) {
          console.warn("Lokal imtihon tiklashda xatolik:", err);
        }
      }

      // Fresh exam session
      try {
        const qs = await getExamQuestions(questionCount);
        if (qs.length === 0) {
          setErrorMsg(t("exam.noQuestions", "Savollar topilmadi"));
          setPhase("result");
          return;
        }

        const newId = generateUUID();
        localSessionIdRef.current = newId;
        setQuestions(qs);
        setPhase("exam");
        startTimeRef.current = Date.now();

        await dbClient.saveExamSession({
          local_id: newId,
          server_id: getActiveExamSessionId(),
          exam_type: "EXAM",
          status: "IN_PROGRESS",
          total_questions: qs.length,
          correct_answers: 0,
          score: 0,
          duration_seconds: 0,
          time_remaining_seconds: questionCount * 60,
          started_at: Date.now(),
          completed_at: null,
          answers_json: "{}",
          questions_json: JSON.stringify(qs),
          current_index: 0,
          synced: 0,
        });
      } catch (e) {
        setErrorMsg(String(e));
        setPhase("result");
      }
    },
    [questionCount, t]
  );

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const triggerFinish = useCallback(
    (timeUp = false) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoRef.current) {
        clearTimeout(autoRef.current);
        autoRef.current = null;
      }
      const curAnswers = answersRef.current;
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const correct = Object.values(curAnswers).filter((a) => a.selected === a.correct).length;
      const total = questions.length || questionCount;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      setSavedScore(score);
      if (!timeUp) setIsTimeUp(false);
      setPhase("result");

      // Mark session completed in local crash-recovery database
      dbClient
        .completeExamSession(localSessionIdRef.current, {
          status: "COMPLETED",
          correct_answers: correct,
          score,
          duration_seconds: duration,
          completed_at: Date.now(),
        })
        .catch(() => {});

      saveExamResult({
        userId,
        score,
        totalQuestions: total,
        correctAnswers: correct,
        durationSeconds: duration,
        examType: "exam",
      }).catch(() => {});

      const activeSessionId = getActiveExamSessionId();
      if (activeSessionId && questions.length > 0) {
        const answersPayload = questions.map((q, idx) => ({
          questionId: q.id,
          selectedOptionIndex: curAnswers[idx]?.selected ?? null,
        }));
        submitExamSession(activeSessionId, answersPayload).catch(() => {});
      }
    },
    [questions, questionCount, userId]
  );

  useEffect(() => {
    if (phase !== "exam") return;
    const startSnapshot = Date.now();
    const startRemaining = timeLeft;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startSnapshot) / 1000);
      const remaining = Math.max(0, startRemaining - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTimeUp(true);
        triggerFinish(true);
      }
    };

    timerRef.current = setInterval(tick, 1000);

    const handleFocus = () => tick();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("system-resumed-from-sleep", handleFocus);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("system-resumed-from-sleep", handleFocus);
    };
  }, [phase, triggerFinish]);

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
    if (!isCorrect) {
      addWrongAnswer(userId, q).catch(() => {});
    }
    recordQuestionAttempt(userId, q.id, isCorrect, "exam").catch(() => {});

    const newAns: Record<number, Answer> = {
      ...answers,
      [current]: { selected: optIdx, correct: q.correct_option },
    };
    setAnswers(newAns);
    answersRef.current = newAns;

    const correctSoFar = Object.values(newAns).filter((a) => a.selected === a.correct).length;
    const scoreSoFar = Math.round((correctSoFar / questions.length) * 100);

    // Persist real-time progress to local database for crash resistance
    dbClient
      .saveExamSession({
        local_id: localSessionIdRef.current,
        server_id: getActiveExamSessionId(),
        exam_type: "EXAM",
        status: "IN_PROGRESS",
        total_questions: questions.length,
        correct_answers: correctSoFar,
        score: scoreSoFar,
        duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        time_remaining_seconds: timeLeft,
        started_at: startTimeRef.current,
        completed_at: null,
        answers_json: JSON.stringify(newAns),
        questions_json: JSON.stringify(questions),
        current_index: current,
        synced: 0,
      })
      .catch(() => {});

    // MAX_WRONG limit check: (10 savolga 1 ta xato)
    const wrongNow = Object.values(newAns).filter((a) => a.selected !== a.correct).length;
    if (wrongNow > MAX_WRONG) {
      setTimeout(() => triggerFinish(false), 700);
      return;
    }

    if (current < questions.length - 1) {
      autoRef.current = setTimeout(() => setCurrent((c) => c + 1), 700);
    }
  };

  // Full Desktop Keyboard Navigation (1-5, F1-F5, Arrows, Space, Enter, Esc)
  useEffect(() => {
    if (phase !== "exam") return;
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (zoomSrc) {
          setZoomSrc(null);
        } else if (confirmFinishOpen) {
          setConfirmFinishOpen(false);
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (confirmFinishOpen) {
          setConfirmFinishOpen(false);
          triggerFinish(false);
        } else {
          handleFinishClick();
        }
        return;
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (answers[current] !== undefined) {
          setCurrent((c) => Math.min((questions.length || 1) - 1, c + 1));
        }
        return;
      }

      const map: Record<string, number> = {
        F1: 0, F2: 1, F3: 2, F4: 3, F5: 4,
        "1": 0, "2": 1, "3": 2, "4": 3, "5": 4,
      };
      if (e.key in map) {
        e.preventDefault();
        handleSelect(map[e.key]);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrent((c) => Math.max(0, c - 1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrent((c) => Math.min((questions.length || 1) - 1, c + 1));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, answers, current, questions.length, zoomSrc, confirmFinishOpen, triggerFinish]);

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
    const correct = Object.values(answers).filter((a) => a.selected === a.correct).length;
    const wrong = Object.values(answers).length - correct;
    const total = questions.length || questionCount;
    const answered = Object.keys(answers).length;
    const unanswered = total - answered;
    const score = total > 0 ? Math.round((correct / total) * 100) : savedScore;

    if (errorMsg) {
      return (
        <div className="exam-result-screen">
          <div className="exam-result-card" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
            <div className="exam-result-icon failed">
              <IconAlertTriangle size={36} stroke={1.5} />
            </div>
            <h2 className="exam-result-title failed">{t("common.error", "Xatolik")}</h2>
            <p className="exam-result-sub" style={{ marginBottom: 20 }}>
              {errorMsg === t("exam.noQuestions", "Savollar topilmadi")
                ? t("offline.questionsNotPreloaded", "Lokal bazada savollar topilmadi yoki to'liq tayyorlanmagan.")
                : errorMsg}
            </p>
            <div className="exam-result-actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="exam-result-btn primary"
                onClick={() => setShowOfflineModal(true)}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 20px",
                  fontWeight: 600,
                  borderRadius: 10,
                }}
              >
                <IconDownload size={18} /> {t("offline.prepareDataset", "Offline bazani tayyorlash / yuklash")}
              </button>
              <button
                className="exam-result-btn secondary"
                onClick={onBack}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 10,
                }}
              >
                <IconArrowLeft size={18} /> {t("common.backToHome", "Bosh sahifaga qaytish")}
              </button>
            </div>
          </div>
          <OfflinePreparationModal
            opened={showOfflineModal}
            onClose={() => setShowOfflineModal(false)}
            onSuccess={() => {
              setShowOfflineModal(false);
              loadQuestions(true);
            }}
          />
        </div>
      );
    }

    return (
      <>
        <SEO
          title={t("activeTest.results", "Imtihon natijasi")}
          description="Imtihon natijalari va statistikasi"
          canonical="/exam"
        />
        <div style={{ height: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GamificationResult
            score={score}
            correct={correct}
            wrong={wrong}
            unanswered={unanswered}
            total={total}
            title={t("exam.officialTitle", "Rasmiy DTM Imtihon Simulyatori")}
            badge={`${total} ${t("activeTest.questionsCount", "savol")} • ${MAX_WRONG} ${t("exam.maxWrongAllowed", "tagacha xato")}`}
            isTimeUp={isTimeUp}
            onRetry={() => loadQuestions(true)}
            onReviewMistakes={() => setReviewOpen(true)}
            onHome={onBack}
          />
        </div>

        <QuizReviewModal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          questions={questions}
          answers={answers}
          onToggleSave={handleToggleSave}
          savedIds={savedIds}
        />
      </>
    );
  }

  // ─── EXAM ───
  const q = questions[current];
  const options = parseOptions(q.options_json);
  const answered = answers[current];
  const correct = Object.values(answers).filter((a) => a.selected === a.correct).length;
  const wrong = Object.values(answers).length - correct;

  // Predictive Image Prefetching for 0ms transitions
  useEffect(() => {
    if (!questions || questions.length === 0) return;
    const nextQs = questions.slice(current + 1, current + 4);
    const prevQs = questions.slice(Math.max(0, current - 2), current);
    [...nextQs, ...prevQs].forEach((item) => {
      if (item.image_path) {
        const url = getImageUrl(item.image_path);
        if (url) {
          const img = new Image();
          img.src = url;
        }
        offlineMediaManager.cacheImage(item.image_path).catch(() => {});
      }
    });
  }, [current, questions]);

  const handleFinishClick = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      setConfirmFinishOpen(true);
    } else {
      triggerFinish(false);
    }
  };

  return (
    <>
      <SEO
        title="Imtihon topshirish"
        description="Prava Online haydovchilik imtihoni."
        canonical="/exam"
      />
      {zoomSrc && <ImageZoomModal src={zoomSrc} onClose={() => setZoomSrc(null)} />}
      <div className="exam-screen">
        {/* ── Top bar ── */}
        <div className="exam-topbar">
          <div className="exam-topbar-left">
            <button
              className="exam-finish-btn"
              onClick={handleFinishClick}
              type="button"
            >
              {t("exam.finish", "Yakunlash")} <IconX size={15} />
            </button>
            <ExamTimerDisplay initialSeconds={questionCount * 60} onTimeUp={() => { setIsTimeUp(true); triggerFinish(true); }} />
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
              <IconX size={13} /> {wrong} / {MAX_WRONG}
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
          {/* Left: options */}
          <div className="exam-col-options">
            {options.map((opt, idx) => {
              let cls = "exam-opt-btn";
              if (answered) {
                if (idx === q.correct_option) cls += " correct";
                else if (idx === answered.selected) cls += " wrong";
              }
              return (
                <button
                  key={idx}
                  className={cls}
                  onClick={() => handleSelect(idx)}
                  disabled={answered !== undefined}
                  type="button"
                >
                  <span className="opt-key">F{idx + 1}</span>
                  <span className="opt-text">{localizeOpt(opt)}</span>
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
          </div>

          {/* Right: image or placeholder */}
          <div className="exam-col-image">
            {q.image_path ? (
              <SecureImage
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
                {questions.map((_, i) => {
                  const a = answers[i];
                  let cls = "exam-qnum";
                  if (i === current) cls += " active";
                  else if (a) cls += a.selected === a.correct ? " correct" : " wrong";
                  return (
                    <button
                      key={i}
                      className={cls}
                      onClick={() => setCurrent(i)}
                      id={`qnum-${i}`}
                      type="button"
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {current === questions.length - 1 ? (
              <button
                className="exam-nav-btn primary"
                onClick={handleFinishClick}
                type="button"
              >
                {t("exam.finish", "Yakunlash")} <IconCheck size={17} />
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
      </div>

      {/* Early finish confirmation modal */}
      {confirmFinishOpen && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmFinishOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 99999,
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
              background: "var(--card-bg, #ffffff)",
              borderRadius: "18px",
              padding: "26px 24px",
              border: "1.5px solid var(--border)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
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
              <IconAlertTriangle size={30} stroke={2} />
            </div>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--text, #111827)",
              }}
            >
              {t("activeTest.confirmFinishTitle", "Testni yakunlaysizmi?")}
            </h3>
            <p
              style={{
                margin: "0 0 22px 0",
                fontSize: "13.5px",
                color: "var(--text-muted, #64748b)",
                lineHeight: 1.5,
              }}
            >
              {t(
                "activeTest.confirmFinishDesc",
                "Belgilanmagan savollar xato deb hisoblanadi. Rostdan ham testni yakunlamoqchimisiz?"
              )}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setConfirmFinishOpen(false)}
                style={{
                  flex: 1,
                  minHeight: "44px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border)",
                  background: "var(--surface, transparent)",
                  color: "var(--text, #334155)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {t("activeTest.cancel", "Davom etish")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmFinishOpen(false);
                  triggerFinish(false);
                }}
                style={{
                  flex: 1,
                  minHeight: "44px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#e03131",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(224, 49, 49, 0.3)",
                  transition: "all 0.15s ease",
                }}
              >
                {t("activeTest.confirm", "Yakunlash")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
