import {
  ActionIcon,
  Anchor,
  Container,
  Divider,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconBrandTelegram,
  IconBrandInstagram,
  IconBrandYoutube,
  IconPhone,
  IconMail,
} from "@tabler/icons-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDesktopTheme } from "@/context/DesktopThemeContext";
import { prefetchRoute } from "../../utils/routePrefetch";

const Footer = React.memo(() => {
  const { t } = useTranslation();
  const { theme } = useDesktopTheme();
  const isDark = theme === "dark";

  const socialLinks = [
    {
      label: "Telegram",
      href: "https://t.me/pravaonlineuz",
      icon: <IconBrandTelegram size={18} />,
      color: "blue",
    },
    {
      label: "Instagram",
      href: "https://instagram.com/pravaonlineuz",
      icon: <IconBrandInstagram size={18} />,
      color: "grape",
    },
    {
      label: "YouTube",
      href: "https://youtube.com/@pravaonlineuz",
      icon: <IconBrandYoutube size={18} />,
      color: "red",
    },
  ];

  const platformLinks = [
    { label: t("nav.home", "Bosh sahifa"), to: "/" },
    { label: t("nav.corporate", "Hamkorlik"), to: "/partners" },
    { label: t("home.hero.freeExam", "Sinov imtihoni"), to: "/try-exam" },
    { label: t("nav.downloads", "Ilovalar (Desktop & Mobile)"), to: "/downloads" },
  ];

  const companyLinks = [
    { label: t("nav.about", "Biz haqimizda"), to: "/about" },
    { label: t("nav.contact", "Bog'lanish"), to: "/contact" },
    { label: t("footer.faq", "Ko'p so'raladigan savollar"), to: "/faq" },
    {
      label: t("footer.donate", "Loyihani qo'llab-quvvatlash"),
      to: "https://tirikchilik.uz/pravaonline",
      external: true,
    },
  ];

  const legalLinks = [
    { label: t("footer.terms", "Foydalanish shartlari"), to: "/terms" },
    { label: t("footer.privacy", "Maxfiylik siyosati"), to: "/privacy" },
  ];

  return (
    <Paper
      component="footer"
      bg="var(--surface)"
      mt="auto"
      style={{
        borderTop: "1px solid var(--border)",
        transition: "all 0.2s ease",
      }}
    >
      <Container maw={1440} px={{ base: "md", sm: "xl" }} py={{ base: "xl", md: 48 }}>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
          {/* Col 1: Brand & Bio */}
          <Stack gap="sm">
            <Group gap="xs">
              <Image
                src="/logo.svg"
                alt="Prava Online"
                w={32}
                h={32}
                fallbackSrc="/favicon.svg"
              />
              <span className="saas-brand-text" style={{ fontSize: "1.25rem" }}>
                PRAVA<span className="brand-accent">ONLINE</span>
              </span>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              {t("footer.description", "O'zbekistonda haydovchilik guvohnomasi imtihoniga online tayyorlanish platformasi.")}
            </Text>
            <Group gap={6} mt={4}>
              {socialLinks.map((link) => (
                <Tooltip label={link.label} key={link.href}>
                  <ActionIcon
                    component="a"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="subtle"
                    color={link.color}
                    size="lg"
                    radius="md"
                    aria-label={link.label}
                    style={{ minWidth: 38, minHeight: 38 }}
                  >
                    {link.icon}
                  </ActionIcon>
                </Tooltip>
              ))}
            </Group>
          </Stack>

          {/* Col 2: Platform Links */}
          <Stack gap="xs">
            <Text fw={700} size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.5px" }}>
              {t("nav.mainPage", "Platforma")}
            </Text>
            {platformLinks.map((link) => (
              <Anchor
                key={link.to}
                component={Link}
                to={link.to}
                onMouseEnter={() => prefetchRoute(link.to)}
                onFocus={() => prefetchRoute(link.to)}
                size="sm"
                c={isDark ? "gray.4" : "gray.7"}
                underline="hover"
                style={{ fontWeight: 500 }}
              >
                {link.label}
              </Anchor>
            ))}
          </Stack>

          {/* Col 3: Company & Help */}
          <Stack gap="xs">
            <Text fw={700} size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.5px" }}>
              {t("footer.links", "Kompaniya")}
            </Text>
            {companyLinks.map((link) =>
              link.external ? (
                <Anchor
                  key={link.to}
                  href={link.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  c={isDark ? "gray.4" : "gray.7"}
                  underline="hover"
                  style={{ fontWeight: 500 }}
                >
                  {link.label}
                </Anchor>
              ) : (
                <Anchor
                  key={link.to}
                  component={Link}
                  to={link.to}
                  onMouseEnter={() => prefetchRoute(link.to)}
                  onFocus={() => prefetchRoute(link.to)}
                  size="sm"
                  c={isDark ? "gray.4" : "gray.7"}
                  underline="hover"
                  style={{ fontWeight: 500 }}
                >
                  {link.label}
                </Anchor>
              ),
            )}
          </Stack>

          {/* Col 4: Legal & Direct Contact */}
          <Stack gap="xs">
            <Text fw={700} size="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.5px" }}>
              {t("footer.legal", "Huquqiy & Aloqa")}
            </Text>
            {legalLinks.map((link) => (
              <Anchor
                key={link.to}
                component={Link}
                to={link.to}
                onMouseEnter={() => prefetchRoute(link.to)}
                onFocus={() => prefetchRoute(link.to)}
                size="sm"
                c={isDark ? "gray.4" : "gray.7"}
                underline="hover"
                style={{ fontWeight: 500 }}
              >
                {link.label}
              </Anchor>
            ))}

            <Group gap={8} mt={6}>
              <IconPhone size={15} color="var(--mantine-color-blue-5)" />
              <Anchor
                href="tel:+998993912505"
                size="sm"
                c="var(--text)"
                underline="hover"
                style={{ fontWeight: 600 }}
              >
                +998 99 391 25 05
              </Anchor>
            </Group>

            <Group gap={8}>
              <IconMail size={15} color="var(--mantine-color-blue-5)" />
              <Anchor
                href="mailto:support@pravaonline.uz"
                size="sm"
                c="var(--text)"
                underline="hover"
                style={{ fontWeight: 500 }}
              >
                support@pravaonline.uz
              </Anchor>
            </Group>
          </Stack>
        </SimpleGrid>

        <Divider my="xl" color="var(--border)" />

        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <Text size="xs" c="dimmed">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </Text>
          <Text size="xs" c="dimmed">
            {t("footer.basedOnOfficial", "O'zbekiston Respublikasi YHXX rasmiy dasturi asosida")}
          </Text>
        </Group>
      </Container>
    </Paper>
  );
});

Footer.displayName = "Footer";

export default Footer;
