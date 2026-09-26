import { resolveUserScopeId } from "@/utils/userScope";
import { getExamRules, durationSecondsFor, isExamPassed } from "@/services/examRules";
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
  reportExamResult,
} from "../../services/desktopAdapter";
import { isFakeLocalSessionId } from "../../services/offlineExamRecord";
import ColorMode from "../../components/other/ColorMode";
import LanguagePicker from "../../components/language/LanguagePicker";
import ImageZoomModal, { ZoomableImage } from "../../components/common/ImageZoomModal";
import ExamTimerDisplay, { remainingSecondsUntil } from "../../components/quiz/ExamTimerDisplay";
import ShortcutHint from "../../components/quiz/ShortcutHint";
import { useExamShortcuts } from "../../hooks/useExamShortcuts";
import { offlineMediaManager } from "../../services/offlineMediaManager";
import { getImageUrl } from "../../utils/imageUtils";
import GamificationResult from "../../components/quiz/GamificationResult";
import QuizReviewModal from "../../components/quiz/QuizReviewModal";
import TestSetupCard from "../../components/quiz/TestSetupCard";
import { dbClient } from "../../database";
import { generateUUID } from "../../sync/outboxQueue";
import { showToast } from "../../utils/notificationUtils";
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
  IconArrowLeft,
  IconDownload,
} from "@tabler/icons-react";
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
  const [showExp, setShowExp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  const activeQnumRef = useRef<HTMLButtonElement | null>(null);
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
      const endAt = deadlineRef.current > 0 ? Math.min(now, deadlineRef.current) : now;
      const duration = Math.max(0, Math.floor((endAt - startTimeRef.current) / 1000));
      const correct = Object.values(curAnswers).filter((a) => a.selected === a.correct).length;
      const total = qs.length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      setIsTimeUp(timeUp);
      setConfirmFinishOpen(false);
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
    [userId]
  );

  const persistProgress = (newAns: Record<number, Answer>, idx: number) => {
    const qs = questionsRef.current;
    const correctSoFar = Object.values(newAns).filter((a) => a.selected === a.correct).length;
    const scoreSoFar = qs.length > 0 ? Math.round((correctSoFar / qs.length) * 100) : 0;
    dbClient
      .saveExamSession({
        local_id: localSessionIdRef.current,
        server_id: serverSessionIdRef.current,
        exam_type: "MARATHON",
        target_id: selTopicRef.current,
        status: "IN_PROGRESS",
        total_questions: qs.length,
        correct_answers: correctSoFar,
        score: scoreSoFar,
        duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        time_remaining_seconds: remainingSecondsUntil(deadlineRef.current),
        deadline_at: deadlineRef.current,
        started_at: startTimeRef.current,
        completed_at: null,
        answers_json: JSON.stringify(newAns),
        questions_json: JSON.stringify(qs),
        current_index: idx,
        synced: 0,
      })
      .catch(() => {});
  };

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
          questions_json: JSON.stringify(qs),
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
    if (!isCorrect) addWrongAnswer(userId, q).catch(() => {});
    recordQuestionAttempt(userId, q.id, isCorrect, "marathon").catch(() => {});

    const newAns = {
      ...answers,
      [current]: { selected: optIdx, correct: q.correct_option },
    };
    setAnswers(newAns);
    answersRef.current = newAns;

    // Persist real-time marathon progress (keeps the ORIGINAL started_at / deadline)
    persistProgress(newAns, current);

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

  const handleFinishClick = useCallback(() => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      setConfirmFinishOpen(true);
    } else {
      triggerFinish(false);
    }
  }, [answers, questions.length, triggerFinish]);

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
              onClick={handleFinishClick}
              type="button"
            >
              {t("activeTest.finishTest", "Yakunlash")} <IconX size={15} />
            </button>
            {deadline > 0 && <ExamTimerDisplay deadline={deadline} onTimeUp={() => triggerFinish(true)} />}
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
                    triggerFinish(false);
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
          <ShortcutHint />
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
                    triggerFinish(false);
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
