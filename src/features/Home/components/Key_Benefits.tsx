import React from "react";
import { Box, SimpleGrid, Text, Title } from "@mantine/core";
import {
  IconDeviceDesktopAnalytics,
  IconBrain,
  IconFlame,
  IconDevices,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

export const Key_Benefits = React.memo(() => {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: IconDeviceDesktopAnalytics,
      title: t("home.benefits.b1Title", "Haqiqiy YHXX Imtihon Simulyatori"),
      desc: t(
        "home.benefits.b1Desc",
        "20 daqiqa, 20 savol, rasmiy vaqt hisobi va klaviatura tezkor tugmalari (F1-F5). Davlat imtihon markazidagi kabi to'liq muhit."
      ),
      color: "var(--primary)",
      bg: "var(--primary-light)",
    },
    {
      icon: IconBrain,
      title: t("home.benefits.b2Title", "Intellektual Xatolar Tahlili"),
      desc: t(
        "home.benefits.b2Desc",
        "Tizim har bir noto'g'ri javobingizni eslab qoladi va Yo'l harakati qoidalarining tegishli moddasi bilan batafsil tushuntirib beradi."
      ),
      color: "var(--success)",
      bg: "rgba(47, 158, 68, 0.12)",
    },
    {
      icon: IconFlame,
      title: t("home.benefits.b3Title", "Cheksiz Marafon Rejimi"),
      desc: t(
        "home.benefits.b3Desc",
        "Barcha 1200+ savollarni to'xtovsiz, birin-ketin yechish imkoniyati. Bitta xato qilsangiz ham zaif joyingizni darhol ko'rsatadi."
      ),
      color: "#e67700",
      bg: "rgba(230, 119, 0, 0.12)",
    },
    {
      icon: IconDevices,
      title: t("home.benefits.b4Title", "Har qanday Qurilmada va Offline"),
      desc: t(
        "home.benefits.b4Desc",
        "Kompyuter (Windows), Android telefon yoki veb orqali istalgan joyda mashq qiling. Windows ilovasi internetsiz to'liq ishlaydi."
      ),
      color: "#7950f2",
      bg: "rgba(121, 80, 242, 0.12)",
    },
  ];

  return (
    <section className={classes.benefitsSection} aria-label="Key Benefits">
      <Box className={classes.sectionTitle}>
        <div className={classes.sectionBadge}>
          {t("home.benefits.badge", "Nima uchun Prava Online?")}
        </div>
        <Title order={2}>
          {t("home.benefits.title", "Davlat imtihonini birinchi urinishda topshirish siri")}
        </Title>
        <Text size="md" c="var(--text-muted)" mt="sm" maw={720} mx="auto" lh={1.6}>
          {t(
            "home.benefits.subtitle",
            "Platformamiz shunchaki test emas — u xatolaringizni intellektual tahlil qiluvchi va sizni haqiqiy imtihon hayajonidan xalos etuvchi to'liq ekotizimdir."
          )}
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xl" mt={40}>
        {benefits.map((benefit, idx) => (
          <div key={idx} className={benefitCardClass(idx)}>
            <div
              className={classes.benefitIconBox}
              style={{ backgroundColor: benefit.bg, color: benefit.color }}
            >
              <benefit.icon size={28} stroke={1.8} />
            </div>
            <Text fw={700} size="md" c="var(--text)" mb="xs" lh={1.3}>
              {benefit.title}
            </Text>
            <Text size="sm" c="var(--text-muted)" lh={1.6} style={{ flex: 1 }}>
              {benefit.desc}
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </section>
  );
});

function benefitCardClass(_index: number) {
  return classes.benefitCard;
}

Key_Benefits.displayName = "Key_Benefits";
