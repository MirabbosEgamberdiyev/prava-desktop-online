import React from "react";
import { Box, SimpleGrid, Text } from "@mantine/core";
import {
  IconShieldCheck,
  IconAward,
  IconUsers,
  IconFileCheck,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

export const Trust_Indicators = React.memo(() => {
  const { t } = useTranslation();

  const trustMetrics = [
    {
      icon: IconShieldCheck,
      title: t("home.trust.official", "IIV YHXX Davlat standartlari"),
      desc: t("home.trust.officialDesc", "Rasmiy imtihon dasturi va qonunchilikka 100% mos"),
      color: "var(--primary)",
      bg: "var(--primary-light)",
    },
    {
      icon: IconAward,
      title: t("home.trust.passRate", "99.4% O'tish ko'rsatkichi"),
      desc: t("home.trust.passRateDesc", "O'quvchilarimizning birinchi urinishdagi natijasi"),
      color: "var(--success)",
      bg: "rgba(47, 158, 68, 0.12)",
    },
    {
      icon: IconUsers,
      title: t("home.trust.learners", "50,000+ Muvaffaqiyatli haydovchi"),
      desc: t("home.trust.learnersDesc", "Butun respublika bo'ylab faol tayyorlanuvchilar"),
      color: "#228be6",
      bg: "rgba(34, 139, 230, 0.12)",
    },
    {
      icon: IconFileCheck,
      title: t("home.trust.questions", "1,200+ Akkreditatsiyalangan savol"),
      desc: t("home.trust.questionsDesc", "Har bir savolga rasmiy tushuntirish va izoh"),
      color: "#f59f00",
      bg: "rgba(245, 159, 0, 0.12)",
    },
  ];

  return (
    <section className={classes.trustSection} aria-label="Trust Indicators">
      <div className={classes.trustBar}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xl">
          {trustMetrics.map((item, idx) => (
            <div key={idx} className={classes.trustItem}>
              <div
                className={classes.trustIcon}
                style={{ backgroundColor: item.bg, color: item.color }}
              >
                <item.icon size={26} stroke={1.8} />
              </div>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={700} size="sm" c="var(--text)" lh={1.3}>
                  {item.title}
                </Text>
                <Text size="xs" c="var(--text-muted)" mt={3} lh={1.4}>
                  {item.desc}
                </Text>
              </Box>
            </div>
          ))}
        </SimpleGrid>
      </div>
    </section>
  );
});

Trust_Indicators.displayName = "Trust_Indicators";
