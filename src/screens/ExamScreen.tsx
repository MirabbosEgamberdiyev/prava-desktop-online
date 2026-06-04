import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  UserResponse, QuestionResponse, OptionResponse, LocalizedText,
  ExamResponse, ExamResultResponse,
} from "../types";
import { startRealExam, submitExam, addWrongAnswer, toggleSavedQuestion, getSavedQuestions } from "../api";
import { API_BASE } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";
import {
  IconChevronLeft, IconChevronRight, IconCheck, IconX,
  IconClock, IconArrowLeft, IconTrophy, IconRefresh,
  IconBookmark, IconBookmarkFilled, IconBulb,
} from "@tabler/icons-react";

interface Props {
  user: UserResponse;
  onBack: () => void;
}

type Phase = "loading" | "exam" | "result";

// prava-test EXAM_DEFAULTS bilan bir xil
const EXAM_QUESTION_COUNT = 20;
const EXAM_DURATION_MIN   = 20;

interface Answer {
  selected: number;
  correct: number;
}

function getLocal(lt?: LocalizedText | null): string {
  if (!lt) return "";
  const l = i18n.language;
  if (l === "uzc" && lt.uzc) return lt.uzc;
  if (l === "ru" && lt.ru) return lt.ru;
  if (l === "en" && lt.en) return lt.en;
  return lt.uzl || lt.uzc || lt.ru || lt.en || "";
}

function imgSrc(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function ExamScreen({ onBack }: Props) {
  const { t } = useTranslation();

  // ── Exam state ─────────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState<Phase>("loading");
  const [exam, setExam]           = useState<ExamResponse | null>(null);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState<Record<number, Answer>>({});
  const [timeLeft, setTimeLeft]   = useState(0);
  const [isTimeUp, setIsTimeUp]   = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [result, setResult]       = useState<ExamResultResponse | null>(null);
  const [savedIds, setSavedIds]   = useState<Set<number>>(new Set());
  const [showExp, setShowExp]     = useState(false);

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef   = useRef<number>(Date.now());
  const autoRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Load saved questions on mount
  useEffect(() => {
    getSavedQuestions()
      .then((entries) => setSavedIds(new Set(entries.map((e) => e.questionId))))
      .catch((e) => console.warn("[ExamScreen] side effect failed:", e));
  }, []);

  // Reset explanation when question changes
  useEffect(() => { setShowExp(false); }, [current]);

  // Compute maxWrong from passingScore
  const maxWrong = exam
    ? Math.max(1, (exam.totalQuestions || 20) - Math.ceil((exam.totalQuestions || 20) * ((exam.passingScore || 90) / 100)))
    : 2;

  const loadExam = useCallback(() => {
    setPhase("loading");
    setAnswers({});
    answersRef.current = {};
    setCurrent(0);
    setIsTimeUp(false);
    setErrorMsg(null);
    setResult(null);
    startRealExam(EXAM_QUESTION_COUNT, EXAM_DURATION_MIN)
      .then((raw: unknown) => {
        // Backend response shaklini turli yo'llar bilan unwrap qilamiz —
        // shu yo'l bilan {data:{...}} yoki {exam:{...}} aralashmalari uchun ham ishlaydi.
        const r = raw as Record<string, unknown> | null;
        const e: any =
          (r && typeof r === "object" && r.questions) ? r :
          (r && typeof r === "object" && (r as any).data?.questions) ? (r as any).data :
          (r && typeof r === "object" && (r as any).exam?.questions) ? (r as any).exam :
          r;

        if (!e || !e.questions || e.questions.length === 0) {
          console.warn("[ExamScreen] No questions in response:", raw);
          setErrorMsg(t("exam.noQuestions"));
          setPhase("result");
          return;
        }
        setExam(e);
        setQuestions(e.questions);
        setTimeLeft(((e.durationMinutes as number) || EXAM_DURATION_MIN) * 60);
        setPhase("exam");
        startRef.current = Date.now();

        // ⚡ Performance: barcha savol rasmlarini fon rejimida oldindan yuklash
        e.questions.forEach((q: any) => {
          if (!q?.imageUrl) return;
          const url = String(q.imageUrl).startsWith("http")
            ? q.imageUrl
            : `${API_BASE}${String(q.imageUrl).startsWith("/") ? "" : "/"}${q.imageUrl}`;
          const img = new Image();
          img.src = url;
          if (typeof img.decode === "function") {
            img.decode().catch(() => { /* expected for some images */ });
          }
        });
      })
      .catch((err) => {
        console.error("[ExamScreen] startRealExam failed:", err);
        setErrorMsg(String(err?.message || err));
        setPhase("result");
      });
  }, [t]);

  // Auto-start exam on mount (Real Imtihon — prava-test bilan bir xil)
  useEffect(() => {
    loadExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer countdown
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsTimeUp(true);
          triggerFinish(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const triggerFinish = useCallback((timeUp = false) => {
    clearInterval(timerRef.current!);
    if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }
    const curAnswers = answersRef.current;
    if (!timeUp) setIsTimeUp(false);
    setPhase("result");

    if (!exam?.sessionId) return;
    const answers_arr = Object.entries(curAnswers).map(([idxStr, a]) => ({
      questionId: questions[Number(idxStr)]?.id ?? 0,
      selectedOptionIndex: a.selected,
    })).filter(a => a.questionId !== 0);

    submitExam({ sessionId: exam.sessionId, answers: answers_arr })
      .then(setResult)
      .catch((e) => console.warn("[ExamScreen] side effect failed:", e));
  }, [exam, questions]);

  // Keyboard shortcuts during exam
  useEffect(() => {
    if (phase !== "exam") return;
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, number> = { F1: 0, F2: 1, F3: 2, F4: 3, F5: 4 };
      if (e.key in map) { e.preventDefault(); handleSelect(map[e.key]); }
      if (e.key === "ArrowLeft")  setCurrent((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setCurrent((c) => Math.min((questions.length || 1) - 1, c + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, answers, current, questions.length]);

  const handleToggleSave = (question: QuestionResponse) => {
    toggleSavedQuestion(question.id, question)
      .then((isNowSaved) => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (isNowSaved) next.add(question.id); else next.delete(question.id);
          return next;
        });
      })
      .catch((e) => console.warn("[ExamScreen] side effect failed:", e));
  };

  const handleToggleExp = () => {
    const willOpen = !showExp;
    setShowExp(willOpen);
    if (willOpen) {
      if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }
    } else {
      if (current < questions.length - 1) {
        autoRef.current = setTimeout(() => setCurrent((c) => c + 1), 500);
      }
    }
  };

  const handleSelect = (optIdx: number) => {
    if (answers[current] !== undefined) return;
    const q = questions[current];
    if (!q || !q.options) return;
    if (optIdx >= q.options.length) return;
    if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }

    const correctIdx = q.correctOptionIndex ?? 0;
    const isCorrect  = optIdx === correctIdx;
    // question obyektini ham uzatamiz — localStorage ga to'g'ri saqlansin
    if (!isCorrect) addWrongAnswer(q.id, q).catch((e) => console.warn("[ExamScreen] side effect failed:", e));

    const newAns: Record<number, Answer> = {
      ...answers,
      [current]: { selected: optIdx, correct: correctIdx },
    };
    setAnswers(newAns);
    answersRef.current = newAns;

    const wrongNow = Object.values(newAns).filter((a) => a.selected !== a.correct).length;
    if (wrongNow >= maxWrong) {
      setTimeout(() => triggerFinish(false), 700);
      return;
    }
    if (current < questions.length - 1) {
      autoRef.current = setTimeout(() => setCurrent((c) => c + 1), 700);
    }
  };

  const formatTime = (s: number) => {
    const m   = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const timerIsRed    = timeLeft <= 60;
  const timerIsYellow = !timerIsRed && timeLeft <= 300;

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div className="loading-screen"><div className="spinner" /><p>{t("common.loading")}</p></div>
  );

  // ─── RESULT ───────────────────────────────────────────────────────────────
  if (phase === "result") {
    const correct    = result?.correctCount   ?? Object.values(answers).filter((a) => a.selected === a.correct).length;
    const wrong      = result?.incorrectCount ?? (Object.values(answers).length - correct);
    const total      = result?.totalQuestions ?? questions.length;
    const answered   = result?.answeredCount  ?? Object.keys(answers).length;
    const unanswered = total - answered;
    const score      = result?.percentage ?? (total > 0 ? Math.round((correct / total) * 100) : 0);
    const passed     = result?.isPassed ?? (!isTimeUp && wrong < maxWrong && answered === total);

    return (
      <div className="exam-result-screen">
        <div className="exam-result-card">
          <div className={`exam-result-icon ${passed ? "passed" : "failed"}`}>
            {passed ? <IconTrophy size={40} stroke={1.5} /> : <IconX size={40} stroke={2} />}
          </div>
          <h2 className={`exam-result-title ${passed ? "passed" : "failed"}`}>
            {errorMsg
              ? t("common.error")
              : isTimeUp
              ? t("exam.timeUp")
              : passed
              ? t("exam.passed")
              : t("exam.failed")}
          </h2>
          {errorMsg ? (
            <p className="exam-result-sub">{errorMsg}</p>
          ) : (
            <>
              <div className="exam-result-score">{score}%</div>
              <div className="exam-result-stats">
                <div className="exam-result-stat green">
                  <IconCheck size={18} />
                  <div>
                    <div className="exam-stat-val">{correct}</div>
                    <div className="exam-stat-lbl">{t("common.correct")}</div>
                  </div>
                </div>
                <div className="exam-result-stat red">
                  <IconX size={18} />
                  <div>
                    <div className="exam-stat-val">{wrong}</div>
                    <div className="exam-stat-lbl">{t("common.wrong")}</div>
                  </div>
                </div>
                {unanswered > 0 && (
                  <div className="exam-result-stat gray">
                    <IconClock size={18} />
                    <div>
                      <div className="exam-stat-val">{unanswered}</div>
                      <div className="exam-stat-lbl">{t("exam.unanswered")}</div>
                    </div>
                  </div>
                )}
              </div>
              <p className="exam-result-sub">{t("exam.maxWrong", { count: maxWrong })}</p>
            </>
          )}
          <div className="exam-result-actions">
            <button className="exam-result-btn primary" onClick={onBack}>
              <IconArrowLeft size={18} /> {t("common.backToHome")}
            </button>
            <button className="exam-result-btn" onClick={() => loadExam()}>
              <IconRefresh size={18} /> {t("exam.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── EXAM ─────────────────────────────────────────────────────────────────
  // ⚡ Performance: derived qiymatlar memoizatsiya qilinadi — keraksiz hisoblash yo'q
  const q           = questions[current];
  const opts        = useMemo(() => q?.options || [], [q]);
  const answered    = answers[current];
  const correctIdx  = q?.correctOptionIndex ?? 0;
  const explanation = useMemo(
    () => (answered !== undefined ? getLocal(q?.explanation) : null),
    [answered, q]
  );
  const { correct, wrong } = useMemo(() => {
    const vals = Object.values(answers);
    const c = vals.reduce((acc, a) => acc + (a.selected === a.correct ? 1 : 0), 0);
    return { correct: c, wrong: vals.length - c };
  }, [answers]);
  const imgUrl = useMemo(() => imgSrc(q?.imageUrl), [q]);

  return (
    <div className="exam-screen">
      {/* ── Top bar: Finish + Counter (chap) | TAYMER (markaz) | Ball + Til (o'ng) ── */}
      <div className="exam-topbar">
        <div className="exam-topbar-left">
          <button className="exam-finish-btn" onClick={() => triggerFinish(false)}>
            {t("exam.finish")} <IconX size={15} />
          </button>
          <span className="exam-counter">{current + 1} / {questions.length}</span>
        </div>
        <div className="exam-topbar-center">
          <span
            className={`exam-timer exam-timer--big${timerIsRed ? " red" : timerIsYellow ? " yellow" : ""}`}
            aria-label="Qolgan vaqt"
          >
            <IconClock size={18} stroke={2.4} />
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="exam-topbar-right">
          <span className="exam-score-chip green"><IconCheck size={13} /> {correct}</span>
          <span className="exam-score-chip red"><IconX size={13} /> {wrong} / {maxWrong}</span>
          <LanguagePicker />
          <ThemeToggle />
        </div>
      </div>

      {/* ── Question text ── */}
      <div className="exam-question-header">
        <p className="exam-question-text">{getLocal(q.text)}</p>
        <button
          className={`exam-bookmark-btn${savedIds.has(q.id) ? " saved" : ""}`}
          onClick={() => handleToggleSave(q)}
          title={savedIds.has(q.id) ? t("saved.remove") : t("common.save")}
        >
          {savedIds.has(q.id) ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
        </button>
      </div>

      {/* ── Two-column body ── */}
      <div className="exam-two-col">
        <div className="exam-col-options">
          {opts.map((opt: OptionResponse, idx: number) => {
            let cls = "exam-option";
            if (answered) {
              if (idx === correctIdx)          cls += " correct";
              else if (idx === answered.selected) cls += " wrong";
            }
            return (
              <button key={idx} className={cls} onClick={() => handleSelect(idx)} disabled={!!answered}>
                <span className="exam-option-key">F{idx + 1}</span>
                <span className="exam-option-text">{getLocal(opt.text)}</span>
                {answered && idx === correctIdx && <IconCheck size={15} className="opt-icon correct" />}
                {answered && idx === answered.selected && idx !== correctIdx && <IconX size={15} className="opt-icon wrong" />}
              </button>
            );
          })}

          {explanation && (
            <div className="quiz-explanation-wrap" style={{ marginTop: 10 }}>
              <button className="quiz-explanation-toggle" onClick={handleToggleExp}>
                <IconBulb size={15} />
                {showExp ? t("marathon.hideExplanation") : t("marathon.showExplanation")}
              </button>
              {showExp && <div className="quiz-explanation-text">{explanation}</div>}
            </div>
          )}
        </div>
        <div className="exam-col-image">
          <img
            key={q.id}
            src={imgUrl || "/question-default.svg"}
            alt=""
            className={`exam-question-img${imgUrl ? "" : " is-default"}`}
            loading="eager"
            decoding="async"
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.src.endsWith("/question-default.svg")) {
                el.src = "/question-default.svg";
                el.classList.add("is-default");
              }
            }}
          />
        </div>
      </div>

      {/* ── Bottom: question numbers + nav ── */}
      <div className="exam-bottom">
        <div className="exam-bottom-row">
          <button className="exam-nav-btn" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <IconChevronLeft size={17} /> {t("exam.prev")}
          </button>
          <div className="exam-qnums">
            {questions.map((_, i) => {
              const a   = answers[i];
              let cls   = "exam-qnum";
              if (i === current) cls += " active";
              else if (a) cls += a.selected === a.correct ? " correct" : " wrong";
              return <button key={i} className={cls} onClick={() => setCurrent(i)}>{i + 1}</button>;
            })}
          </div>
          {current === questions.length - 1 ? (
            <button className="exam-nav-btn primary" onClick={() => triggerFinish(false)}>
              {t("exam.finish")} <IconCheck size={17} />
            </button>
          ) : (
            <button className="exam-nav-btn primary" onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
              {t("exam.next")} <IconChevronRight size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
