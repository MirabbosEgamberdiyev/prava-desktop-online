import React from "react";
import { Title, Text, Group, Stack } from "@mantine/core";
import { IconArrowRight, IconShieldCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { prefetchRoute } from "@/utils/routePrefetch";
import classes from "./Home.module.css";

export const CTA_Section = React.memo(() => {
  const { t } = useTranslation();

  return (
    <section className={classes.ctaSection} aria-label="Call to Action">
      <div className={classes.ctaCard}>
        <Stack align="center" gap="xs" maw={680} mx="auto">
          <div className="saas-badge-pill" style={{ marginBottom: 8 }}>
            <IconShieldCheck size={14} />
            <span>{t("home.trust.badge", "O'zbekiston bo'yicha #1 tanlov")}</span>
          </div>

          <Title order={2} className={classes.ctaTitle}>
            {t("home.cta.title", "Hoziroq boshlang!")}
          </Title>

          <Text className={classes.ctaDescription}>
            {t(
              "home.cta.description",
              "Minglab foydalanuvchilarga qo'shiling va haydovchilik guvohnomasiga eng yaxshi tarzda tayyorlaning."
            )}
          </Text>

          <Group justify="center" gap="md" wrap="wrap">
            <Link
              to="/auth/register"
              className="saas-btn-primary"
              style={{ padding: "12px 28px", fontSize: "1rem" }}
              onMouseEnter={() => prefetchRoute("/auth/register")}
              onTouchStart={() => prefetchRoute("/auth/register")}
            >
              {t("home.cta.register", "Bepul ro'yxatdan o'tish")}
              <IconArrowRight size={18} />
            </Link>
            <Link
              to="/try-exam"
              className="saas-btn-secondary"
              style={{ padding: "12px 24px", fontSize: "1rem" }}
              onMouseEnter={() => prefetchRoute("/try-exam")}
              onTouchStart={() => prefetchRoute("/try-exam")}
            >
              {t("guestExam.tryFree", "Bepul sinov imtihoni")}
            </Link>
          </Group>
        </Stack>
      </div>
    </section>
  );
});

CTA_Section.displayName = "CTA_Section";

