import { Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppShell, Container, Group, Text } from "@mantine/core";
import LanguagePicker from "../components/language/LanguagePicker";
import ColorMode from "../components/other/ColorMode";
import { RouteContentFallback } from "../components/common/RouteContentFallback";

export const DesktopAuthLayout = () => {
  const navigate = useNavigate();

  return (
    <AppShell
      header={{ height: 58 }}
      padding={0}
      style={{ minHeight: "100vh", background: "var(--bg)" }}
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
                width={32}
                height={32}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.svg";
                }}
                alt="Prava"
              />
              <Text
                fw={800}
                fz="lg"
                style={{
                  letterSpacing: "0.5px",
                  color: "var(--text)",
                }}
              >
                PRAVA<span style={{ color: "var(--primary)" }}>ONLINE</span>
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
          minHeight: "calc(100vh - 58px)",
          background: "var(--bg)",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: "2rem",
            paddingBottom: "2rem",
          }}
        >
          <Suspense fallback={<RouteContentFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </AppShell.Main>
    </AppShell>
  );
};

export default DesktopAuthLayout;
