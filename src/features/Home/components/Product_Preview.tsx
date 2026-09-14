import { useState } from "react";
import {
  Box,
  Text,
  Title,
  Group,
  Badge,
  Button,
  SimpleGrid,
  ThemeIcon,
  Progress,
} from "@mantine/core";
import {
  IconDeviceDesktopAnalytics,
  IconAlertCircle,
  IconChartBar,
  IconSignLeft,
  IconCheck,
  IconClock,
  IconArrowRight,
  IconSparkles,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

type TabKey = "exam" | "errors" | "stats" | "signs";

export function Product_Preview() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("exam");
  const [selectedOption, setSelectedOption] = useState<number | null>(2); // Default to option 2

  const tabs: { key: TabKey; label: string; icon: typeof IconDeviceDesktopAnalytics }[] = [
    { key: "exam", label: t("home.preview.tabExam", "Imtihon Simulyatori"), icon: IconDeviceDesktopAnalytics },
    { key: "errors", label: t("home.preview.tabErrors", "Xatolar Tahlili"), icon: IconAlertCircle },
    { key: "stats", label: t("home.preview.tabStats", "Shaxsiy Statistika"), icon: IconChartBar },
    { key: "signs", label: t("home.preview.tabSigns", "Yo'l Belgilari"), icon: IconSignLeft },
  ];

  return (
    <section className={classes.previewSection} aria-label="Product Showcase">
      <Box className={classes.sectionTitle}>
        <div className={classes.sectionBadge}>
          <IconSparkles size={14} />
          {t("home.preview.badge", "Interaktiv Ko'rinish")}
        </div>
        <Title order={2}>
          {t("home.preview.title", "Zamonaviy interfeys — o'rganish endi oson va maroqli")}
        </Title>
        <Text size="md" c="var(--text-muted)" mt="sm" maw={720} mx="auto" lh={1.6}>
          {t(
            "home.preview.subtitle",
            "Platformaning real imkoniyatlarini hoziroq sinab ko'ring. Barcha asosiy bo'limlar bir joyda."
          )}
        </Text>
      </Box>

      <div className={classes.previewWindow} style={{ marginTop: 40 }}>
        {/* Window Topbar */}
        <div className={classes.previewHeader}>
          <div className={classes.windowDots}>
            <span className={`${classes.windowDot} ${classes.windowDotClose}`} />
            <span className={`${classes.windowDot} ${classes.windowDotMin}`} />
            <span className={`${classes.windowDot} ${classes.windowDotMax}`} />
          </div>
          <Text size="xs" fw={700} c="var(--text-muted)" style={{ letterSpacing: "0.5px" }}>
            PRAVA ONLINE · WEB & DESKTOP SIMULATOR
          </Text>
          <Badge size="xs" variant="light" color="blue">
            LIVE DEMO
          </Badge>
        </div>

        {/* Tab switcher */}
        <div className={classes.previewNavTabs} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`${classes.previewTabBtn} ${
                activeTab === tab.key ? classes.previewTabBtnActive : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon size={17} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Interactive Body */}
        <div className={classes.previewBody}>
          {activeTab === "exam" && (
            <div className={classes.mockExamContainer}>
              <Group justify="space-between" align="center" mb="md" wrap="wrap">
                <Group gap="xs">
                  <Badge color="blue" size="sm" variant="filled">
                    Bilet #14 · Savol 8/20
                  </Badge>
                  <Badge color="gray" size="sm" variant="light">
                    Kategoriya B
                  </Badge>
                </Group>
                <Group gap={6} c="var(--primary)">
                  <IconClock size={16} />
                  <Text size="sm" fw={700}>
                    18:42 qoldi
                  </Text>
                </Group>
              </Group>

              <Text fw={700} size="md" c="var(--text)" mb="lg" lh={1.5}>
                {t(
                  "home.preview.examQuestionDemo",
                  "Chorrahada qaysi transport vositasi birinchi bo'lib o'tadi?"
                )}
              </Text>

              <Box>
                {[
                  { id: 1, text: t("home.preview.examOption1", "Ko'k avtomobil (o'ng qo'l qoidasi)"), correct: false },
                  { id: 2, text: t("home.preview.examOption2", "Qizil avtomobil (asosiy yo'lda)"), correct: true },
                  { id: 3, text: t("home.preview.examOption3", "Bir vaqtda harakatlanadi"), correct: false },
                ].map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  const isCorrect = opt.correct;
                  let optStyle = classes.mockExamOption;
                  if (isSelected && isCorrect) optStyle += ` ${classes.mockExamOptionCorrect}`;

                  return (
                    <div
                      key={opt.id}
                      className={optStyle}
                      onClick={() => setSelectedOption(opt.id)}
                    >
                      <ThemeIcon
                        size={26}
                        radius="xl"
                        variant={isSelected ? "filled" : "outline"}
                        color={isCorrect && isSelected ? "green" : isSelected ? "blue" : "gray"}
                      >
                        {isCorrect && isSelected ? (
                          <IconCheck size={14} stroke={3} />
                        ) : (
                          opt.id
                        )}
                      </ThemeIcon>
                      <Text size="sm" style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                        {opt.text}
                      </Text>
                      {isSelected && isCorrect && (
                        <Badge
                          size="xs"
                          color="green"
                          variant="light"
                          style={{
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            minWidth: "max-content",
                            padding: "0 8px",
                            fontWeight: 700,
                          }}
                        >
                          {t("home.preview.correctBadge", "TO'G'RI ✓")}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </Box>

              {selectedOption === 2 && (
                <Box
                  mt="lg"
                  p="md"
                  style={{
                    borderRadius: 10,
                    background: "rgba(47, 158, 68, 0.08)",
                    border: "1px solid rgba(47, 158, 68, 0.25)",
                  }}
                >
                  <Group gap="xs" mb={4}>
                    <IconCheck size={16} color="var(--success)" />
                    <Text size="xs" fw={700} c="var(--success)">
                      Rasmiy Qoida Izohi:
                    </Text>
                  </Group>
                  <Text size="xs" c="var(--text)" lh={1.5}>
                    {t(
                      "home.preview.examExplanation",
                      "YHQ 13.9-band: Asosiy yo'l belgisi (2.1) bor bo'lgan yo'nalishdagi haydovchi ikkinchi darajali yo'ldan kelayotganlarga nisbatan ustunlikka ega."
                    )}
                  </Text>
                </Box>
              )}
            </div>
          )}

          {activeTab === "errors" && (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Box className={classes.mockExamContainer}>
                <Badge color="red" size="sm" variant="light" mb="xs">
                  Zaif nuqta aniqlandi
                </Badge>
                <Text fw={700} size="sm" mb="sm">
                  Mavzu: Chorrahalarda harakatlanish ustuvorligi
                </Text>
                <Text size="xs" c="var(--text-muted)" mb="md">
                  Siz ushbu mavzuda 3 marta noaniq javob berdingiz. Tizim avtomatik tarzda shaxsiy takrorlash rejasini tuzdi.
                </Text>
                <Progress value={33} color="red" size="sm" radius="xl" mb="xs" />
                <Text size="xs" c="dimmed">
                  Mavzuni o'zlashtirish: 33% (Yana 4 ta savol takrorlanishi kerak)
                </Text>
              </Box>

              <Box className={classes.mockExamContainer}>
                <Badge color="teal" size="sm" variant="light" mb="xs">
                  Intellektual maslahat
                </Badge>
                <Text fw={700} size="sm" mb="sm">
                  Regulyator ishoralari va svetofor
                </Text>
                <Text size="xs" c="var(--text-muted)" mb="md">
                  Regulyatorning qo'l ishoralari har doim svetofor va yo'l belgilaridan ustun turishini esda saqlang!
                </Text>
                <Link to="/try-exam">
                  <Button size="xs" variant="light" color="blue" rightSection={<IconArrowRight size={14} />}>
                    Xatolarni yechish
                  </Button>
                </Link>
              </Box>
            </SimpleGrid>
          )}

          {activeTab === "stats" && (
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
              <Box className={classes.mockExamContainer} style={{ textAlign: "center" }}>
                <Text size="xs" c="var(--text-muted)" fw={700} tt="uppercase">
                  Umumiy Tayyorlik
                </Text>
                <Text size="2.5rem" fw={900} c="var(--primary)" my="xs">
                  94%
                </Text>
                <Badge color="green" variant="light">
                  Imtihonga tayyor
                </Badge>
              </Box>

              <Box className={classes.mockExamContainer} style={{ textAlign: "center" }}>
                <Text size="xs" c="var(--text-muted)" fw={700} tt="uppercase">
                  O'zlashtirilgan Biletlar
                </Text>
                <Text size="2.5rem" fw={900} c="var(--text)" my="xs">
                  68 / 70
                </Text>
                <Badge color="blue" variant="light">
                  97% yakunlandi
                </Badge>
              </Box>

              <Box className={classes.mockExamContainer} style={{ textAlign: "center" }}>
                <Text size="xs" c="var(--text-muted)" fw={700} tt="uppercase">
                  O'rtacha Vaqt
                </Text>
                <Text size="2.5rem" fw={900} c="var(--text)" my="xs">
                  11:20
                </Text>
                <Badge color="teal" variant="light">
                  Juda tez (20 daqiqadan)
                </Badge>
              </Box>
            </SimpleGrid>
          )}

          {activeTab === "signs" && (
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              {[
                { title: "2.1 Asosiy yo'l", cat: "Imtiyoz belgilari", color: "orange" },
                { title: "3.1 Kirish taqiqlangan", cat: "Taqiqlovchi", color: "red" },
                { title: "4.1.1 Harakat to'g'riga", cat: "Buyuruvchi", color: "blue" },
                { title: "5.1 Avtomagistral", cat: "Axborot-ishora", color: "green" },
              ].map((sign, idx) => (
                <Box
                  key={idx}
                  p="md"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    textAlign: "center",
                  }}
                >
                  <Badge color={sign.color} size="xs" variant="light" mb="xs">
                    {sign.cat}
                  </Badge>
                  <Text fw={700} size="sm" c="var(--text)">
                    {sign.title}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Barcha imtihon savollarida uchrash darajasi yuqori
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {/* Action button beneath window preview */}
          <Group justify="center" mt="xl">
            <Link to="/try-exam">
              <Button
                radius="xl"
                size="md"
                className="saas-btn-primary"
                rightSection={<IconArrowRight size={18} />}
              >
                {t("home.preview.tryNow", "Imtihonni Bepul Sinab Ko'rish")}
              </Button>
            </Link>
          </Group>
        </div>
      </div>
    </section>
  );
}
