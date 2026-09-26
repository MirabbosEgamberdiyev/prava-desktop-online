import { resolveUserScopeId } from "@/utils/userScope";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { OfflineQuestion } from "../../types/desktop";
import {
  getWrongAnswers,
  removeWrongAnswer,
  addWrongAnswer,
  saveExamResult,
  recordQuestionAttempt,
  parseOptions,
  reportExamResult,
  toggleSavedQuestion,
  getSavedQuestions,
} from "../../services/desktopAdapter";
import { isExamPassed } from "../../services/examRules";
import { dbClient } from "../../database/dbClient";
import { generateUUID } from "../../sync/outboxQueue";
import { showToast } from "../../utils/notificationUtils";
import SEO from "../../components/common/SEO";
import GamificationResult from "../../components/quiz/GamificationResult";
import QuizReviewModal from "../../components/quiz/QuizReviewModal";
import { remainingSecondsUntil } from "../../components/quiz/ExamTimerDisplay";
import { ExamDesktopView, useDebouncedSave, countResults } from "../../features/ExamDesktop";
import { playSfx } from "../../services/sound";
import "../../styles/exam-desktop.css";
import { IconCheck, IconArrowLeft } from "@tabler/icons-react";

type Phase = "loading" | "exam" | "result";

interface Answer {
  selected: number;
  correct: number;
}

/** Smart review: wrong answers are repeated until answered correctly (a correct answer removes them). */
export default function WrongExam_Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = resolveUserScopeId(user);

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  /** Absolute deadline (epoch ms) — 1 min per question; the countdown renders in isolation. */
  const [deadline, setDeadline] = useState<number>(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedScore, setSavedScore] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const localSessionIdRef = useRef<string>(generateUUID());
  const startTimeRef = useRef<number>(Date.now());
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const deadlineRef = useRef(deadline);
  deadlineRef.current = deadline;
  const currentRef = useRef(current);
  currentRef.current = current;
  const questionsJsonRef = useRef<string>("[]");
  const finishedRef = useRef(false);

  const onBack = () => navigate("/wrong-answers");

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

  useEffect(() => {
    getSavedQuestions(userId)
      .then((entries) => setSavedIds(new Set(entries.map((e) => e.question.id))))
      .catch(() => {});
  }, [userId]);

  /** Debounced (~500 ms) crash-recovery progress write. */
  const progressSaver = useDebouncedSave((snap: { answers: Record<number, Answer>; index: number }) => {
    const qs = questionsRef.current;
    const { correct: correctSoFar } = countResults(snap.answers);
    dbClient
      .saveExamSession({
        local_id: localSessionIdRef.current,
        server_id: null,
        exam_type: "WRONG_EXAM",
        status: "IN_PROGRESS",
        total_questions: qs.length,
        correct_answers: correctSoFar,
        score: qs.length > 0 ? Math.round((correctSoFar / qs.length) * 100) : 0,
        duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        time_remaining_seconds: remainingSecondsUntil(deadlineRef.current),
        deadline_at: deadlineRef.current,
        started_at: startTimeRef.current,
        completed_at: null,
        answers_json: JSON.stringify(snap.answers),
        questions_json: questionsJsonRef.current,
        current_index: snap.index,
        synced: 0,
      })
      .catch(() => {});
  });

  const loadQuestions = useCallback(
    async (forceFresh = false) => {
      setPhase("loading");
      setAnswers({});
      answersRef.current = {};
      setCurrent(0);
      setErrorMsg(null);
      setIsTimeUp(false);
      finishedRef.current = false;

      // Crash recovery: check for existing active wrong answers practice session
      if (!forceFresh) {
        try {
          const active = await dbClient.getActiveExamSession("WRONG_EXAM");
          if (active && active.questions_json && Date.now() - active.started_at < 24 * 60 * 60 * 1000) {
            const restoredQs: OfflineQuestion[] = JSON.parse(active.questions_json);
            const restoredAns: Record<number, Answer> = JSON.parse(active.answers_json || "{}");

            if (restoredQs.length > 0) {
              localSessionIdRef.current = active.local_id;
              setQuestions(restoredQs);
              questionsRef.current = restoredQs;
              questionsJsonRef.current = active.questions_json;
              setAnswers(restoredAns);
              answersRef.current = restoredAns;
              setCurrent(active.current_index || 0);
              const remaining =
                active.time_remaining_seconds && active.time_remaining_seconds > 0
                  ? active.time_remaining_seconds
                  : restoredQs.length * 60;
              const restoredDeadline = active.deadline_at ?? Date.now() + remaining * 1000;
              setDeadline(restoredDeadline);
              deadlineRef.current = restoredDeadline;
              startTimeRef.current = active.started_at || Date.now();
              setPhase("exam");

              showToast({
                id: "wrong-exam-restored",
                dedupeKey: "wrong-exam-restored",
                title: t("wrongAnswers.sessionRestored", "Mashg'ulot tiklandi"),
                message: t(
                  "wrongAnswers.sessionRestoredDesc",
                  "Avvalgi yakunlanmagan xatolar mashg'uloti avtomatik tiklandi"
                ),
                color: "blue",
              });
              return;
            }
          }
        } catch (err) {
          console.warn("Lokal xatolar sessiyasini tiklashda xatolik:", err);
        }
      }

      localSessionIdRef.current = generateUUID();
      try {
        const entries = await getWrongAnswers(userId);
        const qs = entries.map((e) => e.question);
        if (qs.length === 0) {
          setErrorMsg(t("wrongAnswers.emptySub", "Xatolar mavjud emas"));
          setPhase("result");
          return;
        }
        const startedAt = Date.now();
        const initialTime = qs.length * 60;
        const newDeadline = startedAt + initialTime * 1000;
        setQuestions(qs);
        questionsRef.current = qs;
        questionsJsonRef.current = JSON.stringify(qs);
        setDeadline(newDeadline);
        deadlineRef.current = newDeadline;
        startTimeRef.current = startedAt;
        setPhase("exam");

        dbClient
          .saveExamSession({
            local_id: localSessionIdRef.current,
            server_id: null,
            exam_type: "WRONG_EXAM",
            status: "IN_PROGRESS",
            total_questions: qs.length,
            correct_answers: 0,
            score: 0,
            duration_seconds: 0,
            time_remaining_seconds: initialTime,
            deadline_at: newDeadline,
            started_at: startedAt,
            completed_at: null,
            answers_json: "{}",
            questions_json: questionsJsonRef.current,
            current_index: 0,
            synced: 0,
          })
          .catch(() => {});
      } catch (e) {
        setErrorMsg(String(e));
        setPhase("result");
      }
    },
    [userId, t]
  );

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const triggerFinish = useCallback(
    (timeUp = false) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      progressSaver.cancel();
      playSfx("finish");
      const curAnswers = answersRef.current;
      const qs = questionsRef.current;
      const now = Date.now();
      const duration = Math.floor((now - startTimeRef.current) / 1000);
      const { correct } = countResults(curAnswers);
      const total = qs.length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      setSavedScore(score);
      setIsTimeUp(timeUp);
      setPhase("result");

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
        examType: "wrong_practice",
      }).catch(() => {});

      // Locally graded → /api/v2/exams/record-offline (all questions, unanswered = null)
      reportExamResult({
        serverSessionId: null,
        localSessionId: localSessionIdRef.current,
        examType: "wrong",
        targetId: null,
        questions: qs,
        answers: curAnswers,
        durationSeconds: duration,
        completedAt: now,
      }).catch(() => {});
    },
    [userId, progressSaver]
  );

  const handleSelect = useCallback(
    (optIdx: number) => {
      if (phase !== "exam" || finishedRef.current) return;
      const idx = currentRef.current;
      if (answersRef.current[idx] !== undefined) return;
      const q = questionsRef.current[idx];
      if (!q) return;
      const opts = parseOptions(q.options_json);
      if (optIdx >= opts.length) return;
      const isCorrect = optIdx === q.correct_option;
      if (isCorrect) {
        // Answered correctly → leaves the review list.
        removeWrongAnswer(userId, q.id).catch(() => {});
      } else {
        addWrongAnswer(userId, q).catch(() => {});
      }
      recordQuestionAttempt(userId, q.id, isCorrect, "wrong_practice").catch(() => {});

      const newAns: Record<number, Answer> = {
        ...answersRef.current,
        [idx]: { selected: optIdx, correct: q.correct_option },
      };
      setAnswers(newAns);
      answersRef.current = newAns;
      progressSaver.schedule({ answers: newAns, index: idx });
    },
    [phase, userId, progressSaver]
  );

  const handleToggleSave = useCallback(
    (q: OfflineQuestion) => {
      toggleSavedQuestion(userId, q);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(q.id)) next.delete(q.id);
        else next.add(q.id);
        return next;
      });
    },
    [userId]
  );

  const handleGoto = useCallback(
    (i: number) => {
      setCurrent(i);
      progressSaver.schedule({ answers: answersRef.current, index: i });
    },
    [progressSaver]
  );
  const handleFinish = useCallback(() => triggerFinish(false), [triggerFinish]);
  const handleTimeUp = useCallback(() => triggerFinish(true), [triggerFinish]);

  const { correct: fixedCount } = useMemo(() => countResults(answers), [answers]);
  const remainingToFix = Math.max(0, questions.length - fixedCount);
  const reviewLabel = useMemo(() => t("examDesktop.modeWrong", "Xatolar ustida ishlash"), [t]);
  const remainingChip = useMemo(
    () => (
      <span
        className="xd-chip xd-chip--info"
        title={t("examDesktop.reviewRemainingHint", "To'g'ri javob berilgan savollar ro'yxatdan chiqariladi")}
      >
        {t("examDesktop.reviewRemaining", "{{count}} qoldi", { count: remainingToFix })}
      </span>
    ),
    [t, remainingToFix]
  );

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
    const total = questions.length;
    const answered = Object.keys(answers).length;
    const unanswered = total - answered;
    const score = total > 0 ? Math.round((correct / total) * 100) : savedScore;

    if (errorMsg || questions.length === 0) {
      return (
        <div className="exam-result-screen">
          <div className="exam-result-card">
            <div className="exam-result-icon passed">
              <IconCheck size={36} stroke={1.5} />
            </div>
            <h2 className="exam-result-title passed">
              {t("wrongAnswers.emptyTitle", "Xatolar yo'q!")}
            </h2>
            <p className="exam-result-sub">
              {errorMsg || t("wrongAnswers.emptySub", "Xatolar mavjud emas")}
            </p>
            <div className="exam-result-actions">
              <button className="exam-result-btn primary" onClick={onBack} type="button">
                <IconArrowLeft size={18} /> {t("common.backToHome", "Bosh sahifaga qaytish")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <SEO
          title={t("wrongAnswers.title", "Xatolar ustida ishlash")}
          description="Xatolar ustida ishlash natijalari"
          canonical="/wrong-exam"
        />
        <div style={{ height: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GamificationResult
            score={score}
            correct={correct}
            wrong={wrong}
            unanswered={unanswered}
            total={total}
            title={t("wrongAnswers.title", "Xatolar ustida ishlash")}
            badge={`${total} ${t("activeTest.questionsCount", "savol")}${
              fixedCount > 0 ? ` • ${fixedCount} ${t("wrongAnswers.fixedShort", "to'g'rilandi")}` : ""
            }`}
            isTimeUp={isTimeUp}
            passed={isExamPassed({ mode: "wrong", total, correct, wrong, unanswered })}
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
        />
      </>
    );
  }

  // ─── EXAM ───
  return (
    <>
      <SEO title={t("wrongAnswers.title", "Xatolar ustida ishlash")} description="Xatolar ustida ishlash" canonical="/wrong-exam" />
      <ExamDesktopView
        mode="wrong"
        label={reviewLabel}
        questions={questions}
        current={current}
        answers={answers}
        onSelect={handleSelect}
        onGoto={handleGoto}
        onFinish={handleFinish}
        deadline={deadline > 0 ? deadline : null}
        onTimeUp={handleTimeUp}
        showExplanation
        autoAdvance="correct"
        bookmarkedIds={savedIds}
        onToggleBookmark={handleToggleSave}
        headerExtra={remainingChip}
      />
    </>
  );
}
