import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserResponse, ComprehensiveStatisticsResponse, AppScreen } from "../types";
import ThemeToggle from "../components/ThemeToggle";
import LanguagePicker from "../components/LanguagePicker";
import { getMyStats } from "../api";
import { QRCodeSVG } from "qrcode.react";
import {
  IconBook2,
  IconPencil,
  IconRun,
  IconChartBar,
  IconLogout,
  IconTicket,
  IconPlayerPlayFilled,
  IconBrandInstagram,
  IconBrandTelegram,
  IconBrandYoutube,
  IconWorld,
  IconAlertTriangle,
  IconBookmark,
  IconTargetArrow,
  IconCheck,
  IconX,
} from "@tabler/icons-react";

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    handle: "@pravaonlineuz",
    url: "https://www.instagram.com/pravaonlineuz/",
    icon: IconBrandInstagram,
    gradient: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
    color: "#e1306c",
  },
  {
    label: "Telegram",
    handle: "@pravaonlineuz",
    url: "https://t.me/pravaonlineuz",
    icon: IconBrandTelegram,
    gradient: "linear-gradient(135deg,#48cae4,#0096c7)",
    color: "#0088cc",
  },
  {
    label: "YouTube",
    handle: "@pravaonlineuz",
    url: "https://www.youtube.com/@pravaonlineuz",
    icon: IconBrandYoutube,
    gradient: "linear-gradient(135deg,#ff6b6b,#cc0000)",
    color: "#ff0000",
  },
  {
    label: "Website",
    handle: "pravaonline.uz",
    url: "https://pravaonline.uz/",
    icon: IconWorld,
    gradient: "linear-gradient(135deg,#4dabf7,#1971c2)",
    color: "#1971c2",
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
function getInitials(first: string, last?: string | null) {
  return (first?.charAt(0).toUpperCase() || "") + (last?.charAt(0).toUpperCase() || "");
}

interface Props {
  user: UserResponse;
  onLogout: () => void;
  onNav: (s: AppScreen) => void;
}

export default function HomeScreen({ user, onLogout, onNav }: Props) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ComprehensiveStatisticsResponse | null>(null);
  const [qrModal, setQrModal] = useState<typeof SOCIAL_LINKS[0] | null>(null);

  useEffect(() => {
    getMyStats().then(setStats).catch(() => {});
  }, []);

  const menus = [
    { icon: <IconPencil size={28} stroke={1.5} color="#fff" />, label: t("home.exam"), desc: t("home.examDesc"), color: "#7950f2", gradient: "linear-gradient(135deg,#9775fa,#7950f2)", screen: "exam" as AppScreen, featured: true },
    { icon: <IconBook2 size={28} stroke={1.5} color="#fff" />, label: t("home.topics"), desc: t("home.topicsDesc"), color: "#1971c2", gradient: "linear-gradient(135deg,#4dabf7,#1971c2)", screen: "topics" as AppScreen },
    { icon: <IconTicket size={28} stroke={1.5} color="#fff" />, label: t("home.biletlar"), desc: t("home.biletlarDesc"), color: "#0c8599", gradient: "linear-gradient(135deg,#38d9a9,#0c8599)", screen: "biletlar" as AppScreen },
    { icon: <IconRun size={28} stroke={1.5} color="#fff" />, label: t("home.marathon"), desc: t("home.marathonDesc"), color: "#e03131", gradient: "linear-gradient(135deg,#f06595,#c2255c)", screen: "marathon" as AppScreen },
    { icon: <IconChartBar size={28} stroke={1.5} color="#fff" />, label: t("home.stats"), desc: t("home.statsDesc"), color: "#e67700", gradient: "linear-gradient(135deg,#ffa94d,#e67700)", screen: "stats" as AppScreen },
    { icon: <IconAlertTriangle size={28} stroke={1.5} color="#fff" />, label: t("home.wrongAnswers"), desc: t("home.wrongAnswersDesc"), color: "#e03131", gradient: "linear-gradient(135deg,#ff6b6b,#e03131)", screen: "wrong-answers" as AppScreen },
    { icon: <IconBookmark size={28} stroke={1.5} color="#fff" />, label: t("home.saved"), desc: t("home.savedDesc"), color: "#1971c2", gradient: "linear-gradient(135deg,#4dabf7,#1971c2)", screen: "saved-questions" as AppScreen },
  ];

  // Build stats bar from ComprehensiveStatisticsResponse
  const totalExams    = stats?.summary?.totalExams ?? 0;
  const avgScore      = stats?.summary?.averageScore ?? 0;
  const passRate      = stats?.summary?.passRate ?? 0;

  const statItems = [
    {
      icon: <IconTicket size={20} color="#fff" />,
      gradient: "linear-gradient(135deg,#38d9a9,#0c8599)",
      value: String(totalExams),
      label: t("stats.totalExams"),
      sub: null,
    },
    {
      icon: <IconCheck size={20} color="#fff" />,
      gradient: "linear-gradient(135deg,#9775fa,#7950f2)",
      value: `${Math.round(avgScore)}%`,
      label: t("stats.avgScore"),
      sub: null,
    },
    {
      icon: <IconTargetArrow size={20} color="#fff" />,
      gradient: passRate >= 80
        ? "linear-gradient(135deg,#69db7c,#2f9e44)"
        : passRate >= 40
        ? "linear-gradient(135deg,#ffa94d,#e67700)"
        : "linear-gradient(135deg,#ff6b6b,#e03131)",
      value: `${Math.round(passRate)}%`,
      label: t("stats.passRate"),
      sub: null,
    },
  ];

  return (
    <div className="home-screen">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-inner">
          <div className="home-header-logo" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="Prava" onError={(e) => (e.currentTarget.style.display = "none")} />
            <span className="home-header-brand">PRAVAONLINE</span>
          </div>
          <div className="home-header-right">
            <LanguagePicker />
            <ThemeToggle />
            <button className="user-switcher" onClick={onLogout} title={t("auth.logout")}>
              <div className="user-switcher-avatar" style={{ background: getColor(user.firstName) }}>
                {getInitials(user.firstName, user.lastName)}
              </div>
              <span className="user-switcher-name">{user.firstName} {user.lastName || ""}</span>
              <IconLogout size={16} stroke={2} style={{ opacity: 0.5 }} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="home-content">
        <div className="home-inner">
          <div className="home-welcome">
            <h2>{t("home.welcome", { name: user.firstName })}</h2>
            <p>{t("home.subtitle")}</p>
          </div>

          <div className="home-stats-bar">
            {statItems.map((s, i) => (
              <div key={i} className="home-stat" onClick={() => onNav("stats")} style={{ cursor: "pointer" }}>
                <div className="home-stat-icon" style={{ background: s.gradient }}>{s.icon}</div>
                <div>
                  <div className="home-stat-value">
                    {s.value}
                    {s.sub && <span className="home-stat-sub">{s.sub}</span>}
                  </div>
                  <div className="home-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="home-menu-grid">
            {menus.map((m, i) => (
              <button
                key={m.screen}
                className={`home-menu-card${m.featured ? " featured" : ""}`}
                onClick={() => onNav(m.screen)}
                style={{ "--accent": m.color } as React.CSSProperties}
              >
                <span className="home-menu-num">{i + 1}</span>
                <div className="home-menu-icon" style={{ background: m.gradient }}>
                  {m.icon}
                </div>
                <div className="home-menu-label">{m.label}</div>
                <div className="home-menu-desc">{m.desc}</div>
                <span className="home-menu-start">
                  <IconPlayerPlayFilled size={13} />
                  {t("home.start")}
                </span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <footer className="home-footer">
            <div className="home-footer-inner">
              <p className="home-footer-title">Bizni ijtimoiy tarmoqlarda kuzating</p>
              <div className="home-footer-cards">
                {SOCIAL_LINKS.map((s) => (
                  <button
                    key={s.label}
                    className="home-footer-btn"
                    style={{ background: s.gradient }}
                    onClick={() => setQrModal(s)}
                  >
                    <s.icon size={20} stroke={1.8} color="#fff" />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </footer>

          {/* QR Modal */}
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
                      src: "/logo.png",
                      width: 36,
                      height: 36,
                      excavate: true,
                    }}
                  />
                  <div className="qr-modal-url">{qrModal.handle}</div>
                  <p className="qr-modal-hint">QR kodni skanerlang</p>
                </div>
                <button className="qr-modal-close" onClick={() => setQrModal(null)}>✕</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
