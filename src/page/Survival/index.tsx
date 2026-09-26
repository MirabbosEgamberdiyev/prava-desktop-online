import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IconArrowLeft, IconFlame, IconRefresh, IconTrophy, IconAlertTriangle } from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthContext";
import { resolveUserScopeId } from "../../utils/userScope";
import type { OfflineQuestion } from "../../types/desktop";
import {
  addWrongAnswer,
  getMarathonQuestions,
  getSavedQuestions,
  localizeExp,
  localizeOpt,
  localizeQ,
  parseOptions,
  recordQuestionAttempt,
  toggleSavedQuestion,
} from "../../services/desktopAdapter";
import SEO from "../../components/common/SEO";
import {
  ExamDesktopView,
  applySurvivalAnswer,
  createSurvivalState,
  isSurvivalComplete,
  readSurvivalBest,
  shuffle,
  writeSurvivalBest,
  type AnswerMap,
  type SurvivalState,
} from "../../features/ExamDesktop";
import { useExamShortcuts } from "../../hooks/useExamShortcuts";
import { playSfx } from "../../services/sound";
import "../../styles/exam-desktop.css";

type Phase = "loading" | "exam" | "result" | "empty";

/**
 * "Xatogacha marafon" (Survival): every question, shuffled, untimed — the run ends on the
 * first mistake. Shows the current streak and the per-user best streak.
 */
export default function Survival_Page() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = resolveUserScopeId(user);

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [run, setRun] = useState<SurvivalState>(() => createSurvivalState(readSurvivalBest(userId)));
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [failedIndex, setFailedIndex] = useState<number | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const runRef = useRef(run);
  runRef.current = run;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const currentRef = useRef(current);
  currentRef.current = current;
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(async () => {
    if (endTimer.current) clearTimeout(endTimer.current);
    setPhase("loading");
    setAnswers({});
    setCurrent(0);
    setFailedIndex(null);
    setRun(createSurvivalState(readSurvivalBest(userId)));
    try {
      const all = await getMarathonQuestions(undefined, 0);
      const qs = shuffle(all);
      setQuestions(qs);
      setPhase(qs.length > 0 ? "exam" : "empty");
    } catch {
      setPhase("empty");
    }
  }, [userId]);

  useEffect(() => {
    void start();
    return () => {
      if (endTimer.current) clearTimeout(endTimer.current);
    };
  }, [start]);

  useEffect(() => {
    getSavedQuestions(userId)
      .then((entries) => setSavedIds(new Set(entries.map((e) => e.question.id))))
      .catch(() => {});
  }, [userId]);

  const finishRun = useCallback(
    (state: SurvivalState) => {
      writeSurvivalBest(userId, state.best);
      playSfx("finish");
      setPhase("result");
    },
    [userId]
  );

  const handleSelect = useCallback(
    (optIdx: number) => {
      const idx = currentRef.current;
      if (answersRef.current[idx] !== undefined || runRef.current.ended) return;
      const q = questionsRef.current[idx];
      if (!q) return;
      if (optIdx >= parseOptions(q.options_json).length) return;
      const ok = optIdx === q.correct_option;
      recordQuestionAttempt(userId, q.id, ok, "survival").catch(() => {});
      if (!ok) addWrongAnswer(userId, q).catch(() => {}); // → smart review

      const nextAnswers = { ...answersRef.current, [idx]: { selected: optIdx, correct: q.correct_option } };
      answersRef.current = nextAnswers;
      setAnswers(nextAnswers);
      const nextRun = applySurvivalAnswer(runRef.current, ok);
      runRef.current = nextRun;
      setRun(nextRun);
      if (nextRun.newRecord) writeSurvivalBest(userId, nextRun.best);

      if (isSurvivalComplete(nextRun, questionsRef.current.length)) {
        if (!ok) setFailedIndex(idx);
        // Let the user see the correct / wrong highlight before the result screen.
        endTimer.current = setTimeout(() => finishRun(nextRun), ok ? 700 : 1400);
      }
    },
    [userId, finishRun]
  );

  // Only already-reached questions can be revisited.
  const handleGoto = useCallback((i: number) => {
    const answeredCount = Object.keys(answersRef.current).length;
    setCurrent(Math.max(0, Math.min(i, answeredCount)));
  }, []);

  const handleGiveUp = useCallback(() => {
    if (endTimer.current) clearTimeout(endTimer.current);
    finishRun(runRef.current);
  }, [finishRun]);

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

  const label = useMemo(() => t("examDesktop.modeSurvival", "Xatogacha marafon"), [t]);
  const headerExtra = useMemo(
    () => (
      <>
        <span className="xd-chip xd-chip--streak" title={t("examDesktop.streak", "Seriya")}>
          <IconFlame size={14} aria-hidden="true" /> {run.streak}
        </span>
        <span className="xd-chip" title={t("examDesktop.bestStreak", "Eng yaxshi seriya")}>
          <IconTrophy size={14} aria-hidden="true" /> {run.best}
        </span>
      </>
    ),
    [run.streak, run.best, t]
  );

  useExamShortcuts(phase === "result" || phase === "empty", {
    onConfirm: () => void start(),
    onSpace: () => void start(),
    onEscape: () => navigate("/marafon"),
  });

  if (phase === "loading") {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>{t("common.loading", "Yuklanmoqda...")}</p>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="xd-root" style={{ padding: 16 }}>
        <div className="xd-result">
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <IconAlertTriangle size={22} aria-hidden="true" /> {t("examDesktop.noQuestions", "Savollar topilmadi")}
          </h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            {t("examDesktop.noQuestionsDesc", "Lokal savollar bazasi hali tayyor emas. Offline bazani yuklab, qayta urinib ko'ring.")}
          </p>
          <div className="xd-result__actions">
            <button type="button" className="xd-btn" onClick={() => navigate("/marafon")}>
              <IconArrowLeft size={16} aria-hidden="true" /> {t("examDesktop.back", "Orqaga")}{" "}
              <kbd className="xd-kbd">Esc</kbd>
            </button>
            <button type="button" className="xd-btn xd-btn--primary" onClick={() => void start()}>
              <IconRefresh size={16} aria-hidden="true" /> {t("examDesktop.retry", "Qayta urinish")}{" "}
              <kbd className="xd-kbd">↵</kbd>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const failedQ = failedIndex != null ? questions[failedIndex] : null;
    const opts = failedQ ? parseOptions(failedQ.options_json) : [];
    const correctText = failedQ && opts[failedQ.correct_option] ? localizeOpt(opts[failedQ.correct_option]) : null;
    const exp = failedQ ? localizeExp(failedQ) : null;
    const allDone = !run.ended && run.streak >= questions.length && questions.length > 0;
    return (
      <>
        <SEO title={label} description="Xatogacha marafon natijasi" canonical="/survival" />
        <div className="xd-root" style={{ padding: 16, overflow: "auto" }}>
          <div className="xd-result" role="status">
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <IconFlame size={24} aria-hidden="true" />
              {allDone
                ? t("examDesktop.survivalAllDone", "Barcha savollarga xatosiz javob berdingiz!")
                : t("examDesktop.survivalOver", "Marafon tugadi")}
            </h2>
            {run.newRecord && (
              <span className="xd-chip xd-chip--ok" style={{ alignSelf: "flex-start" }}>
                <IconTrophy size={14} aria-hidden="true" /> {t("examDesktop.newRecord", "Yangi rekord!")}
              </span>
            )}
            <div className="xd-result__stats">
              <div className="xd-result__stat">
                <b>{run.streak}</b>
                <span>{t("examDesktop.streak", "Seriya")}</span>
              </div>
              <div className="xd-result__stat">
                <b>{run.best}</b>
                <span>{t("examDesktop.bestStreak", "Eng yaxshi seriya")}</span>
              </div>
            </div>
            {failedQ && (
              <div className="xd-explain">
                <div className="xd-explain__title">{t("examDesktop.failedOn", "Xato qilingan savol")}</div>
                <p className="xd-explain__text" style={{ fontWeight: 600 }}>
                  {localizeQ(failedQ)}
                </p>
                {correctText && (
                  <p className="xd-explain__text" style={{ marginTop: 6 }}>
                    {t("examDesktop.correctAnswer", "To'g'ri javob")}: <b>{correctText}</b>
                  </p>
                )}
                {exp && (
                  <p className="xd-explain__text" style={{ marginTop: 6 }}>
                    {exp}
                  </p>
                )}
              </div>
            )}
            <div className="xd-result__actions">
              <button type="button" className="xd-btn" onClick={() => navigate("/marafon")}>
                <IconArrowLeft size={16} aria-hidden="true" /> {t("examDesktop.back", "Orqaga")}{" "}
                <kbd className="xd-kbd">Esc</kbd>
              </button>
              <button type="button" className="xd-btn xd-btn--primary" onClick={() => void start()}>
                <IconRefresh size={16} aria-hidden="true" /> {t("examDesktop.retry", "Qayta urinish")}{" "}
                <kbd className="xd-kbd">↵</kbd>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title={label} description="Xatogacha marafon" canonical="/survival" />
      <ExamDesktopView
        mode="survival"
        label={label}
        questions={questions}
        current={current}
        answers={answers}
        onSelect={handleSelect}
        onGoto={handleGoto}
        onFinish={handleGiveUp}
        deadline={null}
        showExplanation
        autoAdvance="correct"
        bookmarkedIds={savedIds}
        onToggleBookmark={handleToggleSave}
        showNavigator={false}
        headerExtra={headerExtra}
        finishLabel={t("examDesktop.giveUp", "Tugatish")}
        finishConfirmTitle={t("examDesktop.giveUpTitle", "Marafonni tugatasizmi?")}
        finishConfirmDesc={t("examDesktop.giveUpDesc", "Joriy seriya natija sifatida saqlanadi.")}
        alwaysConfirmFinish
      />
    </>
  );
}
