import { useAuth } from "@/auth/AuthContext";
import { AppShell, Button, Group, NavLink, ScrollArea, Stack, Box, Text, Badge } from "@mantine/core";
import {
  IconApps,
  IconBrandInstagram,
  IconBrandTelegram,
  IconChevronRight,
  IconHome,
  IconBuildingCommunity,
  IconPencil,
  IconInfoCircle,
  IconPhoneCall,
  IconHelpCircle,
  IconChartBar,
  IconLogout,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import LanguagePicker from "../language/LanguagePicker";
import ColorMode from "../other/ColorMode";
import { prefetchRoute } from "../../utils/routePrefetch";

const Navbar = ({ close }: { close: () => void }) => {
  const { t } = useTranslation();
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();

  const links = [
    { label: t("nav.home", "Bosh sahifa"), to: "/", icon: <IconHome size={18} /> },
    { label: t("nav.corporate", "Hamkorlik"), to: "/partners", icon: <IconBuildingCommunity size={18} /> },
    {
      label: t("home.hero.freeExam", "Sinov imtihoni"),
      to: "/try-exam",
      icon: <IconPencil size={18} />,
      badge: t("common.free", "Bepul"),
    },
    { label: t("nav.downloads", "Ilovalar"), to: "/downloads", icon: <IconApps size={18} /> },
    { label: t("nav.about", "Biz haqimizda"), to: "/about", icon: <IconInfoCircle size={18} /> },
    { label: t("nav.contact", "Bog'lanish"), to: "/contact", icon: <IconPhoneCall size={18} /> },
    { label: t("nav.faq", "FAQ"), to: "/faq", icon: <IconHelpCircle size={18} /> },
  ];

  return (
    <AppShell.Navbar
      py="md"
      px="md"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Mobile Top Controls (Language & Theme) */}
      <Box pb="sm" style={{ borderBottom: "1px solid var(--border)" }}>
        <Group justify="space-between" align="center">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.5px" }}>
            {t("userMenu.settings", "Sozlamalar")}
          </Text>
          <Group gap="xs">
            <ColorMode />
            <LanguagePicker />
          </Group>
        </Group>
      </Box>

      {/* Navigation List */}
      <ScrollArea style={{ flex: 1 }} pt="sm">
        <Stack gap={4}>
          {links.map((link) => {
            const active = link.to === "/" ? location.pathname === "/" : location.pathname.startsWith(link.to);
            return (
              <NavLink
                key={link.to}
                component={Link}
                to={link.to}
                onMouseEnter={() => prefetchRoute(link.to)}
                onFocus={() => prefetchRoute(link.to)}
                onTouchStart={() => prefetchRoute(link.to)}
                label={
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" fw={active ? 700 : 500} c={active ? "var(--primary)" : "var(--text)"}>
                      {link.label}
                    </Text>
                    {link.badge && (
                      <Badge size="xs" color="orange" variant="light" radius="sm">
                        {link.badge}
                      </Badge>
                    )}
                  </Group>
                }
                leftSection={<span style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}>{link.icon}</span>}
                rightSection={<IconChevronRight size={15} style={{ opacity: 0.4 }} />}
                active={active}
                onClick={close}
                styles={{
                  root: {
                    borderRadius: 8,
                    backgroundColor: active ? "var(--primary-light)" : "transparent",
                    transition: "background-color 0.15s ease",
                  },
                }}
              />
            );
          })}

          <Box my={8} style={{ height: 1, backgroundColor: "var(--border)" }} />

          {/* Social Links */}
          <NavLink
            href="https://t.me/pravaonlineuz"
            label="Telegram"
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconBrandTelegram size={18} color="#0088cc" />}
            rightSection={<IconChevronRight size={15} style={{ opacity: 0.4 }} />}
            styles={{ root: { borderRadius: 8 } }}
          />
          <NavLink
            href="https://instagram.com/pravaonlineuz"
            label="Instagram"
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconBrandInstagram size={18} color="#e1306c" />}
            rightSection={<IconChevronRight size={15} style={{ opacity: 0.4 }} />}
            styles={{ root: { borderRadius: 8 } }}
          />
        </Stack>
      </ScrollArea>

      {/* Bottom Auth Section */}
      <Box pt="md" style={{ borderTop: "1px solid var(--border)" }}>
        {isAuthenticated ? (
          <Stack gap="xs">
            <Button
              component={Link}
              to="/me"
              onMouseEnter={() => prefetchRoute("/me")}
              onTouchStart={() => prefetchRoute("/me")}
              fullWidth
              variant="light"
              color="blue"
              radius="md"
              leftSection={<IconChartBar size={16} />}
              onClick={close}
              styles={{ root: { fontWeight: 600 } }}
            >
              {user?.fullName || t("nav.dashboard", "Boshqaruv paneli")}
            </Button>
            <Button
              onClick={() => {
                close();
                logout();
              }}
              fullWidth
              variant="subtle"
              color="red"
              radius="md"
              leftSection={<IconLogout size={16} />}
              size="xs"
            >
              {t("common.logout", "Chiqish")}
            </Button>
          </Stack>
        ) : (
          <Stack gap="xs" w="100%">
            <Button
              component={Link}
              to="/auth/login"
              onMouseEnter={() => prefetchRoute("/auth/login")}
              onTouchStart={() => prefetchRoute("/auth/login")}
              onClick={close}
              variant="default"
              radius="md"
              fullWidth
              h={44}
              styles={{ root: { fontWeight: 600, borderColor: "var(--border)" } }}
            >
              {t("nav.login_btn", "Kirish")}
            </Button>
            <Button
              component={Link}
              to="/auth/register"
              onMouseEnter={() => prefetchRoute("/auth/register")}
              onTouchStart={() => prefetchRoute("/auth/register")}
              onClick={close}
              variant="filled"
              radius="md"
              fullWidth
              h={44}
              className="saas-btn-primary"
              styles={{ root: { fontWeight: 600 } }}
            >
              {t("nav.signup_btn", "Ro'yxatdan o'tish")}
            </Button>
          </Stack>
        )}
      </Box>
    </AppShell.Navbar>
  );
};

export default Navbar;
