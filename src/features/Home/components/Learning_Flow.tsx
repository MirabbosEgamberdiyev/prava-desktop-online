import React from "react";
import { Box, Text, Title, Group } from "@mantine/core";
import {
  IconBook,
  IconTicket,
  IconAlertTriangle,
  IconTrophy,
  IconRoute,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

export const Learning_Flow = React.memo(() => {
  const { t } = useTranslation();

  const steps = [
    {
      num: "01",
      icon: IconBook,
      title: t("home.learningFlow.step1Title", "1. Mavzularni o'zlashtirish"),
      desc: t(
        "home.learningFlow.step1Desc",
        "Yo'l harakati qoidalarining 33 ta asosiy bobi bo'yicha nazariya va tematik testlar."
      ),
      color: "#228be6",
    },
    {
      num: "02",
      icon: IconTicket,
      title: t("home.learningFlow.step2Title", "2. 70 ta biletni mashq qilish"),
      desc: t(
        "home.learningFlow.step2Desc",
        "Har biri 20 savoldan iborat rasmiy imtihon biletlarini ketma-ket o'rganish."
      ),
      color: "#12b886",
    },
    {
      num: "03",
      icon: IconAlertTriangle,
      title: t("home.learningFlow.step3Title", "3. Xatolar ustida ishlash"),
      desc: t(
        "home.learningFlow.step3Desc",
        "Siz adashgan savollar avtomatik to'planadi. Ularni to'g'ri yechmaguningizcha takrorlaysiz."
      ),
      color: "#f59f00",
    },
    {
      num: "04",
      icon: IconTrophy,
      title: t("home.learningFlow.step4Title", "4. YHXX Davlat Imtihoni"),
      desc: t(
        "home.learningFlow.step4Desc",
        "Real vaqt va qat'iy talablar bilan simulyatsiyadan o'tib, imtihonga 100% tayyor bo'lasiz."
      ),
      color: "#fa5252",
    },
  ];

  return (
    <section className={classes.learningFlowSection} aria-label="Learning Flow">
      <Box className={classes.sectionTitle}>
        <div className={classes.sectionBadge}>
          <IconRoute size={14} />
          {t("home.learningFlow.badge", "O'rganish Bosqichlari")}
        </div>
        <Title order={2}>
          {t("home.learningFlow.title", "Guvohnomaga eltuvchi 4 qadam")}
        </Title>
        <Text size="md" c="var(--text-muted)" mt="sm" maw={720} mx="auto" lh={1.6}>
          {t(
            "home.learningFlow.subtitle",
            "Oddiy nazariyadan tortib, davlat imtihonida 100% ishonch bilan o'tishgacha bo'lgan aniq yo'l xaritasi."
          )}
        </Text>
      </Box>

      <div className={classes.flowGrid} style={{ marginTop: 40 }}>
        {steps.map((step, idx) => (
          <div key={idx} className={classes.flowCard}>
            <Group justify="space-between" align="center" mb="md">
              <div className={classes.flowStepBadge} style={{ backgroundColor: step.color }}>
                {step.num}
              </div>
              <step.icon size={28} color={step.color} stroke={1.6} />
            </Group>
            <Text fw={700} size="md" c="var(--text)" mb="xs" lh={1.3}>
              {step.title}
            </Text>
            <Text size="sm" c="var(--text-muted)" lh={1.6} style={{ flex: 1 }}>
              {step.desc}
            </Text>
          </div>
        ))}
      </div>
    </section>
  );
});

Learning_Flow.displayName = "Learning_Flow";
