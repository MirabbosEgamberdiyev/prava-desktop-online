import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  UserResponse, QuestionResponse, OptionResponse, LocalizedText,
  ExamResponse, ExamResultResponse, PackageResponse,
} from "../types";
import { startExam, submitExam, addWrongAnswer, getPackages, toggleSavedQuestion, getSavedQuestions } from "../api";
import { API_BASE } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";
import {
  IconChevronLeft, IconChevronRight, IconCheck, IconX,
  IconClock, IconArrowLeft, IconTrophy, IconRefresh, IconSteeringWheel,
  IconListNumbers, IconPlayerPlay, IconBookmark, IconBookmarkFilled, IconBulb,
} from "@tabler/icons-react";

interface Props {
  user: UserResponse;
  onBack: () => void;
}

type Phase = "setup" | "loading" | "exam" | "result";

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

  // ── Package setup ──────────────────────────────────────────────────────────
  const [packages, setPackages]       = useState<PackageResponse[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PackageResponse | null>(null);
  const [pkgLoading, setPkgLoading]   = useState(true);

  // ── Exam state ─────────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState<Phase>("setup");
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

  // Load packages once on mount
  useEffect(() => {
    getPackages()
      .then((pkgs) => {
        setPackages(pkgs);
        if (pkgs.length > 0) setSelectedPkg(pkgs[0]);
      })
      .catch(() => {})
      .finally(() => setPkgLoading(false));
  }, []);

  // Load saved questions on mount
  useEffect(() => {
    getSavedQuestions()
      .then((entries) => setSavedIds(new Set(entries.map((e) => e.questionId))))
      .catch(() => {});
  }, []);

  // Reset explanation when question changes
  useEffect(() => { setShowExp(false); }, [current]);

  // Compute maxWrong from passingScore
  const maxWrong = exam
    ? Math.max(1, (exam.totalQuestions || 20) - Math.ceil((exam.totalQuestions || 20) * ((exam.passingScore || 90) / 100)))
    : 2;

  const loadExam = useCallback((packageId: number) => {
    setPhase("loading");
    setAnswers({});
    answersRef.current = {};
    setCurrent(0);
    setIsTimeUp(false);
    setErrorMsg(null);
    setResult(null);
    startExam(packageId)
      .then((e) => {
        if (!e.questions || e.questions.length === 0) {
          setErrorMsg(t("exam.noQuestions")); setPhase("result"); return;
        }
        setExam(e);
        setQuestions(e.questions);
        setTimeLeft((e.durationMinutes || 25) * 60);
        setPhase("exam");
        startRef.current = Date.now();
      })
      .catch((err) => { setErrorMsg(String(err)); setPhase("result"); });
  }, [t]);

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
      .catch(() => {});
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
      .catch(() => {});
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
    if (!isCorrect) addWrongAnswer(q.id, q).catch(() => {});

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

  // ─── SETUP ────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="marathon-setup-screen">
        <div className="marathon-setup-card">
          <div className="marathon-setup-header">
            <button className="quiz-back-btn" onClick={onBack} style={{ position: "static" }}>
              <IconArrowLeft size={18} />
            </button>
            <h2 className="marathon-setup-title">{t("exam.title")}</h2>
          </div>

          {pkgLoading ? (
            <div style={{ padding: "32px", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto" }} />
            </div>
          ) : packages.length === 0 ? (
            <p style={{ padding: "20px 16px", color: "var(--text-muted)", textAlign: "center" }}>
              {t("exam.noPackages")}
            </p>
          ) : (
            <div className="pkg-list">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  className={`pkg-card${selectedPkg?.id === pkg.id ? " selected" : ""}`}
                  onClick={() => setSelectedPkg(pkg)}
                >
                  <div className="pkg-card-top">
                    <span className="pkg-name">{pkg.name || `Paket #${pkg.id}`}</span>
                    {pkg.isFree && (
                      <span className="pkg-badge-free">{t("exam.free")}</span>
                    )}
                  </div>
                  <div className="pkg-meta">
                    <span className="pkg-meta-item">
                      <IconListNumbers size={12} />
                      {pkg.actualQuestionCount ?? pkg.questionCount ?? 0} {t("common.questions")}
                    </span>
                    <span className="pkg-meta-item">
                      <IconClock size={12} />
                      {pkg.durationMinutes ?? 0} {t("common.min")}
                    </span>
                    <span className="pkg-meta-item">
                      {t("exam.passingScore")}: {pkg.passingScore ?? 90}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            className="marathon-start-btn"
            disabled={!selectedPkg || pkgLoading}
            onClick={() => selectedPkg && loadExam(selectedPkg.id)}
          >
            <IconPlayerPlay size={18} />
            {t("marathon.startExam")}
          </button>
        </div>
      </div>
    );
  }

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
            <button className="exam-result-btn" onClick={() => setPhase("setup")}>
              <IconRefresh size={18} /> {t("exam.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── EXAM ─────────────────────────────────────────────────────────────────
  const q           = questions[current];
  const opts        = q.options || [];
  const answered    = answers[current];
  const correctIdx  = q.correctOptionIndex ?? 0;
  const explanation = answered !== undefined ? getLocal(q.explanation) : null;
  const correct     = Object.values(answers).filter((a) => a.selected === a.correct).length;
  const wrong       = Object.values(answers).length - correct;
  const imgUrl      = imgSrc(q.imageUrl);

  return (
    <div className="exam-screen">
      {/* ── Top bar ── */}
      <div className="exam-topbar">
        <div className="exam-topbar-left">
          <button className="exam-finish-btn" onClick={() => triggerFinish(false)}>
            {t("exam.finish")} <IconX size={15} />
          </button>
          <span className={`exam-timer${timerIsRed ? " red" : timerIsYellow ? " yellow" : ""}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="exam-topbar-center">
          <span className="exam-counter">{current + 1} / {questions.length}</span>
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
          {imgUrl ? (
            <img src={imgUrl} alt="" className="exam-question-img" />
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
