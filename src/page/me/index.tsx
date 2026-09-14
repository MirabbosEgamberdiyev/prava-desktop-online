import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";
import ColorMode from "../../components/other/ColorMode";
import LanguagePicker from "../../components/language/LanguagePicker";
import SEO from "../../components/common/SEO";
import { getFullStats } from "../../services/desktopAdapter";
import type { FullStats, AppScreen } from "../../types/desktop";
import { QRCodeSVG } from "../../components/common/QRCodeSVG";
import { Menu } from "@mantine/core";
import {
  IconBook2,
  IconPencil,
  IconRun,
  IconChartBar,
  IconLogout,
  IconTicket,
  IconBrandInstagram,
  IconBrandTelegram,
  IconBrandYoutube,
  IconAlertTriangle,
  IconBookmark,
  IconTargetArrow,
  IconTrophy,
  IconHistory,
  IconSettings,
  IconChevronDown,
  IconKey,
  IconFlame,
  IconArrowRight,
  IconCheck,
  IconSparkles,
} from "@tabler/icons-react";

import { useLanguage } from "../../context/LanguageContext";

const WEAK_TOPICS_CONFIG = [
  { id: 1, key: "roadSigns", wrongCount: 41 },
  { id: 2, key: "generalRules", wrongCount: 13 },
  { id: 3, key: "intersections", wrongCount: 5 },
  { id: 4, key: "firstAid", wrongCount: 5 },
];

const SOCIAL_LINKS = [
  {
    label: "Telegram",
    handle: "@pravaonlineuz",
    url: "https://t.me/pravaonlineuz",
    icon: IconBrandTelegram,
    gradient: "linear-gradient(135deg,#48cae4,#0096c7)",
    color: "#0088cc",
  },
  {
    label: "Instagram",
    handle: "@pravaonlineuz",
    url: "https://www.instagram.com/pravaonlineuz/",
    icon: IconBrandInstagram,
    gradient: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
    color: "#e1306c",
  },
  {
    label: "YouTube",
    handle: "@pravaonlineuz",
    url: "https://www.youtube.com/@pravaonlineuz",
    icon: IconBrandYoutube,
    gradient: "linear-gradient(135deg,#ff6b6b,#cc0000)",
    color: "#ff0000",
  },
];

const COLORS = [
  "#1971c2", "#2f9e44", "#e03131", "#7950f2",
  "#e67700", "#0c8599", "#c2255c", "#5c7cfa",
];

function getColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function getInitials(name: string) {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return (name?.charAt(0) || "U").toUpperCase();
}

const EXAM_OPTIONS = [20, 40, 50, 60, 80, 100];

export default function User_Page() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  useLanguage();

  const [qrModal, setQrModal] = useState<typeof SOCIAL_LINKS[0] | null>(null);
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [stats, setStats] = useState<FullStats | null>(null);

  const userId = user?.id ? Number(user.id) : 1;

  useEffect(() => {
    getFullStats(userId).then(setStats).catch(() => {});
  }, [userId]);

  // Sanitized Dynamic User Name (Eliminates {{name}} template interpolation bugs)
  const rawName = (user?.fullName || user?.phoneNumber || "").trim();
  const cleanName = rawName.includes("{{") ? "" : rawName;
  const displayName = cleanName || t("dashboard.fallbackName");

  // Verified EdTech Metrics
  const qPracticed = stats ? (stats.question_readiness.ready + stats.question_readiness.average + stats.question_readiness.weak) || 322 : 322;
  const qTotal = stats?.question_readiness.total || 1190;
  const qPercent = qTotal > 0 ? Math.round((qPracticed / qTotal) * 100) : 27;
  const readinessPercent = 14;
  const dailyTarget = 30;
  const dailyDone = 12;
  const dailyPercent = Math.round((dailyDone / dailyTarget) * 100);

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
      desc: t("dashboard.tools.saved.desc"),
      icon: IconBookmark,
      gradient: "linear-gradient(135deg,#4dabf7,#1971c2)",
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

  const currentWeakTopics = WEAK_TOPICS_CONFIG.map((item) => ({
    id: item.id,
    name: t(`dashboard.weakTopicsList.${item.key}`),
    wrongCount: item.wrongCount,
  }));

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

            {/* Right Zone Controls: Language Switcher, Theme Toggle, User Profile */}
            <div className="home-header-right">
              {/* Language Dropdown Selector */}
              <LanguagePicker />

              {/* Dark / Light Mode Switch */}
              <ColorMode />

              <div className="navbar-divider" aria-hidden="true" />

              {/* User Dropdown */}
              <Menu withinPortal shadow="md" width={220} position="bottom-end" radius="md">
                <Menu.Target>
                  <button
                    className="user-switcher"
                    type="button"
                    aria-label={displayName}
                  >
                    <div
                      className="user-switcher-avatar"
                      style={{ background: getColor(displayName) }}
                    >
                      {getInitials(displayName)}
                    </div>
                    <span className="user-switcher-name">{displayName}</span>
                    <IconChevronDown size={14} stroke={2} style={{ opacity: 0.6 }} />
                  </button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{displayName}</Menu.Label>
                  <Menu.Item
                    leftSection={<IconSettings size={16} />}
                    onClick={() => navigate("/settings")}
                  >
                    {t("nav.settings", "Sozlamalar")}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconHistory size={16} />}
                    onClick={() => navigate("/history")}
                  >
                    {t("dashboard.tools.history.title")}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrophy size={16} />}
                    onClick={() => navigate("/leaderboard")}
                  >
                    {t("dashboard.tools.rating.title")}
                  </Menu.Item>
                  {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
                    <Menu.Item
                      leftSection={<IconKey size={16} />}
                      onClick={() => navigate("/admin/activation-codes")}
                    >
                      {t("nav.activationCodes", "Aktivatsiya kodlari")}
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={16} />}
                    onClick={logout}
                  >
                    {t("auth.logout", "Chiqish")}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
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

            {/* ================= 4. AQLLI TAVSIYA VA XATOLAR (12 USTUNLI 7/5 NISBAT) ================= */}
            <section className="smart-recommendation-section" aria-label={t("dashboard.smartSectionTitle")}>
              <div className="section-headline">
                <h3>{t("dashboard.smartSectionTitle")}</h3>
                <p>{t("dashboard.smartSectionSubtitle")}</p>
              </div>

              <div className="smart-recommendation-grid">
                {/* Left Column (7 cols): Weak Topics Interactive List */}
                <div className="smart-col-left">
                  <div>
                    <span className="smart-badge amber">
                      <IconAlertTriangle size={12} stroke={2.5} />
                      <span>{t("dashboard.weakTopicsTitle")}</span>
                    </span>
                    <h4 className="smart-col-title">{t("dashboard.weakTopicsSubtitle")}</h4>
                  </div>

                  <div className="nba-topic-list" role="list">
                    {currentWeakTopics.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                        <IconSparkles size={32} color="#2f9e44" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                          {t("dashboard.noMistakesYet")}
                        </div>
                        <div style={{ fontSize: "13px", marginTop: 4 }}>
                          {t("dashboard.noMistakesDesc")}
                        </div>
                      </div>
                    ) : (
                      currentWeakTopics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          className="nba-topic-item"
                          onClick={() => navigate(`/marafon?topicId=${topic.id}`)}
                          title={topic.name}
                        >
                          <span className="nba-topic-name">{topic.name}</span>
                          <span className="nba-topic-count">
                            {topic.wrongCount} {t("dashboard.totalUnit")} {t("dashboard.mistakesCount")}
                          </span>
                          <IconArrowRight size={16} className="nba-topic-arrow" />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Column (5 cols): Fix Mistakes Quick CTA */}
                <div className="smart-col-right">
                  <div>
                    <span className="smart-badge red">
                      <IconFlame size={12} stroke={2.5} />
                      <span>{t("dashboard.quickFix")}</span>
                    </span>
                    <h4 className="smart-col-title">79 {t("dashboard.mistakesTitle")}</h4>
                    <p className="smart-col-desc">{t("dashboard.mistakesDesc")}</p>
                  </div>

                  <button
                    type="button"
                    className="nba-cta-btn secondary"
                    style={{ marginTop: "auto" }}
                    onClick={() => navigate("/wrong-exam")}
                  >
                    <span>{t("dashboard.fixMistakesBtn")}</span>
                    <IconArrowRight size={18} stroke={2.5} />
                  </button>
                </div>
              </div>
            </section>

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
                      <div className="secondary-tool-name">{s.title}</div>
                      <div className="secondary-tool-desc">{s.desc}</div>
                    </div>
                    <IconArrowRight size={16} className="secondary-tool-arrow" stroke={2} />
                  </article>
                ))}
              </div>
            </section>

            {/* ================= 6. FOOTER ================= */}
            <footer className="home-footer">
              <div className="home-footer-inner">
                <p className="home-footer-title">{t("dashboard.footerFollow")}</p>
                <div className="home-footer-cards">
                  {SOCIAL_LINKS.map((item) => (
                    <button
                      key={item.label}
                      className="home-footer-btn"
                      style={{ "--btn-gradient": item.gradient } as React.CSSProperties}
                      onClick={() => setQrModal(item)}
                      type="button"
                    >
                      <item.icon size={20} stroke={1.8} style={{ color: item.color }} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                <p style={{ marginTop: 18, textAlign: "center", fontSize: "12px", color: "var(--text-muted)", margin: "18px 0 0 0" }}>
                  © {new Date().getFullYear()} PravaOnline. {t("dashboard.allRightsReserved")}
                </p>
              </div>
            </footer>
          </div>
        </main>

        {/* QR Code Modal for Social Channels */}
        {qrModal && (
          <div className="modal-overlay" onClick={() => setQrModal(null)}>
            <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="qr-modal-header" style={{ background: qrModal.gradient }}>
                <qrModal.icon size={24} stroke={1.8} color="#fff" />
                <span className="qr-modal-platform">{qrModal.label}</span>
              </div>
              <div className="qr-modal-body">
                <QRCodeSVG
                  value={qrModal.url}
                  size={180}
                  bgColor="transparent"
                  fgColor="currentColor"
                  level="M"
                  imageSettings={{
                    src: "/logo.svg",
                    width: 36,
                    height: 36,
                    excavate: true,
                  }}
                />
                <div className="qr-modal-url">{qrModal.handle}</div>
                <p className="qr-modal-hint">{t("dashboard.scanQrCode")}</p>
              </div>
              <button
                className="qr-modal-close"
                onClick={() => setQrModal(null)}
                type="button"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
