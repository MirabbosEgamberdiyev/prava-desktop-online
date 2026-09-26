import { resolveUserScopeId } from "@/utils/userScope";
import { getExamRules, durationSecondsFor, durationMinutesFor, passPercentFor, isExamPassed } from "@/services/examRules";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  parseOptions,
  getActiveTicketSessionId,
  reportExamResult,
  getLang,
} from "../../../services/desktopAdapter";
import { isFakeLocalSessionId } from "../../../services/offlineExamRecord";
import { remainingSecondsUntil } from "../../../components/quiz/ExamTimerDisplay";
import { ExamDesktopView, useDebouncedSave, countResults } from "../../../features/ExamDesktop";
import { playSfx } from "../../../services/sound";
import "../../../styles/exam-desktop.css";
import SEO from "../../../components/common/SEO";
import GamificationResult from "../../../components/quiz/GamificationResult";
import QuizReviewModal from "../../../components/quiz/QuizReviewModal";
import { dbClient } from "../../../database";
import { generateUUID } from "../../../sync/outboxQueue";
import { showToast } from "../../../utils/notificationUtils";
import { IconArrowLeft, IconAlertTriangle, IconDownload } from "@tabler/icons-react";
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
  const [reviewOpen, setReviewOpen] = useState(false);
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

  const localSessionIdRef = useRef<string>(generateUUID());
  const ticketKey = `ticket_${ticketId}` as const;
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
        exam_type: ticketKey,
        target_id: ticketId,
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
      const duration = Math.max(0, Math.floor((Math.min(now, deadlineRef.current) - startTimeRef.current) / 1000));
      const correct = Object.values(curAnswers).filter((a) => a.selected === a.correct).length;
      const answeredCount = Object.keys(curAnswers).length;
      const total = qs.length || 20;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      setSavedScore(score);
      setIsTimeUp(timeUp);
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
    [ticketId, rules, userId, progressSaver]
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
              questionsJsonRef.current = active.questions_json;
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
        questionsJsonRef.current = JSON.stringify(qs);
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
          questions_json: questionsJsonRef.current,
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

  // Saqlangan savollarni yuklab olish
  useEffect(() => {
    getSavedQuestions(userId)
      .then((entries) => setSavedIds(new Set(entries.map((e) => e.question.id))))
      .catch(() => {});
  }, [userId]);

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
      recordQuestionAttempt(userId, q.id, isCorrect, "ticket").catch(() => {});
      const newAns: Record<number, Answer> = {
        ...answersRef.current,
        [idx]: { selected: optIdx, correct: q.correct_option },
      };
      setAnswers(newAns);
      answersRef.current = newAns;
      // Persist progress for crash resistance (debounced ~500 ms)
      progressSaver.schedule({ answers: newAns, index: idx });
    },
    [phase, userId, progressSaver]
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
  const ticketNumber = ticket.ticket_number;
  const ticketLabel = useMemo(
    () => t("examDesktop.modeTicket", "Bilet #{{n}}", { n: ticketNumber }),
    [t, ticketNumber]
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
  return (
    <>
      <SEO title={`${localizeName(ticket)}`} description="Prava Online bilet imtihoni." canonical={`/tickets/${ticket.id}`} />
      <ExamDesktopView
        mode="ticket"
        label={ticketLabel}
        questions={questions}
        current={current}
        answers={answers}
        onSelect={handleSelect}
        onGoto={handleGoto}
        onFinish={handleFinish}
        deadline={deadline}
        onTimeUp={handleTimeUp}
        showExplanation
        autoAdvance="correct"
        bookmarkedIds={savedIds}
        onToggleBookmark={handleToggleSave}
      />
    </>
  );
}
