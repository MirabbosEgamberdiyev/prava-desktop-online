import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconBulb,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconFlag,
  IconPlayerStop,
  IconVolume,
  IconVolumeOff,
  IconX,
  IconHeadphones,
} from "@tabler/icons-react";
import type { OfflineQuestion } from "../../types/desktop";
import { getLang, localizeExp, localizeOpt, localizeQ, parseOptions } from "../../services/desktopAdapter";
import { clearExamStatus, setExamStatus, type ExamStatusMode } from "../../state/statusBarStore";
import { useExamShortcuts } from "../../hooks/useExamShortcuts";
import ExamTimerDisplay from "../../components/quiz/ExamTimerDisplay";
import { getSfxEnabled, playSfx, primeSfxOnFirstGesture, subscribeSfx, toggleSfxEnabled } from "../../services/sound";
import { getTtsAuto, isTtsSupported, setTtsAuto, speakParts, stopSpeaking } from "../../services/tts";
import { prioritizeQuestionImages } from "../../services/offlineMediaManagerPreload";
import { offlineMediaManager } from "../../services/offlineMediaManager";
import { getImageUrl } from "../../utils/imageUtils";
import { showToast } from "../../utils/notificationUtils";
import { AnswerCard, type AnswerCardState } from "./components/AnswerCard";
import { QuestionNavigator } from "./components/QuestionNavigator";
import { QuestionImage } from "./components/QuestionImage";
import { ImageZoomViewer } from "./components/ImageZoomViewer";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { useSplitPane } from "./useSplitPane";
import { acquireExamFocusMode } from "./focusMode";
import { countResults, type AnswerMap } from "./logic";
import "../../styles/exam-desktop.css";

export type AutoAdvance = "always" | "correct" | "never";

export interface ExamDesktopViewProps {
  mode: ExamStatusMode;
  /** Ready, translated label: "Imtihon", "Bilet #14", "Marafon"… */
  label: string;
  questions: OfflineQuestion[];
  current: number;
  answers: AnswerMap;
  /** Record an answer for `current` (the page ignores repeated answers). */
  onSelect: (optionIndex: number) => void;
  onGoto: (index: number) => void;
  /** Finish the exam (already confirmed by the user when questions were left unanswered). */
  onFinish: () => void;
  /** Absolute deadline (epoch ms); null/undefined = untimed. */
  deadline?: number | null;
  onTimeUp?: () => void;
  maxMistakes?: number;
  /** Show correct / wrong immediately after answering (default true). */
  revealAnswers?: boolean;
  /** Practice modes: show the explanation after answering. */
  showExplanation?: boolean;
  /** Auto-advance after answering: always, only after a correct answer, or never. */
  autoAdvance?: AutoAdvance;
  /** Enter must confirm the picked option (digits/click only pre-select). */
  confirmSelection?: boolean;
  bookmarkedIds: ReadonlySet<number>;
  onToggleBookmark: (q: OfflineQuestion) => void;
  showNavigator?: boolean;
  /** Extra header chips (streak, "N qoldi"…). */
  headerExtra?: ReactNode;
  finishLabel?: string;
  /** Title/description of the finish confirmation. */
  finishConfirmTitle?: string;
  finishConfirmDesc?: string;
  /** Ask before finishing even when every question is answered (e.g. survival "give up"). */
  alwaysConfirmFinish?: boolean;
}

const AUTO_ADVANCE_MS = 700;

function ExamDesktopViewImpl(props: ExamDesktopViewProps) {
  const {
    mode,
    label,
    questions,
    current,
    answers,
    onSelect,
    onGoto,
    onFinish,
    deadline,
    onTimeUp,
    maxMistakes,
    revealAnswers = true,
    showExplanation = false,
    autoAdvance = "correct",
    confirmSelection = false,
    bookmarkedIds,
    onToggleBookmark,
    showNavigator = true,
    headerExtra,
    finishLabel,
    finishConfirmTitle,
    finishConfirmDesc,
    alwaysConfirmFinish = false,
  } = props;
  const { t, i18n } = useTranslation();
  const total = questions.length;
  const q = questions[current];
  const answered = q ? answers[current] : undefined;
  const { correct, wrong, answered: answeredCount } = useMemo(() => countResults(answers), [answers]);
  const isLast = current >= total - 1;

  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [ttsAuto, setTtsAutoState] = useState(getTtsAuto);
  const sfxOn = useSyncExternalStore(subscribeSfx, getSfxEnabled, getSfxEnabled);
  const { containerRef, splitterProps } = useSplitPane();

  const options = useMemo(() => (q ? parseOptions(q.options_json) : []), [q]);
  // i18n.language in deps: re-localize when the language changes.
  const lang = i18n.language;
  const questionText = useMemo(() => (q ? localizeQ(q) : ""), [q, lang]);
  const optionTexts = useMemo(() => options.map((o) => localizeOpt(o)), [options, lang]);
  const explanation = useMemo(
    () => (showExplanation && answered && q ? localizeExp(q) : null),
    [showExplanation, answered, q, lang]
  );

  // ── Shell integration: focus mode, sound unlock, status bar ──
  useEffect(() => {
    primeSfxOnFirstGesture();
    const releaseFocus = acquireExamFocusMode();
    return () => {
      releaseFocus();
      clearExamStatus();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!q) return;
    setExamStatus({
      mode,
      label,
      questionNumber: current + 1,
      totalQuestions: total,
      deadline: deadline ?? null,
      mistakes: wrong,
      maxMistakes,
    });
  }, [mode, label, current, total, deadline, wrong, maxMistakes, q]);

  // ── Preload the next 3 questions' images (local cache first) ──
  useEffect(() => {
    if (total === 0) return;
    prioritizeQuestionImages(questions.slice(current + 1, current + 4).map((x) => x.image_path));
  }, [current, questions, total]);

  // ── Per-question reset: pending pick, speech ──
  useEffect(() => {
    setPending(null);
    stopSpeaking();
  }, [current]);

  // ── Answer feedback (sound + auto-advance) — only for a fresh answer on the current question ──
  const seen = useRef<{ index: number; answered: boolean }>({ index: current, answered: !!answered });
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onGotoRef = useRef(onGoto);
  onGotoRef.current = onGoto;

  useEffect(() => {
    const prev = seen.current;
    const nowAnswered = !!answered;
    seen.current = { index: current, answered: nowAnswered };
    if (prev.index !== current || prev.answered || !nowAnswered || !answered) return;
    const ok = answered.selected === answered.correct;
    if (revealAnswers) playSfx(ok ? "correct" : "wrong");
    const shouldAdvance = autoAdvance === "always" || (autoAdvance === "correct" && ok);
    if (shouldAdvance && current < total - 1) {
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null;
        onGotoRef.current(current + 1);
      }, AUTO_ADVANCE_MS);
    }
  }, [answered, current, autoAdvance, revealAnswers, total]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    },
    [current]
  );

  // ── Actions ──
  const goto = useCallback(
    (i: number) => {
      if (total === 0) return;
      onGotoRef.current(Math.max(0, Math.min(total - 1, i)));
    },
    [total]
  );

  const requestFinish = useCallback(() => {
    if (alwaysConfirmFinish || answeredCount < total) setConfirmOpen(true);
    else onFinish();
  }, [alwaysConfirmFinish, answeredCount, total, onFinish]);

  const next = useCallback(() => {
    if (isLast) {
      if (answered) requestFinish();
      return;
    }
    goto(current + 1);
  }, [isLast, answered, requestFinish, goto, current]);

  const selectRef = useRef<(i: number) => void>(() => {});
  selectRef.current = (i: number) => {
    if (!q || answered || i < 0 || i >= options.length) return;
    if (confirmSelection) setPending(i);
    else onSelect(i);
  };
  const pick = useCallback((i: number) => selectRef.current(i), []);

  const toggleBookmark = useCallback(() => {
    if (q) onToggleBookmark(q);
  }, [q, onToggleBookmark]);

  const openZoom = useCallback(() => {
    if (!q?.image_path) return;
    const src = offlineMediaManager.peekLocalImageUrl(q.image_path) ?? getImageUrl(q.image_path);
    if (src) setZoomSrc(src);
  }, [q]);

  const speak = useCallback(async () => {
    if (!q) return;
    if (!isTtsSupported()) {
      showToast({ title: t("examDesktop.ttsUnsupported", "Ovozli o'qish qo'llab-quvvatlanmaydi"), color: "yellow" });
      return;
    }
    const parts = [questionText, ...optionTexts.map((o, i) => `${i + 1}. ${o}`)];
    const res = await speakParts(parts, getLang());
    if (res.showUzNotice) {
      showToast({
        id: "tts-uz-voice-missing",
        dedupeKey: "tts-uz-voice-missing",
        title: t("examDesktop.ttsNoUzVoiceTitle", "O'zbek ovozi o'rnatilmagan"),
        message: t(
          "examDesktop.ttsNoUzVoiceDesc",
          "Windows'da o'zbek tili ovozi topilmadi — matn standart ovoz bilan o'qiladi. Windows Sozlamalar → Vaqt va til → Nutq bo'limidan ovoz qo'shishingiz mumkin."
        ),
        color: "blue",
      });
    }
  }, [q, questionText, optionTexts, t]);

  // Auto-read each new question (after the per-question stop above).
  useEffect(() => {
    if (!ttsAuto || !q) return;
    const id = setTimeout(() => void speak(), 150);
    return () => clearTimeout(id);
  }, [ttsAuto, q, speak]);

  const toggleAutoRead = useCallback(() => {
    setTtsAutoState((v) => {
      setTtsAuto(!v);
      if (v) stopSpeaking();
      return !v;
    });
  }, []);

  useExamShortcuts(total > 0, {
    onSelect: (i) => {
      if (confirmOpen || zoomSrc) return;
      pick(i);
    },
    onPrev: () => {
      if (!confirmOpen && !zoomSrc) goto(current - 1);
    },
    onNext: () => {
      if (!confirmOpen && !zoomSrc) goto(current + 1);
    },
    onSpace: () => {
      if (confirmOpen || zoomSrc) return;
      next();
    },
    onConfirm: () => {
      if (zoomSrc) return;
      if (confirmOpen) {
        setConfirmOpen(false);
        onFinish();
        return;
      }
      if (confirmSelection && pending != null && !answered) {
        onSelect(pending);
        setPending(null);
        return;
      }
      if (answered) next();
    },
    onEscape: () => {
      if (zoomSrc) setZoomSrc(null);
      else if (confirmOpen) setConfirmOpen(false);
      else requestFinish();
    },
    onBookmark: () => {
      if (!confirmOpen) toggleBookmark();
    },
    onZoom: () => {
      if (confirmOpen) return;
      if (zoomSrc) setZoomSrc(null);
      else openZoom();
    },
    onSpeak: () => void speak(),
    onMute: () => toggleSfxEnabled(),
  });

  // ── Derived, memoized view data ──
  const cardStates = useMemo<AnswerCardState[]>(
    () =>
      options.map((_, i) => {
        if (!answered) return pending === i ? "pending" : "idle";
        if (!revealAnswers) return i === answered.selected ? "chosen" : "dim";
        if (i === answered.correct) return "correct";
        if (i === answered.selected) return "wrong";
        return "dim";
      }),
    [options, answered, pending, revealAnswers]
  );

  const flaggedIdx = useMemo(() => {
    const s = new Set<number>();
    questions.forEach((qq, i) => {
      if (bookmarkedIds.has(qq.id)) s.add(i);
    });
    return s;
  }, [questions, bookmarkedIds]);

  const navLegend = useMemo(
    () => ({
      current: t("examDesktop.navCurrent", "Joriy"),
      answered: t("examDesktop.navAnswered", "Javob berilgan"),
      correct: t("examDesktop.navCorrect", "To'g'ri"),
      wrong: t("examDesktop.navWrong", "Xato"),
      flagged: t("examDesktop.navFlagged", "Belgilangan"),
    }),
    [t]
  );
  const pageLabel = useCallback((from: number, to: number, n: number) => `${from}–${to} / ${n}`, []);
  const zoomLabels = useMemo(
    () => ({
      close: t("examDesktop.close", "Yopish"),
      zoomIn: t("examDesktop.zoomIn", "Kattalashtirish"),
      zoomOut: t("examDesktop.zoomOut", "Kichiklashtirish"),
      reset: t("examDesktop.zoomReset", "Asl o'lcham"),
      hint: t("examDesktop.zoomHint", "G'ildirak — masshtab, sichqoncha bilan suring"),
    }),
    [t]
  );
  const closeZoom = useCallback(() => setZoomSrc(null), []);
  const correctLabel = t("examDesktop.correctAnswer", "To'g'ri javob");
  const wrongLabel = t("examDesktop.yourAnswer", "Sizning javobingiz");

  if (!q) return null;
  const bookmarked = bookmarkedIds.has(q.id);
  const hasImage = !!q.image_path;
  const mistakesLeftDanger = maxMistakes != null && wrong >= maxMistakes;

  return (
    <div className="xd-root" data-mode={mode}>
      {/* ── Header ── */}
      <header className="xd-header">
        <div className="xd-header__left">
          <span className="xd-chip xd-chip--mode">{label}</span>
          <span className="xd-counter" aria-live="polite">
            {t("examDesktop.questionOf", "Savol")} <b>{current + 1}</b> / {total}
          </span>
          {headerExtra}
        </div>
        <div className="xd-header__center">
          {deadline ? <ExamTimerDisplay deadline={deadline} onTimeUp={onTimeUp ?? onFinish} warnings /> : null}
        </div>
        <div className="xd-header__right">
          {revealAnswers && (
            <span className="xd-chip xd-chip--ok" title={t("examDesktop.correctCount", "To'g'ri javoblar")}>
              <IconCheck size={14} aria-hidden="true" /> {correct}
            </span>
          )}
          {revealAnswers && (
            <span
              className={`xd-chip xd-chip--bad${mistakesLeftDanger ? " is-danger" : ""}`}
              title={t("examDesktop.mistakes", "Xatolar")}
            >
              <IconX size={14} aria-hidden="true" /> {wrong}
              {maxMistakes != null ? ` / ${maxMistakes}` : ""}
            </span>
          )}
          <button
            type="button"
            className="xd-btn xd-btn--ghost"
            onClick={() => void speak()}
            onMouseDown={(e) => e.preventDefault()}
            title={t("examDesktop.readAloud", "Ovoz chiqarib o'qish")}
          >
            <IconHeadphones size={17} aria-hidden="true" />
            <span className="xd-hide-sm">{t("examDesktop.readAloudShort", "O'qish")}</span>
            <kbd className="xd-kbd">T</kbd>
          </button>
          <button
            type="button"
            className={`xd-btn xd-btn--ghost xd-toggle${ttsAuto ? " is-on" : ""}`}
            onClick={toggleAutoRead}
            onMouseDown={(e) => e.preventDefault()}
            aria-pressed={ttsAuto}
            title={t("examDesktop.autoReadHint", "Har bir savolni avtomatik o'qish")}
          >
            {ttsAuto ? <IconPlayerStop size={15} aria-hidden="true" /> : null}
            {t("examDesktop.autoRead", "Avto")}
          </button>
          <button
            type="button"
            className="xd-btn xd-btn--ghost"
            onClick={() => toggleSfxEnabled()}
            onMouseDown={(e) => e.preventDefault()}
            aria-pressed={!sfxOn}
            title={sfxOn ? t("examDesktop.mute", "Ovozni o'chirish") : t("examDesktop.unmute", "Ovozni yoqish")}
          >
            {sfxOn ? <IconVolume size={17} aria-hidden="true" /> : <IconVolumeOff size={17} aria-hidden="true" />}
            <kbd className="xd-kbd">M</kbd>
          </button>
          <button
            type="button"
            className="xd-btn xd-btn--danger-ghost"
            onClick={requestFinish}
            onMouseDown={(e) => e.preventDefault()}
          >
            <IconFlag size={16} aria-hidden="true" />
            {finishLabel ?? t("examDesktop.finish", "Yakunlash")}
            <kbd className="xd-kbd">Esc</kbd>
          </button>
        </div>
      </header>

      {/* ── Split body ── */}
      <div className={`xd-split${hasImage ? "" : " xd-split--noimg"}`} ref={containerRef}>
        <section className="xd-center" aria-label={t("examDesktop.question", "Savol")}>
          <div className="xd-qhead">
            <span className="xd-qnum">{current + 1}</span>
            <p className="xd-qtext">{questionText}</p>
          </div>
          {hasImage && (
            <QuestionImage
              key={q.image_path!}
              path={q.image_path!}
              alt={questionText}
              onZoom={setZoomSrc}
              zoomHint={t("examDesktop.zoomOpen", "Kattalashtirish (Z)")}
              brokenLabel={t("examDesktop.imageUnavailable", "Rasm mavjud emas")}
            />
          )}
        </section>

        <div
          className="xd-splitter"
          role="separator"
          aria-orientation="vertical"
          title={t("examDesktop.resizeHint", "Kengligini o'zgartirish uchun suring (2× bosish — asl holat)")}
          {...splitterProps}
        />

        <aside className="xd-right">
          <div className="xd-answers" role="group" aria-label={t("examDesktop.answers", "Javoblar")}>
            {optionTexts.map((text, i) => (
              <AnswerCard
                key={i}
                index={i}
                text={text}
                state={cardStates[i]}
                disabled={!!answered}
                onPick={pick}
                correctLabel={correctLabel}
                wrongLabel={wrongLabel}
              />
            ))}
          </div>

          {confirmSelection && pending != null && !answered && (
            <button
              type="button"
              className="xd-btn xd-btn--primary xd-btn--block"
              onClick={() => {
                onSelect(pending);
                setPending(null);
              }}
            >
              {t("examDesktop.confirmAnswer", "Javobni tasdiqlash")} <kbd className="xd-kbd">↵</kbd>
            </button>
          )}

          {explanation && (
            <div className="xd-explain" role="note">
              <div className="xd-explain__title">
                <IconBulb size={16} aria-hidden="true" /> {t("examDesktop.explanation", "Izoh")}
              </div>
              <p className="xd-explain__text">{explanation}</p>
            </div>
          )}

          <div className="xd-actions">
            <button
              type="button"
              className="xd-btn"
              onClick={() => goto(current - 1)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={current === 0}
            >
              <IconChevronLeft size={16} aria-hidden="true" /> {t("examDesktop.prev", "Oldingi")}{" "}
              <kbd className="xd-kbd">←</kbd>
            </button>
            <button
              type="button"
              className={`xd-btn${bookmarked ? " is-active" : ""}`}
              onClick={toggleBookmark}
              onMouseDown={(e) => e.preventDefault()}
              aria-pressed={bookmarked}
            >
              {bookmarked ? (
                <IconBookmarkFilled size={16} aria-hidden="true" />
              ) : (
                <IconBookmark size={16} aria-hidden="true" />
              )}
              {bookmarked ? t("examDesktop.bookmarked", "Belgilangan") : t("examDesktop.bookmark", "Belgilash")}{" "}
              <kbd className="xd-kbd">B</kbd>
            </button>
            {isLast ? (
              <button
                type="button"
                className="xd-btn xd-btn--primary"
                onClick={requestFinish}
                onMouseDown={(e) => e.preventDefault()}
              >
                {finishLabel ?? t("examDesktop.finish", "Yakunlash")} <IconCheck size={16} aria-hidden="true" />{" "}
                <kbd className="xd-kbd">Space ↵</kbd>
              </button>
            ) : (
              <button
                type="button"
                className="xd-btn xd-btn--primary"
                onClick={() => goto(current + 1)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {t("examDesktop.next", "Keyingi")} <IconChevronRight size={16} aria-hidden="true" />{" "}
                <kbd className="xd-kbd">Space ↵</kbd>
              </button>
            )}
          </div>

          {showNavigator && total > 1 && (
            <QuestionNavigator
              total={total}
              current={current}
              answers={answers}
              flagged={flaggedIdx}
              revealResults={revealAnswers}
              onGoto={goto}
              pageLabel={pageLabel}
              legend={navLegend}
            />
          )}

          <p className="xd-keys-hint" aria-hidden="true">
            <kbd className="xd-kbd">1–5</kbd> {t("examDesktop.hintAnswer", "javob")} · <kbd className="xd-kbd">← →</kbd>{" "}
            {t("examDesktop.hintNavigate", "savollar")} · <kbd className="xd-kbd">Z</kbd> {t("examDesktop.hintZoom", "rasm")} ·{" "}
            <kbd className="xd-kbd">T</kbd> {t("examDesktop.hintRead", "o'qish")} · <kbd className="xd-kbd">M</kbd>{" "}
            {t("examDesktop.hintMute", "ovoz")}
          </p>
        </aside>
      </div>

      {zoomSrc && <ImageZoomViewer src={zoomSrc} alt={questionText} onClose={closeZoom} labels={zoomLabels} />}
      {confirmOpen && (
        <ConfirmDialog
          title={finishConfirmTitle ?? t("examDesktop.finishConfirmTitle", "Imtihonni yakunlaysizmi?")}
          description={
            finishConfirmDesc ??
            (answeredCount < total
              ? t("examDesktop.finishConfirmDesc", "{{count}} ta savolga javob berilmagan. Ular xato deb hisoblanadi.", {
                  count: total - answeredCount,
                })
              : t("examDesktop.finishConfirmDescAll", "Barcha savollarga javob berildi. Natijani ko'rasizmi?"))
          }
          confirmLabel={finishLabel ?? t("examDesktop.finish", "Yakunlash")}
          cancelLabel={t("examDesktop.continue", "Davom etish")}
          onConfirm={() => {
            setConfirmOpen(false);
            onFinish();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

/** Shared split-view desktop exam UI (Real, Ticket, Marathon, Survival, WrongExam, Topic). */
export const ExamDesktopView = memo(ExamDesktopViewImpl);
export default ExamDesktopView;
