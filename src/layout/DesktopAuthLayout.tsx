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
} from "@mantine/core";
import {
  IconKey,
  IconUserPlus,
  IconQrcode,
  IconBrandTelegram,
} from "@tabler/icons-react";
import LanguagePicker from "../components/language/LanguagePicker";
import ColorMode from "../components/other/ColorMode";
import { RouteContentFallback } from "../components/common/RouteContentFallback";
import { useTranslation } from "react-i18next";

// White Steering Wheel Vector Logo
function SteeringWheelLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#ffffff" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" stroke="#ffffff" strokeWidth="3" />
      <path d="M24 4V17M24 31V44M4 24H17M31 24H44" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
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

  const navItems = [
    {
      id: "login",
      label: i18n.language === "ru" ? "Вход" : i18n.language === "uzc" ? "Кириш" : "Kirish",
      icon: IconKey,
      active: isLoginActive,
      onClick: () => navigate("/auth/login"),
    },
    {
      id: "register",
      label: i18n.language === "ru" ? "Регистрация" : i18n.language === "uzc" ? "Рўйхатдан ўтиш" : "Ro'yxatdan o'tish",
      icon: IconUserPlus,
      active: isRegisterActive,
      onClick: () => navigate("/auth/register"),
    },
    {
      id: "qr",
      label: i18n.language === "ru" ? "Вход по QR-коду" : i18n.language === "uzc" ? "QR орқали кириш" : "QR orqali kirish",
      icon: IconQrcode,
      active: isQrActive,
      onClick: () => navigate("/auth/login?tab=qr"),
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: IconBrandTelegram,
      active: isTelegramActive,
      onClick: () => navigate("/auth/login?tab=telegram"),
    },
  ];

  return (
    <AppShell
      header={{ height: 54 }}
      padding={0}
      style={{ height: "100%", minHeight: "100%", background: "var(--bg)" }}
    >
      <AppShell.Header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--card-bg)",
        }}
      >
        <Container h="100%" fluid px="lg">
          <Group h="100%" justify="space-between" wrap="nowrap">
            {/* Left: Brand Logo */}
            <Group
              gap="xs"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/me")}
            >
              <img
                src="/logo.png"
                width={30}
                height={30}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.svg";
                }}
                alt="Prava"
              />
              <Text
                fw={800}
                fz="md"
                style={{
                  letterSpacing: "0.5px",
                  color: "var(--text)",
                }}
              >
                PRAVA<span style={{ color: "#0284c7" }}>ONLINE</span>
              </Text>
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
            padding: "2rem 1rem",
          }}
        >
          <Suspense fallback={<RouteContentFallback />}>
            {isLanguagePage ? (
              <Outlet />
            ) : (
              /* Desktop Auth Container with Blue Sidebar matching media_1789500791344.jpg */
              <Box
                className="desktop-auth-card"
                style={{
                  display: "flex",
                  width: "100%",
                  maxWidth: 820,
                  minHeight: 520,
                  borderRadius: 24,
                  overflow: "hidden",
                  boxShadow: "0 16px 48px rgba(10, 37, 64, 0.12)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card-bg, #ffffff)",
                }}
              >
                {/* Left Blue Sidebar (#0284c7) */}
                <Box
                  style={{
                    width: 260,
                    backgroundColor: "#0284c7",
                    padding: "32px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Stack gap={24}>
                    {/* Brand in Sidebar */}
                    <Stack align="center" gap={10}>
                      <Box
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <SteeringWheelLogo size={30} />
                      </Box>
                      <Text
                        fw={800}
                        fz={16}
                        c="#ffffff"
                        style={{ letterSpacing: "0.8px" }}
                      >
                        PRAVA ONLINE
                      </Text>
                    </Stack>

                    {/* Navigation Items */}
                    <Stack gap={8} mt={12}>
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
                              borderRadius: 12,
                              transition: "all 0.18s ease",
                              backgroundColor: item.active
                                ? "rgba(255, 255, 255, 0.22)"
                                : "transparent",
                              color: "#ffffff",
                              fontWeight: item.active ? 700 : 500,
                              fontSize: 14,
                            }}
                          >
                            <Icon size={19} stroke={item.active ? 2.4 : 1.8} />
                            <span>{item.label}</span>
                          </UnstyledButton>
                        );
                      })}
                    </Stack>
                  </Stack>

                  {/* Sidebar Footer badge */}
                  <Box
                    style={{
                      padding: "12px",
                      borderRadius: 12,
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      textAlign: "center",
                    }}
                  >
                    <Text fz={11} c="rgba(255, 255, 255, 0.9)" fw={500}>
                      🛡 {i18n.language === "ru" ? "Безопасное соединение" : i18n.language === "uzc" ? "Хавфсиз уланиш" : "Xavfsiz ulanish"}
                    </Text>
                  </Box>
                </Box>

                {/* Right Content Area */}
                <Box
                  style={{
                    flex: 1,
                    padding: "36px 36px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    backgroundColor: "var(--card-bg, #ffffff)",
                  }}
                >
                  <Outlet />
                </Box>
              </Box>
            )}
          </Suspense>
        </div>
      </AppShell.Main>
    </AppShell>
  );
};

export default DesktopAuthLayout;
