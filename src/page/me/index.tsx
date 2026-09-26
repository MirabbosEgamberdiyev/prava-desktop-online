import { resolveUserScopeId } from "@/utils/userScope";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";
import ColorMode from "../../components/other/ColorMode";
import LanguagePicker from "../../components/language/LanguagePicker";
import UserMenuButton from "../../components/nav/UserMenuButton";
import NetworkModeSelector from "../../components/common/NetworkModeSelector";
import SEO from "../../components/common/SEO";
import { getFullStats, getWrongAnswers, getTopics, localizeTopic, getSavedQuestions } from "../../services/desktopAdapter";
import storageService from "../../services/storageService";
import type { FullStats, AppScreen, WrongAnswerEntry, OfflineTopic } from "../../types/desktop";
import {
  IconBook2,
  IconPencil,
  IconRun,
  IconChartBar,
  IconTicket,
  IconBookmark,
  IconTargetArrow,
  IconTrophy,
  IconHistory,
  IconFlame,
  IconArrowRight,
  IconCheck,
  IconSparkles,
  IconSearch,
} from "@tabler/icons-react";

import { useLanguage } from "../../context/LanguageContext";
import { useSearchParams } from "react-router-dom";
import { dbClient } from "../../database/dbClient";
import type { DbTicket } from "../../database/schema";
import { pickResumableSession, type ResumableSession } from "../../features/Dashboard/resumeSession";
import { selectNextBestAction } from "../../features/Dashboard/nextBestAction";
import { LEARN_SECTIONS } from "../../features/Curriculum/learnSections";
import { openGlobalSearch } from "../../features/Search/GlobalSearchHost";
import NextBestActionCard from "../../components/dashboard/NextBestActionCard";
import ResumeExamCard from "../../components/dashboard/ResumeExamCard";
import SmartRecommendationSection from "../../components/dashboard/SmartRecommendationSection";
import NotificationCenter from "../../components/dashboard/NotificationCenter";

const EXAM_OPTIONS = [20, 40, 50, 60, 80, 100];

export default function User_Page() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  useLanguage();

  const [showExamPicker, setShowExamPicker] = useState(false);
  const [stats, setStats] = useState<FullStats | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerEntry[]>([]);
  const [topics, setTopics] = useState<OfflineTopic[]>([]);
  const [savedCount, setSavedCount] = useState<number>(() => {
    try {
      return storageService.getSavedQuestions().length;
    } catch {
      return 0;
    }
  });

  const userId = resolveUserScopeId(user);
  const [resumeSession, setResumeSession] = useState<ResumableSession | null>(null);
  const [tickets, setTickets] = useState<DbTicket[]>([]);
  const [ticketStatsVersion, setTicketStatsVersion] = useState(0);

  // ?picker=exam (Ctrl+K "Real exam") opens the question-count picker.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("picker") === "exam") {
      setShowExamPicker(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    getFullStats(userId).then(setStats).catch(() => {});
    getWrongAnswers(userId).then(setWrongAnswers).catch(() => {});
    getTopics().then(setTopics).catch(() => {});

    // Local-only sources: crash-recovery session (resume card) + tickets store (NBA next ticket).
    const loadLocal = () => {
      Promise.all([dbClient.getAllExamSessions(), dbClient.getTickets()])
        .then(([sessions, tks]) => {
          const byId = new Map(tks.map((tk) => [tk.id, tk.ticket_number]));
          setTickets(tks);
          setResumeSession(pickResumableSession(sessions, Date.now(), byId));
        })
        .catch(() => {});
      setTicketStatsVersion((v) => v + 1);
    };
    loadLocal();
    window.addEventListener("prava-storage-changed", loadLocal);

    const updateSaved = () => {
      getSavedQuestions(userId)
        .then((list) => setSavedCount(Array.isArray(list) ? list.length : 0))
        .catch(() => {
          try {
            setSavedCount(storageService.getSavedQuestions().length);
          } catch {}
        });
    };
    updateSaved();
    window.addEventListener("prava-storage-changed", updateSaved);
    return () => {
      window.removeEventListener("prava-storage-changed", updateSaved);
      window.removeEventListener("prava-storage-changed", loadLocal);
    };
  }, [userId]);

  // Sanitized Dynamic User Name (Eliminates {{name}} template interpolation bugs)
  const rawName = (user?.fullName || user?.phoneNumber || "").trim();
  const cleanName = rawName.includes("{{") ? "" : rawName;
  const displayName = cleanName || t("dashboard.fallbackName");

  // Dynamic Verified EdTech Metrics
  const qPracticed = stats
    ? (stats.question_readiness.ready + stats.question_readiness.average + stats.question_readiness.weak)
    : 0;
  const qTotal = stats?.question_readiness.total || 1190;
  const qPercent = qTotal > 0 ? Math.round((qPracticed / qTotal) * 100) : 0;
  const readinessPercent = stats && stats.ticket_total > 0
    ? Math.round((stats.ticket_ready / stats.ticket_total) * 100)
    : (qTotal > 0 ? Math.round(((stats?.question_readiness.ready ?? 0) / qTotal) * 100) : 0);
  const dailyTarget = 30;
  const dailyDone = Math.min(dailyTarget, qPracticed > 0 ? (qPracticed % dailyTarget || dailyTarget) : 0);
  const dailyPercent = Math.min(100, Math.round((dailyDone / dailyTarget) * 100));

  const handleNav = (screen: AppScreen) => {
    switch (screen) {
      case "exam":
        setShowExamPicker(true);
        break;
      case "topics":
        navigate("/topics");
        break;
      case "biletlar":
        navigate("/tickets");
        break;
      case "marathon":
        navigate("/marafon");
        break;
      case "stats":
        navigate("/statistics");
        break;
      case "wrong-answers":
        navigate("/wrong-answers");
        break;
      case "saved-questions":
        navigate("/saved-questions");
        break;
      case "leaderboard":
        navigate("/leaderboard");
        break;
      case "history":
        navigate("/history");
        break;
      default:
        break;
    }
  };

  const handleStartExam = (count: number) => {
    setShowExamPicker(false);
    navigate(`/exam?count=${count}`);
  };

  const primaryModes = [
    {
      screen: "topics" as AppScreen,
      title: t("dashboard.modes.topics.title"),
      desc: t("dashboard.modes.topics.desc"),
      icon: IconBook2,
      accentColor: "#1971c2",
      gradient: "linear-gradient(135deg,#4dabf7,#1971c2)",
      recommended: readinessPercent < 30,
    },
    {
      screen: "biletlar" as AppScreen,
      title: t("dashboard.modes.tickets.title"),
      desc: t("dashboard.modes.tickets.desc"),
      icon: IconTicket,
      accentColor: "#0c8599",
      gradient: "linear-gradient(135deg,#38d9a9,#0c8599)",
      recommended: false,
    },
    {
      screen: "marathon" as AppScreen,
      title: t("dashboard.modes.marathon.title"),
      desc: t("dashboard.modes.marathon.desc"),
      icon: IconRun,
      accentColor: "#7950f2",
      gradient: "linear-gradient(135deg,#9775fa,#7950f2)",
      recommended: false,
    },
    {
      screen: "exam" as AppScreen,
      title: t("dashboard.modes.exam.title"),
      desc: t("dashboard.modes.exam.desc"),
      icon: IconPencil,
      accentColor: "#f59f00",
      gradient: "linear-gradient(135deg,#ffa94d,#e67700)",
      recommended: false,
    },
  ];

  const secondaryTools = [
    {
      screen: "saved-questions" as AppScreen,
      title: t("dashboard.tools.saved.title"),
      desc:
        savedCount > 0
          ? `${savedCount} ${t("dashboard.totalUnit", "ta")} ${t("dashboard.tools.saved.title").toLowerCase()}`
          : t("dashboard.tools.saved.desc"),
      icon: IconBookmark,
      gradient: "linear-gradient(135deg,#4dabf7,#1971c2)",
      badge: savedCount > 0 ? `${savedCount} ${t("dashboard.totalUnit", "ta")}` : undefined,
    },
    {
      screen: "stats" as AppScreen,
      title: t("dashboard.tools.stats.title"),
      desc: t("dashboard.tools.stats.desc"),
      icon: IconChartBar,
      gradient: "linear-gradient(135deg,#38d9a9,#0c8599)",
    },
    {
      screen: "leaderboard" as AppScreen,
      title: t("dashboard.tools.rating.title"),
      desc: t("dashboard.tools.rating.desc"),
      icon: IconTrophy,
      gradient: "linear-gradient(135deg,#9775fa,#7950f2)",
    },
    {
      screen: "history" as AppScreen,
      title: t("dashboard.tools.history.title"),
      desc: t("dashboard.tools.history.desc"),
      icon: IconHistory,
      gradient: "linear-gradient(135deg,#ffa94d,#f59f00)",
    },
  ];

  const topicMap = useMemo(() => new Map(topics.map((tp) => [tp.id, tp])), [topics]);

  const currentWeakTopics = useMemo(() => {
    const errorMap = new Map<number, { id: number; name: string; wrongCount: number }>();
    for (const item of wrongAnswers) {
      const q = item.question;
      const tId = q.topic_id ?? 0;
      if (!tId) continue;
      const existing = errorMap.get(tId);
      const count = item.wrong_count || 1;
      if (existing) {
        existing.wrongCount += count;
      } else {
        const tp = topicMap.get(tId);
        const name = tp ? localizeTopic(tp) : ((q as any).topic_name_uzl || `Mavzu #${tId}`);
        errorMap.set(tId, { id: tId, name, wrongCount: count });
      }
    }
    return Array.from(errorMap.values())
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 5);
  }, [wrongAnswers, topicMap]);

  // Ticket ids with a passed attempt (local stats are keyed by official ticket id).
  const passedTicketIds = useMemo(() => {
    void ticketStatsVersion; // recompute after local progress changes
    const set = new Set<number>();
    for (const st of Object.values(storageService.getTicketStats())) {
      if (st && st.timesPassed > 0) set.add(Number(st.ticketId));
    }
    return set;
  }, [ticketStatsVersion]);

  const nextBestAction = useMemo(
    () =>
      selectNextBestAction({
        activeSession: resumeSession,
        totalWrongs: wrongAnswers.length,
        weakTopics: currentWeakTopics,
        tickets,
        passedTicketIds,
        practicedCount: qPracticed,
        readinessPercent,
      }),
    [resumeSession, wrongAnswers.length, currentWeakTopics, tickets, passedTicketIds, qPracticed, readinessPercent]
  );

  return (
    <>
      <SEO
        title={`Prava Online - ${t("dashboard.mainModesTitle")}`}
        description={t("dashboard.subtitle")}
        canonical="/me"
      />

      <div className="home-screen">
        {/* ================= 1. HEADER ================= */}
        <header className="home-header">
          <div className="home-header-inner">
            {/* Brand Logo */}
            <div
              className="home-header-logo"
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              onClick={() => navigate("/me")}
            >
              <img
                src="/logo.png"
                width={34}
                height={34}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.svg";
                }}
                alt="Prava"
              />
              <span className="home-header-brand">
                PRAVA<span className="brand-accent">ONLINE</span>
              </span>
            </div>

            {/* Right Zone Controls: Mode & Sync, Theme, Language, User Profile */}
            <div className="home-header-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" className="dash-search-btn" onClick={openGlobalSearch} aria-label={t("search.shortcutLabel", "Global qidiruv")} aria-keyshortcuts="Control+K">
                <IconSearch size={15} />
                <span>{t("search.buttonLabel", "Qidirish...")}</span>
                <kbd>Ctrl K</kbd>
              </button>
              <NetworkModeSelector />
              <ColorMode />
              <LanguagePicker />
              <div className="navbar-divider" aria-hidden="true" />
              <NotificationCenter />
              <UserMenuButton />
            </div>
          </div>
        </header>

        {/* ================= MAIN CONTENT ================= */}
        <main className="home-content">
          <div className="home-inner">
            {/* 1. Greeting Section */}
            <div className="home-welcome">
              <h2>
                {t("dashboard.greeting")}, <span style={{ color: "var(--primary)" }}>{displayName}</span>!
              </h2>
              <p>{t("dashboard.subtitle")}</p>
            </div>

            {/* 1.5 Unfinished test (crash-recovery session) + deterministic next step */}
            <ResumeExamCard session={resumeSession} />
            <NextBestActionCard decision={nextBestAction} onOpenExamPicker={() => setShowExamPicker(true)} />

            {/* 2. Three Gamified Metrics Bar */}
            <section className="home-stats-bar" aria-label="Metrikalar">
              {/* Metric 1: Daily Goal & Streak */}
              <article
                className="home-stat"
                onClick={() => handleNav("stats")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNav("stats")}
              >
                <div className="home-stat-top">
                  <div
                    className="home-stat-icon"
                    style={{ background: "linear-gradient(135deg,#ff922b,#f76707)" }}
                  >
                    <IconFlame size={22} color="#fff" />
                  </div>
                  <div>
                    <div className="home-stat-value">
                      {dailyDone} / {dailyTarget}
                    </div>
                    <div className="home-stat-label">
                      {t("dashboard.dailyGoal")} ({t("dashboard.questionsUnit")})
                    </div>
                  </div>
                  <span className="home-stat-pct" style={{ color: "#f76707" }}>
                    {dailyPercent}%
                  </span>
                </div>
                <div className="home-stat-bar">
                  <div
                    style={{
                      width: `${dailyPercent}%`,
                      background: "#f76707",
                      height: "100%",
                      borderRadius: "4px",
                      transition: "width .5s ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#f76707" }}>
                  🔥 {t("dashboard.activeStreak")}
                </div>
              </article>

              {/* Metric 2: Solved Questions */}
              <article
                className="home-stat"
                onClick={() => handleNav("stats")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNav("stats")}
              >
                <div className="home-stat-top">
                  <div
                    className="home-stat-icon"
                    style={{ background: "linear-gradient(135deg,#4dabf7,#1971c2)" }}
                  >
                    <IconCheck size={22} color="#fff" stroke={2.5} />
                  </div>
                  <div>
                    <div className="home-stat-value">
                      {qPracticed} / {qTotal} {t("dashboard.totalUnit")}
                    </div>
                    <div className="home-stat-label">
                      {t("dashboard.questionsSolved")}
                    </div>
                  </div>
                  <span className="home-stat-pct" style={{ color: "#1971c2" }}>
                    {qPercent}%
                  </span>
                </div>
                <div className="home-stat-bar">
                  <div
                    style={{
                      width: `${qPercent}%`,
                      background: "#1971c2",
                      height: "100%",
                      borderRadius: "4px",
                      transition: "width .5s ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-muted)" }}>
                  {t("dashboard.totalQuestionsInDb")}
                </div>
              </article>

              {/* Metric 3: Overall Readiness (Calm Emerald, No Red Panic) */}
              <article
                className="home-stat"
                onClick={() => handleNav("stats")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNav("stats")}
              >
                <div className="home-stat-top">
                  <div
                    className="home-stat-icon"
                    style={{ background: "linear-gradient(135deg,#38d9a9,#0c8599)" }}
                  >
                    <IconTargetArrow size={22} color="#fff" stroke={2.2} />
                  </div>
                  <div>
                    <div className="home-stat-value">
                      {readinessPercent}%
                    </div>
                    <div className="home-stat-label">
                      {t("dashboard.overallReadiness")}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#0c8599",
                      background: "rgba(12, 133, 153, 0.12)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      marginLeft: "auto",
                    }}
                  >
                    🌱 {t("dashboard.beginnerLevel")}
                  </span>
                </div>
                <div className="home-stat-bar">
                  <div
                    style={{
                      width: `${readinessPercent}%`,
                      background: "#0c8599",
                      height: "100%",
                      borderRadius: "4px",
                      transition: "width .5s ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-muted)" }}>
                  {t("dashboard.steadyProgress")}
                </div>
              </article>
            </section>

            {/* ================= 3. HERO: ASOSIY TA'LIM REJIMLARI (4 COLUMNS ON DESKTOP) ================= */}
            <section className="primary-edu-section" aria-label={t("dashboard.mainModesTitle")}>
              <div className="section-headline">
                <h3>{t("dashboard.mainModesTitle")}</h3>
                <p>{t("dashboard.selectFormat")}</p>
              </div>

              <div className="primary-education-grid">
                {primaryModes.map((m) => (
                  <article
                    key={m.screen}
                    className={`primary-edu-card${m.recommended ? " featured" : ""}`}
                    style={{ "--edu-accent": m.accentColor } as React.CSSProperties}
                    onClick={() => handleNav(m.screen)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNav(m.screen);
                      }
                    }}
                  >
                    {m.recommended && (
                      <span className="primary-edu-badge">
                        <IconSparkles size={11} stroke={2.5} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        {t("dashboard.recommended")}
                      </span>
                    )}

                    <div className="primary-edu-top">
                      <div
                        className="primary-edu-icon"
                        style={{ background: m.gradient }}
                      >
                        <m.icon size={24} stroke={1.8} color="#fff" />
                      </div>
                    </div>

                    <div className="primary-edu-info">
                      <h4 className="primary-edu-title">{m.title}</h4>
                      <p className="primary-edu-desc">{m.desc}</p>
                    </div>

                    <div className="primary-edu-bottom">
                      <span className="primary-edu-cta-text">
                        {t("dashboard.start")}
                      </span>
                      <div className="primary-edu-action-arrow">
                        <IconArrowRight size={16} stroke={2.5} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* ================= 4. O'RGANISH (LEARN) ================= */}
            <section className="dash-section" aria-label={t("nav.learn", "O'rganish")}>
              <div className="section-headline">
                <h3>{t("nav.learn", "O'rganish")}</h3>
                <p>{t("learn.sectionSubtitle", "Yo'l belgilari, chiziqlar, qoidalar va amaliy imtihon — internetsiz ham")}</p>
              </div>
              <div className="dash-learn-grid">
                {LEARN_SECTIONS.map((s) => (
                  <button key={s.id} type="button" className="dash-learn-card" onClick={() => navigate(s.path)}>
                    <span className="dash-learn-icon" style={{ background: s.gradient }}>
                      <s.icon size={20} stroke={1.8} />
                    </span>
                    <span className="dash-learn-title">{t(s.labelKey, s.fallback)}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ================= 5. AQLLI TAVSIYA VA XATOLAR ================= */}
            <SmartRecommendationSection
              weakTopics={currentWeakTopics}
              totalWrongs={wrongAnswers.length}
              practicedCount={qPracticed}
              onOpenExamPicker={() => setShowExamPicker(true)}
            />

            {/* ================= 5. SECONDARY COMPACT TOOLS GRID (4 COLS) ================= */}
            <section className="secondary-tools-section" aria-label={t("dashboard.analyticsTitle")}>
              <div className="section-headline">
                <h3>{t("dashboard.analyticsTitle")}</h3>
                <p>{t("dashboard.personalToolsDesc")}</p>
              </div>

              <div className="secondary-tools-grid">
                {secondaryTools.map((s) => (
                  <article
                    key={s.screen}
                    className="secondary-tool-card"
                    onClick={() => handleNav(s.screen)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNav(s.screen);
                      }
                    }}
                  >
                    <div
                      className="secondary-tool-icon"
                      style={{ background: s.gradient }}
                    >
                      <s.icon size={20} stroke={1.8} color="#fff" />
                    </div>
                    <div className="secondary-tool-info">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <div className="secondary-tool-name">{s.title}</div>
                        {s.badge && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: "10px",
                              background: "rgba(25, 113, 194, 0.12)",
                              color: "#1971c2",
                              lineHeight: "1.2",
                            }}
                          >
                            {s.badge}
                          </span>
                        )}
                      </div>
                      <div className="secondary-tool-desc">{s.desc}</div>
                    </div>
                    <IconArrowRight size={16} className="secondary-tool-arrow" stroke={2} />
                  </article>
                ))}
              </div>
            </section>

            {/* ================= 6. FOOTER ================= */}
            <footer className="home-footer" style={{ marginTop: 40, borderTop: "1px solid var(--border)", padding: "20px 0" }}>
              <div className="home-footer-inner" style={{ textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                  © {new Date().getFullYear()} PravaOnline. {t("dashboard.allRightsReserved", "Barcha huquqlar himoyalangan")}
                </p>
              </div>
            </footer>
          </div>
        </main>

        {/* Exam Count Picker Modal */}
        {showExamPicker && (
          <div className="modal-overlay" onClick={() => setShowExamPicker(false)}>
            <div className="modal-card exam-picker-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">
                {t("dashboard.examQuestionCount")}
              </h3>
              <div className="exam-picker-grid">
                {EXAM_OPTIONS.map((count) => (
                  <button
                    key={count}
                    className="exam-picker-btn"
                    onClick={() => handleStartExam(count)}
                    type="button"
                  >
                    <span className="exam-picker-num">{count}</span>
                    <span className="exam-picker-label">{t("dashboard.questionsUnit")}</span>
                    <span className="exam-picker-time">
                      {count} {t("dashboard.minutesUnit")}
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="modal-btn-cancel"
                onClick={() => setShowExamPicker(false)}
                type="button"
              >
                {t("dashboard.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
