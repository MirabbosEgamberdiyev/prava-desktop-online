import { resolveUserScopeId } from "@/utils/userScope";
import { getExamRules, maxWrongFor, durationSecondsFor, isExamPassed } from "@/services/examRules";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { OfflineQuestion } from "../../types/desktop";
import {
  getExamQuestions,
  saveExamResult,
  addWrongAnswer,
  recordQuestionAttempt,
  parseOptions,
  getActiveExamSessionId,
  reportExamResult,
  toggleSavedQuestion,
} from "../../services/desktopAdapter";
import { isFakeLocalSessionId } from "../../services/offlineExamRecord";
import storageService from "../../services/storageService";
import { remainingSecondsUntil } from "../../components/quiz/ExamTimerDisplay";
import { ExamDesktopView, useDebouncedSave, isMistakeLimitExceeded, countResults } from "../../features/ExamDesktop";
import { playSfx } from "../../services/sound";
import "../../styles/exam-desktop.css";
import SEO from "../../components/common/SEO";
import GamificationResult from "../../components/quiz/GamificationResult";
import QuizReviewModal from "../../components/quiz/QuizReviewModal";
import { dbClient } from "../../database";
import { generateUUID } from "../../sync/outboxQueue";
import { showToast } from "../../utils/notificationUtils";
import OfflinePreparationModal from "../../components/offline/OfflinePreparationModal";
import { IconArrowLeft, IconAlertTriangle, IconDownload } from "@tabler/icons-react";

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
  const userId = resolveUserScopeId(user);

  const countParam = Number(searchParams.get("count"));
  // Exam rules (server-driven, cached; defaults: 20 savol, 60 s/savol, max 3 xato — 4-xato imtihonni tugatadi) — fixed for this page's lifetime
  const [rules] = useState(getExamRules);
  const questionCount = countParam && countParam > 0 ? countParam : rules.real.questionCount;
  const MAX_WRONG = maxWrongFor(questionCount, rules); // 20→3 (default rules), scaled for other counts
  const EXAM_SECONDS = durationSecondsFor("real", questionCount, rules);

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  /** Absolute deadline (epoch ms) — persisted for crash recovery. */
  const [deadline, setDeadline] = useState<number>(() => Date.now() + EXAM_SECONDS * 1000);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedScore, setSavedScore] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(() => {
    try {
      const list = storageService.getSavedQuestions();
      return new Set(list.map((s) => s.question.id));
    } catch {
      return new Set();
    }
  });

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

  const localSessionIdRef = useRef<string>(generateUUID());
  const questionsJsonRef = useRef<string>("[]");
  const currentRef = useRef(current);
  currentRef.current = current;

  /** Debounced (~500 ms) crash-recovery progress write. */
  const progressSaver = useDebouncedSave((snap: { answers: Record<number, Answer>; index: number }) => {
    const qs = questionsRef.current;
    const { correct: correctSoFar } = countResults(snap.answers);
    dbClient
      .saveExamSession({
        local_id: localSessionIdRef.current,
        server_id: serverSessionIdRef.current,
        exam_type: "EXAM",
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

  /** Grade + persist + report. Uses refs so it also works right after a crash restore. */
  const triggerFinish = useCallback(
    (timeUp = false) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      progressSaver.cancel();
      playSfx("finish");
      if (autoRef.current) {
        clearTimeout(autoRef.current);
        autoRef.current = null;
      }
      const curAnswers = answersRef.current;
      const qs = questionsRef.current;
      const now = Date.now();
      const duration = Math.max(0, Math.floor((Math.min(now, deadlineRef.current) - startTimeRef.current) / 1000));
      const correct = Object.values(curAnswers).filter((a) => a.selected === a.correct).length;
      const total = qs.length || questionCount;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      setSavedScore(score);
      setIsTimeUp(timeUp);
      setPhase("result");

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
        examType: "exam",
      }).catch(() => {});

      // Server session → /submit; locally graded → /record-offline (all questions, unanswered = null)
      reportExamResult({
        serverSessionId: serverSessionIdRef.current,
        localSessionId: localSessionIdRef.current,
        examType: "real",
        targetId: null,
        questions: qs,
        answers: curAnswers,
        durationSeconds: duration,
        completedAt: now,
      }).catch(() => {});
    },
    [questionCount, userId, progressSaver]
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

      // Crash recovery: check for existing active exam session in SQLite / IndexedDB
      if (!forceFresh) {
        try {
          const active = await dbClient.getActiveExamSession("EXAM");
          if (active && active.questions_json && Date.now() - active.started_at < 24 * 60 * 60 * 1000) {
            const restoredQs: OfflineQuestion[] = JSON.parse(active.questions_json);
            const restoredAns: Record<number, Answer> = JSON.parse(active.answers_json || "{}");
            const restoredDeadline =
              active.deadline_at ??
              active.started_at + durationSecondsFor("real", restoredQs.length || questionCount, rules) * 1000;

            if (restoredQs.length > 0) {
              localSessionIdRef.current = active.local_id;
              serverSessionIdRef.current =
                active.server_id != null && !isFakeLocalSessionId(active.server_id) ? active.server_id : null;
              setQuestions(restoredQs);
              questionsRef.current = restoredQs;
              questionsJsonRef.current = active.questions_json;
              setAnswers(restoredAns);
              answersRef.current = restoredAns;
              setCurrent(active.current_index || 0);
              startTimeRef.current = active.started_at;
              setDeadline(restoredDeadline);
              deadlineRef.current = restoredDeadline;

              if (restoredDeadline <= Date.now()) {
                // Time ran out while the app was closed → submit what was answered.
                triggerFinish(true);
                return;
              }
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
        const startedAt = Date.now();
        const examSeconds = durationSecondsFor("real", qs.length, rules);
        const newDeadline = startedAt + examSeconds * 1000;
        localSessionIdRef.current = newId;
        serverSessionIdRef.current = getActiveExamSessionId();
        setQuestions(qs);
        questionsRef.current = qs;
        questionsJsonRef.current = JSON.stringify(qs);
        startTimeRef.current = startedAt;
        setDeadline(newDeadline);
        deadlineRef.current = newDeadline;
        setPhase("exam");

        await dbClient.saveExamSession({
          local_id: newId,
          server_id: serverSessionIdRef.current,
          exam_type: "EXAM",
          status: "IN_PROGRESS",
          total_questions: qs.length,
          correct_answers: 0,
          score: 0,
          duration_seconds: 0,
          time_remaining_seconds: examSeconds,
          deadline_at: newDeadline,
          started_at: startedAt,
          completed_at: null,
          answers_json: "{}",
          questions_json: questionsJsonRef.current,
          current_index: 0,
          synced: 0,
        });
      } catch (e) {
        setErrorMsg(String(e));
        setPhase("result");
      }
    },
    [questionCount, rules, t, triggerFinish]
  );

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

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
      if (!isCorrect) {
        addWrongAnswer(userId, q).catch(() => {});
      }
      recordQuestionAttempt(userId, q.id, isCorrect, "exam").catch(() => {});

      const newAns: Record<number, Answer> = {
        ...answersRef.current,
        [idx]: { selected: optIdx, correct: q.correct_option },
      };
      setAnswers(newAns);
      answersRef.current = newAns;

      // Persist progress for crash resistance (debounced ~500 ms)
      progressSaver.schedule({ answers: newAns, index: idx });

      // Up to MAX_WRONG mistakes are allowed; the next one (default rules: the 4th) ends the exam.
      if (isMistakeLimitExceeded(countResults(newAns).wrong, MAX_WRONG)) {
        autoRef.current = setTimeout(() => triggerFinish(false), 900);
      }
    },
    [phase, userId, progressSaver, MAX_WRONG, triggerFinish]
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
  const examLabel = useMemo(() => t("examDesktop.modeReal", "Imtihon"), [t]);

  useEffect(
    () => () => {
      if (autoRef.current) clearTimeout(autoRef.current);
    },
    []
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
            passed={isExamPassed({ mode: "real", total, correct, wrong, unanswered }, rules)}
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
  return (
    <>
      <SEO title="Imtihon topshirish" description="Prava Online haydovchilik imtihoni." canonical="/exam" />
      <ExamDesktopView
        mode="real"
        label={examLabel}
        questions={questions}
        current={current}
        answers={answers}
        onSelect={handleSelect}
        onGoto={handleGoto}
        onFinish={handleFinish}
        deadline={deadline}
        onTimeUp={handleTimeUp}
        maxMistakes={MAX_WRONG}
        autoAdvance="always"
        bookmarkedIds={savedIds}
        onToggleBookmark={handleToggleSave}
      />
    </>
  );
}
