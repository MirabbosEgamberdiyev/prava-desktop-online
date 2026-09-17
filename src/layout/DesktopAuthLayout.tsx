import { Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppShell,
  Box,
  Container,
  Group,
  Stack,
  Text,
  UnstyledButton,
  Badge,
} from "@mantine/core";
import {
  IconKey,
  IconUserPlus,
  IconQrcode,
  IconBrandTelegram,
  IconShieldCheck,
  IconCertificate,
} from "@tabler/icons-react";
import LanguagePicker from "../components/language/LanguagePicker";
import ColorMode from "../components/other/ColorMode";
import { RouteContentFallback } from "../components/common/RouteContentFallback";
import { useTranslation } from "react-i18next";

// Steering Wheel SVG Logo
function SteeringWheelLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#ffffff" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" stroke="#ffffff" strokeWidth="3" />
      <path
        d="M24 4V17M24 31V44M4 24H17M31 24H44"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const DesktopAuthLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  const isLanguagePage = location.pathname.includes("/auth/language");
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab");

  const isLoginActive = location.pathname.includes("/auth/login") && !currentTab;
  const isRegisterActive = location.pathname.includes("/auth/register");
  const isQrActive = currentTab === "qr";
  const isTelegramActive = currentTab === "telegram";

  const lang = i18n.language;

  const navItems = [
    {
      id: "login",
      label:
        lang === "ru"
          ? "Вход в систему"
          : lang === "uzc"
          ? "Тизимга кириш"
          : "Tizimga kirish",
      icon: IconKey,
      active: isLoginActive,
      onClick: () => navigate("/auth/login"),
    },
    {
      id: "register",
      label:
        lang === "ru"
          ? "Регистрация"
          : lang === "uzc"
          ? "Рўйхатдан ўтиш"
          : "Ro'yxatdan o'tish",
      icon: IconUserPlus,
      active: isRegisterActive,
      onClick: () => navigate("/auth/register"),
    },
    {
      id: "qr",
      label:
        lang === "ru"
          ? "Вход по QR-коду"
          : lang === "uzc"
          ? "QR орқали кириш"
          : "QR orqali kirish",
      icon: IconQrcode,
      active: isQrActive,
      onClick: () => navigate("/auth/login?tab=qr"),
    },
    {
      id: "telegram",
      label:
        lang === "ru"
          ? "Telegram бот"
          : lang === "uzc"
          ? "Telegram бот"
          : "Telegram bot",
      icon: IconBrandTelegram,
      active: isTelegramActive,
      onClick: () => navigate("/auth/login?tab=telegram"),
    },
  ];

  const tSafeConnection =
    lang === "ru"
      ? "Безопасное соединение"
      : lang === "uzc"
      ? "Хавфсиз уланиш"
      : "Xavfsiz ulanish";

  const tOfficialQuestions =
    lang === "ru"
      ? "100% актуальные билеты"
      : lang === "uzc"
      ? "100% амалдаги саволлар"
      : "100% amaldagi savollar";

  return (
    <AppShell
      header={{ height: 54 }}
      padding={0}
      style={{ height: "100%", minHeight: "100%", background: "var(--bg)" }}
    >
      {/* Top Header Titlebar */}
      <AppShell.Header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--card-bg)",
        }}
      >
        <Container h="100%" fluid px="lg">
          <Group h="100%" justify="space-between" wrap="nowrap">
            {/* Left: Brand Logo + version */}
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/me")}
            >
              <img
                src="/logo.png"
                width={28}
                height={28}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/favicon.svg";
                }}
                alt="Prava Online"
              />
              <Text
                fw={800}
                fz="sm"
                style={{
                  letterSpacing: "0.5px",
                  color: "var(--text)",
                }}
              >
                PRAVA<span style={{ color: "#0284c7" }}>ONLINE</span>
              </Text>
              <Badge size="xs" variant="light" color="blue" radius="sm">
                v1.0.0
              </Badge>
            </Group>

            {/* Right: Dark/Light + Language Switcher */}
            <Group gap={10} wrap="nowrap">
              <ColorMode />
              <LanguagePicker />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          background: "var(--bg)",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem 1rem",
          }}
        >
          <Suspense fallback={<RouteContentFallback />}>
            {isLanguagePage ? (
              <Outlet />
            ) : (
              /* Desktop Auth Container with Responsive Split/Stack */
              <Box
                className="desktop-auth-shell"
                style={{
                  display: "flex",
                  width: "100%",
                  maxWidth: 880,
                  minHeight: 560,
                  borderRadius: 24,
                  overflow: "hidden",
                  boxShadow: "0 16px 48px rgba(10, 37, 64, 0.10)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card-bg, #ffffff)",
                }}
              >
                {/* Left Blue Sidebar (Visible on screens >= 840px) */}
                <Box
                  className="auth-sidebar-rail"
                  style={{
                    width: 270,
                    background: "linear-gradient(180deg, #0284c7 0%, #0369a1 100%)",
                    padding: "32px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  }}
                >
                  <Stack gap={24}>
                    {/* Brand Section */}
                    <Stack align="center" gap={10}>
                      <Box
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 18,
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                        }}
                      >
                        <SteeringWheelLogo size={32} />
                      </Box>
                      <Text
                        fw={800}
                        fz={17}
                        c="#ffffff"
                        style={{ letterSpacing: "0.8px" }}
                      >
                        PRAVA ONLINE
                      </Text>
                      <Text
                        fz={11.5}
                        c="rgba(255, 255, 255, 0.85)"
                        ta="center"
                        style={{ lineHeight: 1.35 }}
                      >
                        {lang === "ru"
                          ? "Подготовка к экзамену ПДД"
                          : lang === "uzc"
                          ? "Ҳайдовчилик имтиҳонига тайёргарлик"
                          : "Haydovchilik imtihoniga tayyorgarlik"}
                      </Text>
                    </Stack>

                    {/* Navigation Pills */}
                    <Stack gap={8} mt={10}>
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <UnstyledButton
                            key={item.id}
                            onClick={item.onClick}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "11px 16px",
                              borderRadius: 14,
                              transition: "all 0.18s ease",
                              backgroundColor: item.active
                                ? "rgba(255, 255, 255, 0.25)"
                                : "transparent",
                              color: "#ffffff",
                              fontWeight: item.active ? 700 : 500,
                              fontSize: 13.5,
                              boxShadow: item.active
                                ? "0 2px 8px rgba(0, 0, 0, 0.12)"
                                : "none",
                            }}
                          >
                            <Icon size={19} stroke={item.active ? 2.4 : 1.8} />
                            <span>{item.label}</span>
                          </UnstyledButton>
                        );
                      })}
                    </Stack>
                  </Stack>

                  {/* Sidebar Trust Info */}
                  <Stack gap={8}>
                    <Box
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      <Group gap={8} wrap="nowrap">
                        <IconShieldCheck size={16} color="#ffffff" />
                        <Text fz={11.5} c="#ffffff" fw={600}>
                          {tSafeConnection}
                        </Text>
                      </Group>
                    </Box>

                    <Box
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <Group gap={8} wrap="nowrap">
                        <IconCertificate size={16} color="#ffffff" />
                        <Text fz={11} c="rgba(255, 255, 255, 0.9)" fw={500}>
                          {tOfficialQuestions}
                        </Text>
                      </Group>
                    </Box>
                  </Stack>
                </Box>

                {/* Right Content Canvas */}
                <Box
                  className="auth-main-canvas"
                  style={{
                    flex: 1,
                    padding: "32px 32px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    backgroundColor: "var(--card-bg, #ffffff)",
                    minWidth: 0,
                  }}
                >
                  <Outlet />
                </Box>
              </Box>
            )}
          </Suspense>
        </div>
      </AppShell.Main>

      {/* Responsive Styles for DesktopAuthLayout */}
      <style>{`
        @media (max-width: 840px) {
          .desktop-auth-shell {
            flex-direction: column !important;
            max-width: 480px !important;
            min-height: auto !important;
          }
          .auth-sidebar-rail {
            width: 100% !important;
            padding: 20px 16px 14px 16px !important;
            border-radius: 0 !important;
          }
          .auth-sidebar-rail .mantine-Stack-root:first-of-type {
            gap: 12px !important;
          }
          .auth-sidebar-rail .mantine-Stack-root:first-of-type .mantine-Stack-root:first-of-type {
            flex-direction: row !important;
            justify-content: center !important;
            gap: 8px !important;
          }
          .auth-sidebar-rail .mantine-Stack-root:last-of-type {
            display: none !important;
          }
          .auth-sidebar-rail .mantine-Stack-root:first-of-type .mantine-Stack-root:last-of-type {
            flex-direction: row !important;
            overflow-x: auto !important;
            padding-bottom: 4px !important;
            margin-top: 6px !important;
            gap: 6px !important;
          }
          .auth-sidebar-rail button {
            padding: 8px 12px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
          }
          .auth-main-canvas {
            padding: 24px 18px !important;
          }
        }
      `}</style>
    </AppShell>
  );
};

export default DesktopAuthLayout;
