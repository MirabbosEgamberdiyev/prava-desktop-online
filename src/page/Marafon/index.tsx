import { resolveUserScopeId } from "@/utils/userScope";
import { getExamRules, durationSecondsFor, isExamPassed } from "@/services/examRules";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  localizeTopic,
  parseOptions,
  getActiveMarathonSessionId,
  reportExamResult,
} from "../../services/desktopAdapter";
import { isFakeLocalSessionId } from "../../services/offlineExamRecord";
import ColorMode from "../../components/other/ColorMode";
import LanguagePicker from "../../components/language/LanguagePicker";
import { remainingSecondsUntil } from "../../components/quiz/ExamTimerDisplay";
import { ExamDesktopView, useDebouncedSave, countResults } from "../../features/ExamDesktop";
import { playSfx } from "../../services/sound";
import "../../styles/exam-desktop.css";
import GamificationResult from "../../components/quiz/GamificationResult";
import QuizReviewModal from "../../components/quiz/QuizReviewModal";
import TestSetupCard from "../../components/quiz/TestSetupCard";
import { dbClient } from "../../database";
import { generateUUID } from "../../sync/outboxQueue";
import { showToast } from "../../utils/notificationUtils";
import SEO from "../../components/common/SEO";
import { IconAlertTriangle, IconArrowLeft, IconDownload, IconFlame } from "@tabler/icons-react";
import OfflinePreparationModal from "../../components/offline/OfflinePreparationModal";

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
  const userId = resolveUserScopeId(user);

  const location = useLocation();
  const rawTopicId = searchParams.get("topicId") || (location.state as any)?.topicId;
  const initialTopicId = rawTopicId ? Number(rawTopicId) : null;
  // Rules (marathon = TIMED, secondsPerQuestion each) — fixed for this page's lifetime
  const [rules] = useState(getExamRules);

  // Setup state
  const [topics, setTopics] = useState<OfflineTopic[]>([]);
  const [selTopic, setSelTopic] = useState<number | null>(initialTopicId);
  const [countIdx, setCountIdx] = useState(0);

  // Exam state
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  /** Absolute deadline (epoch ms): count × marathon.secondsPerQuestion, persisted for crash recovery. */
  const [deadline, setDeadline] = useState<number>(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const deadlineRef = useRef(deadline);
  deadlineRef.current = deadline;
  const startTimeRef = useRef<number>(Date.now());
  const serverSessionIdRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const selTopicRef = useRef(selTopic);
  selTopicRef.current = selTopic;

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

  const localSessionIdRef = useRef<string>(generateUUID());
  const questionsJsonRef = useRef<string>("[]");
  const currentRef = useRef(current);
  currentRef.current = current;

  /**
   * Debounced (~500 ms) crash-recovery progress write (keeps the ORIGINAL started_at / deadline).
   * The (large) questions JSON is serialized once per session, not on every answer.
   */
  const progressSaver = useDebouncedSave((snap: { answers: Record<number, Answer>; index: number }) => {
    const qs = questionsRef.current;
    const { correct: correctSoFar } = countResults(snap.answers);
    dbClient
      .saveExamSession({
        local_id: localSessionIdRef.current,
        server_id: serverSessionIdRef.current,
        exam_type: "MARATHON",
        target_id: selTopicRef.current,
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
      const endAt = deadlineRef.current > 0 ? Math.min(now, deadlineRef.current) : now;
      const duration = Math.max(0, Math.floor((endAt - startTimeRef.current) / 1000));
      const correct = Object.values(curAnswers).filter((a) => a.selected === a.correct).length;
      const total = qs.length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      setIsTimeUp(timeUp);
      setPhase("result");

      // Mark session completed in local database
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
        examType: "marathon",
      }).catch(() => {});

      reportExamResult({
        serverSessionId: serverSessionIdRef.current,
        localSessionId: localSessionIdRef.current,
        examType: "marathon",
        targetId: null,
        questions: qs,
        answers: curAnswers,
        durationSeconds: duration,
        completedAt: now,
      }).catch(() => {});
    },
    [userId, progressSaver]
  );

  const startExam = useCallback(
    async (forceFresh = false) => {
      setPhase("loading");
      setAnswers({});
      answersRef.current = {};
      setCurrent(0);
      setErrorMsg(null);
      setIsTimeUp(false);
      finishedRef.current = false;

      // Crash recovery: resume an unfinished marathon with its ORIGINAL absolute deadline
      if (!forceFresh) {
        try {
          const active = await dbClient.getActiveExamSession("MARATHON");
          if (active && active.questions_json && Date.now() - active.started_at < 24 * 60 * 60 * 1000) {
            const restoredQs: OfflineQuestion[] = JSON.parse(active.questions_json);
            const restoredAns: Record<number, Answer> = JSON.parse(active.answers_json || "{}");

            if (restoredQs.length > 0) {
              const restoredDeadline =
                active.deadline_at ??
                active.started_at + durationSecondsFor("marathon", restoredQs.length, rules) * 1000;
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
                // Expired while the app was closed → auto-submit what was answered.
                triggerFinish(true);
                return;
              }
              setPhase("exam");

              showToast({
                id: "marathon-crash-restored",
                dedupeKey: "marathon-crash-restored",
                title: t("marathon.sessionRestored", "Marafon tiklandi"),
                message: t(
                  "marathon.sessionRestoredDesc",
                  "Avvalgi yakunlanmagan marafon holati avtomatik tiklandi"
                ),
                color: "blue",
              });
              return;
            }
          }
        } catch (err) {
          console.warn("Lokal marafon sessiyasini tiklashda xatolik:", err);
        }
      }

      // Fresh marathon session
      try {
        const maxQ =
          selTopic != null
            ? topics.find((tp) => tp.id === selTopic)?.question_count ?? 0
            : topics.reduce((s, tp) => s + (tp.question_count || 0), 0);

        const chosenOption = COUNT_OPTIONS[countIdx];
        const limit =
          chosenOption === 0
            ? maxQ > 0 ? maxQ : 1190
            : maxQ > 0 ? Math.min(chosenOption, maxQ) : chosenOption;

        const qs = await getMarathonQuestions(selTopic ?? undefined, limit);
        if (qs.length === 0) {
          setErrorMsg(t("marathon.noQuestions", "Savollar topilmadi"));
          setPhase("result");
          return;
        }

        // A deliberately fresh start supersedes an unfinished marathon.
        const stale = await dbClient.getActiveExamSession("MARATHON").catch(() => null);
        if (stale) await dbClient.abandonExamSession(stale.local_id).catch(() => {});

        const newId = generateUUID();
        const startedAt = Date.now();
        const seconds = durationSecondsFor("marathon", qs.length, rules);
        const newDeadline = startedAt + seconds * 1000;
        localSessionIdRef.current = newId;
        serverSessionIdRef.current = getActiveMarathonSessionId();
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
          exam_type: "MARATHON",
          target_id: selTopic,
          status: "IN_PROGRESS",
          total_questions: qs.length,
          correct_answers: 0,
          score: 0,
          duration_seconds: 0,
          time_remaining_seconds: seconds,
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
    [selTopic, countIdx, topics, rules, t, triggerFinish]
  );

  // Resume an interrupted marathon automatically on page open (crash recovery).
  useEffect(() => {
    let alive = true;
    dbClient
      .getActiveExamSession("MARATHON")
      .then((active) => {
        if (alive && active && active.questions_json && Date.now() - active.started_at < 24 * 60 * 60 * 1000) {
          startExam(false);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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
      if (!isCorrect) addWrongAnswer(userId, q).catch(() => {});
      recordQuestionAttempt(userId, q.id, isCorrect, "marathon").catch(() => {});

      const newAns = {
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
  const activeTopic = selTopic != null ? topics.find((tp) => tp.id === selTopic) ?? null : null;
  const activeTopicName = activeTopic ? localizeTopic(activeTopic) : "";
  const runLabel = useMemo(
    () =>
      activeTopicName
        ? t("examDesktop.modeTopic", "Mavzu: {{name}}", { name: activeTopicName })
        : t("examDesktop.modeMarathon", "Marafon"),
    [t, activeTopicName]
  );

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
        <div style={{ height: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg)", overflowY: "auto" }}>
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
              onStart={() => startExam(true)}
              onBack={onBack}
              localizeTopic={localizeTopic}
            />
          </main>
          <div style={{ display: "flex", justifyContent: "center", padding: "0 12px 24px" }}>
            <button type="button" className="xd-btn" onClick={() => navigate("/survival")}>
              <IconFlame size={16} aria-hidden="true" />
              {t("examDesktop.survivalCta", "Xatogacha marafon — birinchi xatogacha davom eting")}
            </button>
          </div>
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
    if (errorMsg) {
      return (
        <div className="exam-result-screen" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="exam-result-card" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", background: "var(--card-bg, #fff)", padding: 32, borderRadius: 16, border: "1px solid var(--border)" }}>
            <div className="exam-result-icon failed" style={{ margin: "0 auto 16px", color: "#fa5252" }}>
              <IconAlertTriangle size={36} stroke={1.5} />
            </div>
            <h2 className="exam-result-title failed" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{t("common.error", "Xatolik")}</h2>
            <p className="exam-result-sub" style={{ color: "var(--text-muted)", marginBottom: 24 }}>
              {errorMsg === t("marathon.noQuestions", "Savollar topilmadi")
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
                  background: "var(--primary, #228be6)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <IconDownload size={18} /> {t("offline.prepareDataset", "Offline bazani tayyorlash / yuklash")}
              </button>
              <button
                className="exam-result-btn secondary"
                onClick={() => setPhase("setup")}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                <IconArrowLeft size={18} /> {t("common.back", "Orqaga")}
              </button>
            </div>
          </div>
          <OfflinePreparationModal
            opened={showOfflineModal}
            onClose={() => setShowOfflineModal(false)}
            onSuccess={() => {
              setShowOfflineModal(false);
              startExam(true);
            }}
          />
        </div>
      );
    }

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
        <div style={{ height: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg)", overflowY: "auto" }}>
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
              isTimeUp={isTimeUp}
              passed={isExamPassed({ mode: "marathon", total, correct, wrong, unanswered }, rules)}
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
  return (
    <>
      <SEO title="Marafon davom etmoqda" description="Prava Online marafon testi" canonical="/marafon" />
      <ExamDesktopView
        mode={activeTopic ? "topic" : "marathon"}
        label={runLabel}
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
      />
    </>
  );
}
