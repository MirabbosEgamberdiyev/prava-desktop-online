import { Box, Text, Title, Accordion, ThemeIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

const faqKeys = [
  { questionKey: "home.faq.q1", answerKey: "home.faq.a1" },
  { questionKey: "home.faq.q2", answerKey: "home.faq.a2" },
  { questionKey: "home.faq.q3", answerKey: "home.faq.a3" },
  { questionKey: "home.faq.q4", answerKey: "home.faq.a4" },
  { questionKey: "home.faq.q5", answerKey: "home.faq.a5" },
  { questionKey: "home.faq.q6", answerKey: "home.faq.a6" },
];

function FAQStructuredData({ t }: { t: (key: string) => string }) {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqKeys.map((item) => ({
      "@type": "Question",
      name: t(item.questionKey),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(item.answerKey),
      },
    })),
  };

  // U2: "<" belgilari escape qilinadi — aks holda tarjima matnida "</script>"
  // ketma-ketligi bo'lib qolsa, brauzer HTML parseri script tegini muddatidan
  // oldin yopib, keyingi kontentni skript sifatida talqin qilishi mumkin edi.
  const json = JSON.stringify(faqData).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

export function FAQ_Section() {
  const { t } = useTranslation();

  return (
    <section className={classes.faqSection} aria-label="FAQ">
      <FAQStructuredData t={t} />
      <Box className={classes.sectionTitle}>
        <div className={classes.sectionBadge}>
          {t("home.faq.badge", "Savol-Javoblar")}
        </div>
        <Title order={2}>{t("home.faq.title")}</Title>
        <Text size="md" c="dimmed" mt="sm">
          {t("home.faq.description")}
        </Text>
      </Box>

      <Box maw={800} mx="auto">
        <Accordion
          variant="separated"
          radius="lg"
          chevronPosition="right"
          defaultValue={null}
          chevron={
            <ThemeIcon variant="light" radius="xl" size="sm">
              <IconPlus size={14} />
            </ThemeIcon>
          }
          styles={{
            chevron: {
              "&[data-rotate]": {
                transform: "rotate(45deg)",
              },
            },
          }}
        >
          {faqKeys.map((item, index) => (
            <Accordion.Item
              key={index}
              value={`item-${index}`}
              className={classes.faqItem}
            >
              <Accordion.Control>
                <Text fw={500} size="md">
                  {t(item.questionKey)}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed" lh={1.8}>
                  {t(item.answerKey)}
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Box>
    </section>
  );
}
