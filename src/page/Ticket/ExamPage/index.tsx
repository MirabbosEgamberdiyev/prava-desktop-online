import { resolveUserScopeId } from "@/utils/userScope";
import { getExamRules, durationSecondsFor, durationMinutesFor, passPercentFor, isExamPassed } from "@/services/examRules";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import type { OfflineQuestion, OfflineTicket } from "../../../types/desktop";
import {
  getQuestionsByTicket,
  getTicketInfo,
  saveExamResult,
  addWrongAnswer,
  saveTicketStat,
  toggleSavedQuestion,
  getSavedQuestions,
  recordQuestionAttempt,
  localizeQ,
  localizeOpt,
  localizeExp,
  parseOptions,
  getActiveTicketSessionId,
  reportExamResult,
  getLang,
} from "../../../services/desktopAdapter";
import { isFakeLocalSessionId } from "../../../services/offlineExamRecord";
import ColorMode from "../../../components/other/ColorMode";
import LanguagePicker from "../../../components/language/LanguagePicker";
import ImageZoomModal, { ZoomableImage } from "../../../components/common/ImageZoomModal";
import ExamTimerDisplay, { remainingSecondsUntil } from "../../../components/quiz/ExamTimerDisplay";
import ShortcutHint from "../../../components/quiz/ShortcutHint";
import { useExamShortcuts } from "../../../hooks/useExamShortcuts";
import { offlineMediaManager } from "../../../services/offlineMediaManager";
import { getImageUrl } from "../../../utils/imageUtils";
import SEO from "../../../components/common/SEO";
import GamificationResult from "../../../components/quiz/GamificationResult";
import QuizReviewModal from "../../../components/quiz/QuizReviewModal";
import { dbClient } from "../../../database";
import { generateUUID } from "../../../sync/outboxQueue";
import { showToast } from "../../../utils/notificationUtils";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconSteeringWheel,
  IconTicket,
  IconBookmark,
  IconBookmarkFilled,
  IconBulb,
  IconAlertTriangle,
  IconDownload,
} from "@tabler/icons-react";
import OfflinePreparationModal from "../../../components/offline/OfflinePreparationModal";

type Phase = "loading" | "exam" | "result";

interface Answer {
  selected: number;
  correct: number;
}

export default function TicketExamPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = resolveUserScopeId(user);

  // Official server ticket id (offline bundle v2) — name/number come from the local DB.
  const ticketId = id ? Number(id) : 1;
  const [rules] = useState(getExamRules);
  const [ticketInfo, setTicketInfo] = useState<OfflineTicket | null>(null);
  useEffect(() => {
    let alive = true;
    getTicketInfo(ticketId)
      .then((tk) => {
        if (alive) setTicketInfo(tk);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ticketId]);

  const ticket: OfflineTicket = {
    id: ticketId,
    topic_id: ticketInfo?.topic_id ?? null,
    ticket_number: ticketInfo?.ticket_number ?? ticketId,
    name_uzl: ticketInfo?.name_uzl ?? `${ticketId}-bilet`,
    name_uzc: ticketInfo?.name_uzc ?? `${ticketId}-билет`,
    name_en: ticketInfo?.name_en ?? `Ticket #${ticketId}`,
    name_ru: ticketInfo?.name_ru ?? `Билет #${ticketId}`,
    duration_minutes: durationMinutesFor("ticket", 20, rules),
    passing_score: passPercentFor("ticket", rules),
    question_count: ticketInfo?.question_count ?? 20,
  };

  const localizeName = (tk: OfflineTicket): string => {
    const l = getLang();
    if (l === "uzc" && tk.name_uzc) return tk.name_uzc;
    if (l === "ru" && tk.name_ru) return tk.name_ru;
    return tk.name_uzl;
  };

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  /** Absolute deadline (epoch ms) — persisted for crash recovery. */
  const [deadline, setDeadline] = useState<number>(
    () => Date.now() + durationSecondsFor("ticket", 20, rules) * 1000
  );
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedScore, setSavedScore] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [showExp, setShowExp] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const deadlineRef = useRef(deadline);
  deadlineRef.current = deadline;
  const serverSessionIdRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const onBack = () => navigate("/tickets");

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

  // Predictive image prefetching (before any early return — rules of hooks)
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

  const localSessionIdRef = useRef<string>(generateUUID());
  const ticketKey = `ticket_${ticketId}` as const;

  const triggerFinish = useCallback(
    (timeUp = false) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (autoRef.current) {
        clearTimeout(autoRef.current);
        autoRef.current = null;
      }
      const curAnswers = answersRef.current;
      const qs = questionsRef.current;
      const now = Date.now();
      const duration = Math.max(0, Math.floor((Math.min(now, deadlineRef.current) - startTimeRef.current) / 1000));
      const correct = Object.values(curAnswers).filter((a) => a.selected === a.correct).length;
      const answeredCount = Object.keys(curAnswers).length;
      const total = qs.length || 20;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      setSavedScore(score);
      setIsTimeUp(timeUp);
      setConfirmFinishOpen(false);
      setPhase("result");
      const isPassed = isExamPassed(
        { mode: "ticket", total, correct, wrong: answeredCount - correct, unanswered: Math.max(0, total - answeredCount) },
        rules
      );

      // Mark session completed in local crash-recovery database
      dbClient
        .completeExamSession(localSessionIdRef.current, {
          status: "COMPLETED",
          correct_answers: correct,
          score,
          duration_seconds: duration,
          completed_at: now,
        })
        .catch(() => {});

      saveExamResult({
        userId,
        score,
        totalQuestions: total,
        correctAnswers: correct,
        durationSeconds: duration,
        examType: `ticket_${ticketId}`,
      }).catch(() => {});
      saveTicketStat(userId, ticketId, duration, correct, score, isPassed).catch(() => {});

      reportExamResult({
        serverSessionId: serverSessionIdRef.current,
        localSessionId: localSessionIdRef.current,
        examType: "ticket",
        targetId: ticketId,
        questions: qs,
        answers: curAnswers,
        durationSeconds: duration,
        completedAt: now,
      }).catch(() => {});
    },
    [ticketId, rules, userId]
  );

  const loadQuestions = useCallback(
    async (forceFresh = false) => {
      setPhase("loading");
      setAnswers({});
      answersRef.current = {};
      setCurrent(0);
      setIsTimeUp(false);
      setErrorMsg(null);
      finishedRef.current = false;

      // Crash recovery: check for existing active ticket session
      if (!forceFresh) {
        try {
          const active = await dbClient.getActiveExamSession(ticketKey);
          if (active && active.questions_json && Date.now() - active.started_at < 24 * 60 * 60 * 1000) {
            const restoredQs: OfflineQuestion[] = JSON.parse(active.questions_json);
            const restoredAns: Record<number, Answer> = JSON.parse(active.answers_json || "{}");
            const restoredDeadline =
              active.deadline_at ??
              active.started_at + durationSecondsFor("ticket", restoredQs.length || 20, rules) * 1000;

            if (restoredQs.length > 0) {
              localSessionIdRef.current = active.local_id;
              serverSessionIdRef.current =
                active.server_id != null && !isFakeLocalSessionId(active.server_id) ? active.server_id : null;
              setQuestions(restoredQs);
              questionsRef.current = restoredQs;
              setAnswers(restoredAns);
              answersRef.current = restoredAns;
              setCurrent(active.current_index || 0);
              startTimeRef.current = active.started_at;
              setDeadline(restoredDeadline);
              deadlineRef.current = restoredDeadline;

              if (restoredDeadline <= Date.now()) {
                triggerFinish(true);
                return;
              }
              setPhase("exam");

              showToast({
                id: "ticket-crash-restored",
                dedupeKey: "ticket-crash-restored",
                title: t("exam.sessionRestored", "Sessiya tiklandi"),
                message: t(
                  "exam.sessionRestoredDesc",
                  "Avvalgi yakunlanmagan bilet holati avtomatik tiklandi"
                ),
                color: "blue",
              });
              return;
            }
          }
        } catch (err) {
          console.warn("Lokal bilet sessiyasini tiklashda xatolik:", err);
        }
      }

      // Fresh ticket session
      try {
        const qs = await getQuestionsByTicket(ticketId);
        if (qs.length === 0) {
          setErrorMsg(t("exam.noQuestions", "Savollar topilmadi"));
          setPhase("result");
          return;
        }

        const newId = generateUUID();
        const startedAt = Date.now();
        const ticketSeconds = durationSecondsFor("ticket", qs.length, rules);
        const newDeadline = startedAt + ticketSeconds * 1000;
        localSessionIdRef.current = newId;
        serverSessionIdRef.current = getActiveTicketSessionId();
        setQuestions(qs);
        questionsRef.current = qs;
        startTimeRef.current = startedAt;
        setDeadline(newDeadline);
        deadlineRef.current = newDeadline;
        setPhase("exam");

        await dbClient.saveExamSession({
          local_id: newId,
          server_id: serverSessionIdRef.current,
          exam_type: ticketKey,
          target_id: ticketId,
          status: "IN_PROGRESS",
          total_questions: qs.length,
          correct_answers: 0,
          score: 0,
          duration_seconds: 0,
          time_remaining_seconds: ticketSeconds,
          deadline_at: newDeadline,
          started_at: startedAt,
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
    [ticketId, ticketKey, rules, t, triggerFinish]
  );

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Savol o'zgarganda izohni yop
  useEffect(() => {
    setShowExp(false);
  }, [current]);

  // Saqlangan savollarni yuklab olish
  useEffect(() => {
    getSavedQuestions(userId)
      .then((entries) => setSavedIds(new Set(entries.map((e) => e.question.id))))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    document.getElementById(`ticket-qnum-${current}`)?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [current]);

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
    toggleSavedQuestion(userId, q);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  };

  const handleSelect = (optIdx: number) => {
    if (phase !== "exam" || answers[current] !== undefined) return;
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
    recordQuestionAttempt(userId, q.id, isCorrect, "ticket").catch(() => {});
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
        server_id: serverSessionIdRef.current,
        exam_type: ticketKey,
        target_id: ticketId,
        status: "IN_PROGRESS",
        total_questions: questions.length,
        correct_answers: correctSoFar,
        score: scoreSoFar,
        duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        time_remaining_seconds: remainingSecondsUntil(deadlineRef.current),
        deadline_at: deadlineRef.current,
        started_at: startTimeRef.current,
        completed_at: null,
        answers_json: JSON.stringify(newAns),
        questions_json: JSON.stringify(questions),
        current_index: current,
        synced: 0,
      })
      .catch(() => {});
    if (current < questions.length - 1) {
      autoRef.current = setTimeout(() => setCurrent((c) => c + 1), 700);
    }
  };

  const handleFinishClick = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      setConfirmFinishOpen(true);
    } else {
      triggerFinish(false);
    }
  };

  // Unified desktop keyboard shortcuts (1–5 / A–E, ←/→, Enter, Esc, Shift+B)
  useExamShortcuts(phase === "exam", {
    onSelect: (idx) => {
      if (!confirmFinishOpen && !zoomSrc) handleSelect(idx);
    },
    onPrev: () => setCurrent((c) => Math.max(0, c - 1)),
    onNext: () => setCurrent((c) => Math.min((questions.length || 1) - 1, c + 1)),
    onSpace: () => {
      if (answers[current] !== undefined) setCurrent((c) => Math.min((questions.length || 1) - 1, c + 1));
    },
    onConfirm: () => {
      if (confirmFinishOpen) {
        setConfirmFinishOpen(false);
        triggerFinish(false);
      } else {
        handleFinishClick();
      }
    },
    onEscape: () => {
      if (zoomSrc) setZoomSrc(null);
      else if (confirmFinishOpen) setConfirmFinishOpen(false);
    },
    onBookmark: () => {
      const q = questions[current];
      if (q) handleToggleSave(q);
    },
  });

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
    const total = questions.length || ticket.question_count;
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
          title={`${localizeName(ticket)} natijasi`}
          description="Bilet imtihon natijalari"
          canonical={`/tickets/${ticket.id}`}
        />
        <div style={{ height: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GamificationResult
            score={score}
            correct={correct}
            wrong={wrong}
            unanswered={unanswered}
            total={total}
            title={localizeName(ticket)}
            badge={`${ticket.question_count} ${t("activeTest.questionsCount", "savol")} • ${t("exam.passingScore", "O'tish bali")}: ${ticket.passing_score}%`}
            isTimeUp={isTimeUp}
            passed={isExamPassed({ mode: "ticket", total, correct, wrong, unanswered }, rules)}
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
  const explanation = answered !== undefined ? localizeExp(q) : null;
  const correct = Object.values(answers).filter((a) => a.selected === a.correct).length;
  const wrong = Object.values(answers).length - correct;

  return (
    <>
      <SEO
        title={`${localizeName(ticket)}`}
        description="Prava Online bilet imtihoni."
        canonical={`/tickets/${ticket.id}`}
      />
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
            <ExamTimerDisplay deadline={deadline} onTimeUp={() => triggerFinish(true)} />
          </div>

          <div className="exam-topbar-center">
            <span className="exam-ticket-label">
              <IconTicket size={14} /> #{ticket.ticket_number}
            </span>
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
                  <span className="exam-option-key" title={`${idx + 1} / ${String.fromCharCode(65 + idx)}`}>{idx + 1}</span>
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
                {questions.map((_, i) => {
                  const a = answers[i];
                  let cls = "exam-qnum";
                  if (i === current) cls += " active";
                  else if (a) cls += a.selected === a.correct ? " correct" : " wrong";
                  return (
                    <button
                      key={i}
                      id={`ticket-qnum-${i}`}
                      className={cls}
                      onClick={() => setCurrent(i)}
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
          <ShortcutHint />
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
