import React from "react";
import { Box, SimpleGrid, Text, Title, Button, Group, Stack } from "@mantine/core";
import {
  IconCheck,
  IconArrowRight,
  IconBuildingCommunity,
  IconSchool,
  IconTruck,
  IconUserCheck,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

export const Pricing_Preview = React.memo(() => {
  const { t } = useTranslation();

  const solutions = [
    {
      id: "individual",
      badge: t("home.solutionsPreview.card1Badge", "Shaxsiy Ta'lim"),
      name: t("home.solutionsPreview.card1Title", "100% Bepul Kirish"),
      priceTag: t("common.free", "Bepul"),
      desc: t(
        "home.solutionsPreview.card1Desc",
        "Har bir nomzod haydovchi uchun barcha 1200+ rasmiy savollar, 70 ta bilet va xatolar tahlili to'liq ochiq."
      ),
      icon: IconUserCheck,
      features: [
        t("home.solutionsPreview.card1F1", "Barcha 70 ta rasmiy imtihon bileti"),
        t("home.solutionsPreview.card1F2", "20 daqiqalik davlat imtihoni formati"),
        t("home.solutionsPreview.card1F3", "Intellektual xatolar ustida ishlash"),
        t("home.solutionsPreview.card1F4", "Cheksiz Marafon va yo'l belgilari"),
      ],
      ctaText: t("home.solutionsPreview.card1Btn", "Bepul boshlash"),
      ctaLink: "/try-exam",
      popular: false,
      variant: "outline" as const,
    },
    {
      id: "schools",
      badge: t("home.solutionsPreview.card2Badge", "Ta'lim Muassasalari"),
      name: t("home.solutionsPreview.card2Title", "Avtomaktablar uchun Desktop"),
      priceTag: t("home.solutionsPreview.card2Price", "Offline Majmua"),
      desc: t(
        "home.solutionsPreview.card2Desc",
        "Kompyuter sinflari uchun internetsiz ishlovchi, F1–F5 klaviatura boshqaruviga ega professional majmua."
      ),
      icon: IconSchool,
      features: [
        t("home.solutionsPreview.card2F1", "100% offline — internetsiz sinflar"),
        t("home.solutionsPreview.card2F2", "O'qituvchi va nazoratchi monitori"),
        t("home.solutionsPreview.card2F3", "Guruhlar va o'quvchilar reytingi"),
        t("home.solutionsPreview.card2F4", "Lokal tarmoq (LAN) integratsiyasi"),
      ],
      ctaText: t("home.solutionsPreview.card2Btn", "Hamkorlik shartlari"),
      ctaLink: "/partners",
      popular: true,
      variant: "filled" as const,
    },
    {
      id: "corporate",
      badge: t("home.solutionsPreview.card3Badge", "Tashkilotlar"),
      name: t("home.solutionsPreview.card3Title", "Korporativ va Davlat Parklari"),
      priceTag: t("home.solutionsPreview.card3Price", "Korporativ SLA"),
      desc: t(
        "home.solutionsPreview.card3Desc",
        "Kompaniyalar va logistika parklari haydovchilarini davriy attestatsiyadan o'tkazish va yo'l xavfsizligini ta'minlash."
      ),
      icon: IconTruck,
      features: [
        t("home.solutionsPreview.card3F1", "Haydovchilar bilimini davriy attestatsiya qilish"),
        t("home.solutionsPreview.card3F2", "Korporativ hisobotlar va eksport"),
        t("home.solutionsPreview.card3F3", "Yopiq xavfsiz tarmoqda ishlash"),
        t("home.solutionsPreview.card3F4", "Alohida korporativ texnik xizmat"),
      ],
      ctaText: t("home.solutionsPreview.card3Btn", "Konsultatsiya olish"),
      ctaLink: "/partners",
      popular: false,
      variant: "light" as const,
    },
  ];

  return (
    <section className={classes.pricingPreviewSection} aria-label="Solutions and Partnerships">
      <Box className={classes.sectionTitle}>
        <div className={classes.sectionBadge}>
          <IconBuildingCommunity size={14} />
          {t("home.solutionsPreview.badge", "Ekotizim va Hamkorlik")}
        </div>
        <Title order={2}>
          {t("home.solutionsPreview.title", "Har bir foydalanuvchi va ta'lim muassasasi uchun qulay format")}
        </Title>
        <Text size="md" c="var(--text-muted)" mt="sm" maw={720} mx="auto" lh={1.6}>
          {t(
            "home.solutionsPreview.subtitle",
            "Bo'lajak haydovchilar uchun 100% bepul individual tayyorgarlik, avtomaktablar va o'quv markazlari uchun mustaqil offline desktop infratuzilmasi."
          )}
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl" mt={40}>
        {solutions.map((item) => (
          <div
            key={item.id}
            className={`${classes.pricingPreviewCard} ${
              item.popular ? classes.pricingPreviewCardPopular : ""
            }`}
          >
            {item.popular && (
              <div className={classes.popularPill}>
                {t("home.solutionsPreview.popularPill", "Tavsiya etiladi")}
              </div>
            )}

            <Group justify="space-between" align="center" mb={6}>
              <Text size="xs" fw={700} c="var(--primary)" tt="uppercase" style={{ letterSpacing: "0.5px" }}>
                {item.badge}
              </Text>
            </Group>

            <Text fw={700} size="lg" c="var(--text)">
              {item.name}
            </Text>
            <Text size="xs" c="var(--text-muted)" mt={4}>
              {item.desc}
            </Text>

            <div className={classes.pricingPriceTag}>
              {item.priceTag}
            </div>

            <Stack gap="xs" my="lg" style={{ flex: 1 }}>
              {item.features.map((feat, idx) => (
                <Group key={idx} gap="xs" align="flex-start" wrap="nowrap">
                  <IconCheck size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <Text size="sm" c="var(--text)" lh={1.4}>
                    {feat}
                  </Text>
                </Group>
              ))}
            </Stack>

            <Link to={item.ctaLink} style={{ width: "100%", textDecoration: "none" }}>
              <Button
                fullWidth
                size="md"
                radius="md"
                variant={item.variant}
                color={item.popular ? "blue" : "gray"}
                className={item.popular ? "saas-btn-primary" : undefined}
                rightSection={<IconArrowRight size={16} />}
              >
                {item.ctaText}
              </Button>
            </Link>
          </div>
        ))}
      </SimpleGrid>

      <Group justify="center" mt="xl">
        <Link to="/partners">
          <Button variant="subtle" color="blue" rightSection={<IconArrowRight size={16} />}>
            {t("home.solutionsPreview.viewEnterprise", "Korporativ imkoniyatlar haqida batafsil")}
          </Button>
        </Link>
      </Group>
    </section>
  );
});

Pricing_Preview.displayName = "Pricing_Preview";
