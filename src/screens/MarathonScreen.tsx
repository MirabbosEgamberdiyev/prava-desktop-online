import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { UserResponse, QuestionResponse, OptionResponse, LocalizedText, TopicResponse } from "../types";
import { getTopics, startMarathon, submitExam, addWrongAnswer, toggleSavedQuestion, getSavedQuestions } from "../api";
import { API_BASE } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";
import {
  IconChevronLeft, IconChevronRight, IconCheck, IconX,
  IconArrowLeft, IconTrophy, IconSteeringWheel, IconBulb,
  IconBookmark, IconBookmarkFilled, IconPlayerPlay, IconListNumbers,
} from "@tabler/icons-react";

interface Props {
  user: UserResponse;
  topicId: number | null;
  onBack: () => void;
}

type Phase = "setup" | "loading" | "exam" | "result";
interface Answer { selected: number; correct: number; }

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

export default function MarathonScreen({ topicId, onBack }: Props) {
  const { t } = useTranslation();

  const [topics, setTopics]           = useState<TopicResponse[]>([]);
  const [selTopic, setSelTopic]       = useState<number | null>(topicId);
  const [questionCount, setQuestionCount] = useState(20);

  const [phase, setPhase]             = useState<Phase>("setup");
  const [questions, setQuestions]     = useState<QuestionResponse[]>([]);
  const [sessionId, setSessionId]     = useState<number | null>(null);
  const [current, setCurrent]         = useState(0);
  const [answers, setAnswers]         = useState<Record<number, Answer>>({});
  const [showExp, setShowExp]         = useState(false);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [savedIds, setSavedIds]       = useState<Set<number>>(new Set());

  const autoRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef   = useRef(answers);
  const activeQnumRef = useRef<HTMLButtonElement | null>(null);
  answersRef.current = answers;

  useEffect(() => {
    getTopics().then(setTopics).catch((e) => console.warn("[MarathonScreen] getTopics failed:", e));
  }, []);

  useEffect(() => {
    getSavedQuestions()
      .then((entries) => setSavedIds(new Set(entries.map((e) => e.questionId))))
      .catch((e) => console.warn("[MarathonScreen] getSavedQuestions failed:", e));
  }, []);

  useEffect(() => { setShowExp(false); }, [current]);

  useEffect(() => {
    activeQnumRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [current]);

  const startExamFn = useCallback(() => {
    setPhase("loading");
    setAnswers({});
    answersRef.current = {};
    setCurrent(0);
    setErrorMsg(null);

    startMarathon(selTopic ?? undefined, questionCount)
      .then((e) => {
        if (!e.questions || e.questions.length === 0) {
          setErrorMsg(t("marathon.noQuestions")); setPhase("result"); return;
        }
        setSessionId(e.sessionId ?? null);
        setQuestions(e.questions);
        setPhase("exam");
      })
      .catch((err) => {
        console.error("[MarathonScreen] startMarathon failed:", err);
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setPhase("result");
      });
  }, [selTopic, t]);

  const triggerFinish = useCallback(() => {
    if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }
    setPhase("result");
    if (!sessionId) return;
    const curAnswers = answersRef.current;
    const arr = Object.entries(curAnswers).map(([idxStr, a]) => ({
      questionId: questions[Number(idxStr)]?.id ?? 0,
      selectedOptionIndex: a.selected,
    })).filter(a => a.questionId !== 0);
    submitExam({ sessionId, answers: arr }).catch((e) => console.warn("[MarathonScreen] submit failed:", e));
  }, [sessionId, questions]);

  const handleSelect = (optIdx: number) => {
    if (answers[current] !== undefined) return;
    const q = questions[current];
    if (!q || !q.options) return;
    if (optIdx >= q.options.length) return;
    if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }

    const correctIdx = q.correctOptionIndex ?? 0;
    const isCorrect = optIdx === correctIdx;
    if (!isCorrect) addWrongAnswer(q.id, q).catch((e) => console.warn("[MarathonScreen] op failed:", e));

    const newAns = { ...answers, [current]: { selected: optIdx, correct: correctIdx } };
    setAnswers(newAns);
    answersRef.current = newAns;

    if (current < questions.length - 1) {
      autoRef.current = setTimeout(() => setCurrent((c) => c + 1), 800);
    }
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

  const handleToggleSave = (question: QuestionResponse) => {
    if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }
    // question obyektini uzatamiz — localStorage ga to'liq ma'lumot saqlansin
    toggleSavedQuestion(question.id, question)
      .then((isNowSaved) => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (isNowSaved) next.add(question.id); else next.delete(question.id);
          return next;
        });
      })
      .catch((e) => console.warn("[MarathonScreen] op failed:", e));
  };

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

  // ── SETUP ───────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="marathon-setup-screen">
        <div className="marathon-setup-card">
          <div className="marathon-setup-header">
            <button className="quiz-back-btn" onClick={onBack} style={{ position: "static" }}>
              <IconArrowLeft size={18} />
            </button>
            <h2 className="marathon-setup-title">{t("marathon.title")}</h2>
          </div>

          <div className="marathon-setup-section">
            <label className="marathon-setup-label">{t("marathon.selectTopic")}</label>
            <select
              className="marathon-setup-select"
              value={selTopic ?? ""}
              onChange={(e) => setSelTopic(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">{t("marathon.allTopics")}</option>
              {topics.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {getLocal(tp.name ? { uzl: tp.nameUzl, uzc: tp.nameUzc, ru: tp.nameRu, en: tp.nameEn } : null) || tp.nameUzl || String(tp.id)}
                  {tp.questionCount ? ` (${tp.questionCount})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="marathon-setup-section">
            <label className="marathon-setup-label">{t("marathon.questionCount")}</label>
            <div className="marathon-count-btns">
              {[20, 40, 60, 100].map((n) => (
                <button
                  key={n}
                  className={`marathon-count-btn${questionCount === n ? " active" : ""}`}
                  onClick={() => setQuestionCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="marathon-setup-section">
            <p className="marathon-setup-hint">
              <IconListNumbers size={13} />
              {t("marathon.available")}: {
                selTopic != null
                  ? (topics.find((tp) => tp.id === selTopic)?.questionCount ?? 0)
                  : topics.reduce((s, tp) => s + (tp.questionCount ?? 0), 0)
              } {t("common.questions")}
            </p>
          </div>

          <button className="marathon-start-btn" onClick={startExamFn}>
            <IconPlayerPlay size={18} />
            {t("marathon.startExam")}
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div className="loading-screen"><div className="spinner" /><p>{t("common.loading")}</p></div>
  );

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === "result") {
    const correct = Object.values(answers).filter((a) => a.selected === a.correct).length;
    const total   = questions.length;
    const wrong   = Object.values(answers).length - correct;
    const score   = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className="quiz-result-screen">
        <div className="quiz-result-card">
          <div className={`quiz-result-badge ${errorMsg ? "failed" : "passed"}`}>
            {errorMsg ? <IconX size={34} /> : <IconTrophy size={34} />}
          </div>
          <h2 className={`quiz-result-title ${errorMsg ? "failed" : "passed"}`}>
            {errorMsg ? t("common.error") : t("marathon.finished")}
          </h2>
          {errorMsg ? (
            <p style={{ color: "var(--text-muted)", margin: "8px 0 20px", fontSize: 13 }}>{errorMsg}</p>
          ) : (
            <>
              <div className="quiz-result-score">{score}%</div>
              <div className="quiz-result-stats">
                <div className="quiz-result-stat green"><span className="stat-num">{correct}</span>{t("common.correct")}</div>
                <div className="quiz-result-stat red"><span className="stat-num">{wrong}</span>{t("common.wrong")}</div>
                <div className="quiz-result-stat blue"><span className="stat-num">{total}</span>{t("common.questions")}</div>
              </div>
            </>
          )}
          <div className="quiz-result-actions">
            <button className="quiz-result-btn primary" onClick={onBack}>
              <IconArrowLeft size={16} /> {t("common.backToHome")}
            </button>
            <button className="quiz-result-btn" onClick={() => setPhase("setup")}>
              {t("marathon.setup")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── EXAM ────────────────────────────────────────────────────────────────────
  const q            = questions[current];
  const opts         = q.options || [];
  const answered     = answers[current];
  const correctIdx   = q.correctOptionIndex ?? 0;
  const explanation  = answered !== undefined ? getLocal(q.explanation) : null;
  const correct      = Object.values(answers).filter((a) => a.selected === a.correct).length;
  const wrong        = Object.values(answers).length - correct;
  const answeredCount = Object.keys(answers).length;
  const progressPct  = Math.round((answeredCount / questions.length) * 100);
  const isSaved      = savedIds.has(q.id);
  const imgUrl       = imgSrc(q.imageUrl);

  return (
    <div className="exam-screen">
      {/* ── Topbar ── */}
      <div className="exam-topbar">
        <div className="exam-topbar-left">
          <button className="exam-finish-btn" onClick={() => triggerFinish()}>
            {t("exam.finish")} <IconX size={15} />
          </button>
          <div className="marathon-topbar-progress">
            <div className="marathon-topbar-bar">
              <div className="marathon-topbar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="marathon-topbar-frac">{answeredCount}/{questions.length}</span>
          </div>
        </div>
        <div className="exam-topbar-center">
          <span className="exam-counter">{current + 1} / {questions.length}</span>
        </div>
        <div className="exam-topbar-right">
          <span className="exam-score-chip green"><IconCheck size={13} /> {correct}</span>
          <span className="exam-score-chip red"><IconX size={13} /> {wrong}</span>
          <LanguagePicker />
          <ThemeToggle />
        </div>
      </div>

      {/* ── Question text ── */}
      <div className="exam-question-header">
        <p className="exam-question-text">{getLocal(q.text)}</p>
        <button
          className={`exam-bookmark-btn${isSaved ? " saved" : ""}`}
          onClick={() => handleToggleSave(q)}
          title={isSaved ? t("saved.remove") : t("common.save")}
        >
          {isSaved ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
        </button>
      </div>

      {/* ── Two-column body ── */}
      <div className="exam-two-col marathon-two-col">
        <div className="exam-col-options">
          {opts.map((opt: OptionResponse, idx: number) => {
            let cls = "exam-option";
            if (answered) {
              if (idx === correctIdx) cls += " correct";
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

          {answered !== undefined && explanation && (
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

      {/* ── Bottom ── */}
      <div className="exam-bottom">
        <div className="exam-bottom-row">
          <button className="exam-nav-btn" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <IconChevronLeft size={17} /> {t("exam.prev")}
          </button>
          <div className="exam-qnums scrollable">
            {questions.map((_, i) => {
              const a = answers[i];
              let cls = "exam-qnum";
              if (i === current) cls += " active";
              else if (a) cls += a.selected === a.correct ? " correct" : " wrong";
              return (
                <button key={i} className={cls} ref={i === current ? activeQnumRef : null} onClick={() => setCurrent(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {current === questions.length - 1 ? (
            <button className="exam-nav-btn primary" onClick={() => triggerFinish()}>
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
