import React from "react";
import {
  AppShell,
  Box,
  Burger,
  Container,
  Group,
  Menu,
  Tooltip,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import LanguagePicker from "../language/LanguagePicker";
import ColorMode from "../other/ColorMode";
import UserMenuButton from "./UserMenuButton";
import { useAuth } from "../../auth/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  IconBrandTelegram,
  IconChevronDown,
  IconHelpCircle,
  IconInfoCircle,
  IconPhoneCall,
} from "@tabler/icons-react";
import { prefetchRoute } from "../../utils/routePrefetch";
import { LicenseBar } from "../desktop/LicenseBar";

export default function Header({
  opened,
  toggle,
}: {
  opened: boolean;
  toggle: () => void;
}) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const primaryNavItems = [
    { label: t("nav.home", "Bosh sahifa"), to: "/" },
    { label: t("nav.corporate", "Hamkorlik"), to: "/partners" },
    {
      label: t("home.hero.freeExam", "Sinov imtihoni"),
      to: "/try-exam",
      badge: t("common.free", "Bepul"),
    },
    { label: t("nav.downloads", "Ilovalar"), to: "/downloads" },
  ];

  const secondaryNavItems = [
    {
      label: t("nav.about", "Biz haqimizda"),
      to: "/about",
      icon: <IconInfoCircle size={15} />,
    },
    {
      label: t("nav.contact", "Bog'lanish"),
      to: "/contact",
      icon: <IconPhoneCall size={15} />,
    },
    {
      label: t("nav.faq", "FAQ"),
      to: "/faq",
      icon: <IconHelpCircle size={15} />,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isSecondaryActive = secondaryNavItems.some((item) => isActive(item.to));

  return (
    <AppShell.Header className="saas-header">
      <Container h="100%" size={1440} px={{ base: "xs", sm: "md", lg: "lg" }} style={{ maxWidth: 1440, width: "100%" }}>
        <div className="saas-header-inner">
          {/* Left: Mobile Burger + Brand */}
          <Group gap="xs" wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
              aria-label={opened ? t("nav.close_menu", "Menyuni yopish") : t("nav.open_menu", "Menyuni ochish")}
            />
            <Link
              to="/"
              className="saas-brand"
              aria-label="Prava Online"
              onMouseEnter={() => prefetchRoute("/")}
              onFocus={() => prefetchRoute("/")}
            >
              <img
                src="/logo.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.svg";
                }}
                alt="Prava Online"
                width={30}
                height={30}
              />
              <span className="saas-brand-text">
                PRAVA<span className="brand-accent">ONLINE</span>
              </span>
            </Link>
          </Group>

          {/* Center: Navigation Links (Desktop) */}
          <nav className="saas-nav-container" aria-label="Asosiy navigatsiya">
            <Group gap={3} visibleFrom="md" wrap="nowrap">
              {/* Primary 4 items - always visible on desktop */}
              {primaryNavItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`saas-nav-link${active ? " active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onMouseEnter={() => prefetchRoute(item.to)}
                    onFocus={() => prefetchRoute(item.to)}
                  >
                    <span>{item.label}</span>
                    {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
                  </Link>
                );
              })}

              {/* Secondary items directly on xl screens (1400px+) */}
              <Group gap={3} visibleFrom="xl" wrap="nowrap">
                {secondaryNavItems.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`saas-nav-link${active ? " active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      onMouseEnter={() => prefetchRoute(item.to)}
                      onFocus={() => prefetchRoute(item.to)}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </Group>

              {/* 'More' dropdown on screens between md and xl (992px - 1400px) */}
              <Box hiddenFrom="xl" visibleFrom="md">
                <Menu
                  shadow="md"
                  width={180}
                  position="bottom-start"
                  radius="md"
                  withinPortal
                >
                  <Menu.Target>
                    <button
                      className={`saas-nav-link saas-nav-dropdown-btn${isSecondaryActive ? " active" : ""}`}
                      type="button"
                      aria-label={t("nav.more", "Yana")}
                    >
                      <span>{t("nav.more", "Yana")}</span>
                      <IconChevronDown size={13} style={{ opacity: 0.6 }} />
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown style={{ padding: 6 }}>
                    {secondaryNavItems.map((item) => {
                      const active = isActive(item.to);
                      return (
                        <Menu.Item
                          key={item.to}
                          component={Link}
                          to={item.to}
                          leftSection={item.icon}
                          style={{
                            fontWeight: active ? 600 : 500,
                            color: active ? "var(--primary)" : "var(--text)",
                            backgroundColor: active ? "var(--primary-light)" : undefined,
                            borderRadius: 6,
                            fontSize: "13px",
                            padding: "8px 12px",
                          }}
                        >
                          {item.label}
                        </Menu.Item>
                      );
                    })}
                  </Menu.Dropdown>
                </Menu>
              </Box>
            </Group>
          </nav>

          {/* Right: Social + Theme + Language + Auth */}
          <Group gap={6} wrap="nowrap" align="center" style={{ flexShrink: 0 }} className="saas-header-right">
            <Box visibleFrom="lg">
              <Tooltip label="Telegram" position="bottom" withArrow>
                <a
                  href="https://t.me/pravaonlineuz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="header-control-icon-btn"
                  aria-label="Telegram kanalimiz"
                >
                  <IconBrandTelegram size={17} color="#0088cc" stroke={1.8} />
                </a>
              </Tooltip>
            </Box>

            <LicenseBar />
            <ColorMode />
            <LanguagePicker />

            <div className="navbar-divider" aria-hidden="true" />

            {isAuthenticated ? (
              <UserMenuButton />
            ) : (
              <Group gap={6} wrap="nowrap" visibleFrom="xs">
                <Link
                  to="/auth/login"
                  className="saas-btn-ghost"
                  onMouseEnter={() => prefetchRoute("/auth/login")}
                  onFocus={() => prefetchRoute("/auth/login")}
                >
                  {t("nav.login_btn", "Kirish")}
                </Link>
                <Link
                  to="/auth/register"
                  className="saas-btn-primary"
                  onMouseEnter={() => prefetchRoute("/auth/register")}
                  onFocus={() => prefetchRoute("/auth/register")}
                >
                  {t("nav.signup_btn", "Ro'yxatdan o'tish")}
                </Link>
              </Group>
            )}
          </Group>
        </div>
      </Container>
    </AppShell.Header>
  );
}

export const MemoizedHeader = React.memo(Header);
