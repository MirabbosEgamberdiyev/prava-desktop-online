import {
  IconCheck,
  IconDownload,
  IconArrowRight,
  IconStarFilled,
  IconShieldCheck,
} from "@tabler/icons-react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  Image,
  List,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { prefetchRoute } from "@/utils/routePrefetch";
import classes from "./Home.module.css";

export function Hero_Banner() {
  const { t } = useTranslation();

  return (
    <section className={classes.heroSection} aria-label="Hero">
      <Grid columns={20} justify="center" align="center" gutter={{ base: "xl", md: 36, lg: 48 }} style={{ width: "100%" }}>
        {/* Chap qism - Matn (55% on desktop) */}
        <Grid.Col span={{ base: 20, md: 11 }}>
          <Box className={classes.heroContent}>
            <div className={classes.sectionBadge} style={{ marginBottom: 16 }}>
              <IconShieldCheck size={14} stroke={2.5} />
              <span>{t("home.hero.verifiedBadge", "IIV YHXBB 2026-yilgi amaldagi reglamenti asosida")}</span>
            </div>

            <Title order={1} className={classes.heroTitle}>
              {t("home.hero.title")}{" "}
              <span className={classes.heroHighlight}>
                {t("home.hero.highlight")}
              </span>{" "}
              {t("home.hero.titleEnd")}
            </Title>

            <Text className={classes.heroDescription} mt="lg">
              {t("home.hero.description")}
            </Text>

            <List
              mt={24}
              spacing="md"
              size="md"
              className={classes.heroList}
              icon={
                <ThemeIcon size={24} radius="xl" variant="light" color="green">
                  <IconCheck size={14} stroke={2.5} />
                </ThemeIcon>
              }
            >
              <List.Item>
                <Text fw={600} size="sm">{t("home.hero.feature1Title")}</Text>
                <Text size="xs" c="dimmed">
                  {t("home.hero.feature1Desc")}
                </Text>
              </List.Item>
              <List.Item>
                <Text fw={600} size="sm">{t("home.hero.feature2Title")}</Text>
                <Text size="xs" c="dimmed">
                  {t("home.hero.feature2Desc")}
                </Text>
              </List.Item>
              <List.Item>
                <Text fw={600} size="sm">{t("home.hero.feature3Title")}</Text>
                <Text size="xs" c="dimmed">
                  {t("home.hero.feature3Desc")}
                </Text>
              </List.Item>
            </List>

            <Group mt={32} className={classes.heroButtons} gap="md">
              <Link
                to="/try-exam"
                onMouseEnter={() => prefetchRoute("/try-exam")}
                onTouchStart={() => prefetchRoute("/try-exam")}
                style={{ textDecoration: "none" }}
              >
                <Button
                  radius="xl"
                  size="lg"
                  h={50}
                  className={classes.heroButton}
                  style={{
                    background: "var(--primary)",
                    color: "#ffffff",
                    fontWeight: 700,
                    padding: "0 28px",
                    boxShadow: "0 4px 16px rgba(25, 113, 194, 0.35)",
                  }}
                  rightSection={<IconArrowRight size={18} />}
                >
                  {t("guestExam.tryFree", "Bepul sinov imtihoni")}
                </Button>
              </Link>
              <Link
                to="/auth/register"
                onMouseEnter={() => prefetchRoute("/auth/register")}
                onTouchStart={() => prefetchRoute("/auth/register")}
                style={{ textDecoration: "none" }}
              >
                <Button
                  radius="xl"
                  size="lg"
                  h={50}
                  variant="default"
                  style={{
                    fontWeight: 600,
                    padding: "0 24px",
                    borderColor: "var(--border)",
                    background: "var(--card-bg)",
                    color: "var(--text)",
                  }}
                >
                  {t("home.hero.startFree", "Ro'yxatdan o'tish")}
                </Button>
              </Link>
            </Group>

            {/* Social Proof Stars */}
            <Group gap="sm" mt="xl" align="center">
              <Group gap={3} style={{ color: "#f59e0b" }} aria-label="5 yulduz">
                {[...Array(5)].map((_, i) => (
                  <IconStarFilled key={i} size={15} />
                ))}
              </Group>
              <Text size="xs" fw={700} c="var(--text)" className="font-tabular">
                {t("home.hero.ratingLabel", "4.9/5 (12 000+ sharh)")}
              </Text>
              <span style={{ color: "var(--border)" }}>•</span>
              <Text size="xs" c="var(--text-muted)" className="font-tabular">
                {t("home.hero.studentsActive", "50,000+ faol tayyorlanuvchilar")}
              </Text>
            </Group>
          </Box>
        </Grid.Col>

        {/* O'ng qism - Telefon mockup (45% on desktop) */}
        <Grid.Col span={{ base: 20, md: 9 }}>
          <Flex
            justify="center"
            align="center"
            mt={{ base: 40, md: 0 }}
            className={classes.phoneWrapper}
          >
            <Box className={classes.phoneMockup}>
              <Box className={classes.screen}>
                <div style={{ padding: "34px 16px 20px", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                  {/* Status / App Header */}
                  <div>
                    <Group justify="space-between" align="center" mb={12}>
                      <Group gap={6}>
                        <Image src="/logo.svg" alt="Prava" w={22} h={22} fallbackSrc="/favicon.svg" />
                        <Text fw={700} size="xs" c="var(--text)">Prava Online</Text>
                      </Group>
                      <Badge size="xs" color="green" variant="light">
                        {t("preview.statsScoreDemo", "Bilet #14")}
                      </Badge>
                    </Group>

                    {/* Question Card */}
                    <div style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: "14px 12px",
                      marginBottom: 10,
                      boxShadow: "var(--shadow-sm)"
                    }}>
                      <Group justify="space-between" mb={6}>
                        <Text size="10px" fw={700} c="blue.6">
                          {t("home.hero.demoQuestionNumber", "SAVOL 8 / 20")}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {t("home.hero.demoTimeLeft", "18:42 qoldi")}
                        </Text>
                      </Group>
                      <Text size="xs" fw={600} lh={1.4} c="var(--text)" mb={10}>
                        {t(
                          "home.hero.demoQuestionText",
                          "Chorrahada qaysi transport vositasi birinchi bo'lib o'tish huquqiga ega?"
                        )}
                      </Text>

                      {/* Options */}
                      <Stack gap={6}>
                        <div style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--surface-muted)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          <span style={{ fontWeight: 700 }}>A</span>
                          <span>{t("home.hero.demoOptA", "Ko'k avtomobil (o'ng qo'l qoidasi)")}</span>
                        </div>
                        <div style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1.5px solid var(--success)",
                          background: "rgba(47, 158, 68, 0.1)",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--success)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700 }}>B</span>
                            <span>{t("home.hero.demoOptB", "Qizil avtomobil (asosiy yo'lda)")}</span>
                          </div>
                          <IconCheck size={14} stroke={3} />
                        </div>
                        <div style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--surface-muted)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          <span style={{ fontWeight: 700 }}>C</span>
                          <span>{t("home.hero.demoOptC", "Bir vaqtda harakatlanadi")}</span>
                        </div>
                      </Stack>
                    </div>

                    {/* Quick Stat Pill */}
                    <div style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <div>
                        <Text size="10px" c="dimmed">
                          {t("home.hero.demoReadinessLabel", "Imtihonga tayyorlik")}
                        </Text>
                        <Text size="xs" fw={700} c="var(--text)">
                          {t("home.hero.demoSuccessRate", "96% Muvaffaqiyat")}
                        </Text>
                      </div>
                      <Badge color="blue" size="sm" variant="filled">
                        {t("home.hero.demoResultBadge", "A'lo natija")}
                      </Badge>
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div>
                    <Link
                      to="/downloads"
                      onMouseEnter={() => prefetchRoute("/downloads")}
                      onTouchStart={() => prefetchRoute("/downloads")}
                      style={{ width: "100%", textDecoration: "none" }}
                    >
                      <Button
                        leftSection={<IconDownload size={16} />}
                        radius="md"
                        size="sm"
                        fullWidth
                        variant="filled"
                        color="blue"
                      >
                        {t("nav.downloads", "Ilovani yuklab olish")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Box>
              <Box className={classes.homeButton} />
            </Box>
          </Flex>
        </Grid.Col>
      </Grid>
    </section>
  );
}
