import { useState, useMemo, useEffect } from "react";
import {
  Accordion,
  ActionIcon,
  Box,
  Center,
  Group,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconSearch,
  IconPlus,
  IconHelpCircle,
  IconMessageCircleQuestion,
  IconArrowRight,
  IconBrandTelegram,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "../../components/common/SEO";

interface FAQItem {
  id: string;
  category: "exam" | "payment" | "app" | "account";
  question: string;
  answer: string;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return <>{text}</>;
  try {
    const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              style={{
                backgroundColor: "rgba(34, 139, 230, 0.25)",
                color: "inherit",
                borderRadius: "3px",
                padding: "1px 3px",
                fontWeight: 700,
              }}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

export default function FAQ_Page() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  const faqs: FAQItem[] = useMemo(
    () => [
      // Imtihon
      {
        id: "exam-1",
        category: "exam",
        question: t("faq.q1", "Savollar haqiqiy YHXBB imtihonidagiga 100% mos keladimi?"),
        answer: t(
          "faq.a1",
          "Ha, bizning barcha 1200+ savollarimiz O'zbekiston Respublikasi IIV YHXXning 2026-yilgi amaldagi standartlariga va rasmiy test bazasiga to'liq asoslangan. Savol rasmlari, matnlari va javob variantlari haqiqiy imtihon kabi shakllantirilgan."
        ),
      },
      {
        id: "exam-2",
        category: "exam",
        question: t("faq.q2", "Imtihondan o'tish shartlari qanday?"),
        answer: t(
          "faq.a2",
          "Haqiqiy imtihondagi kabi 20 ta savolga 20 daqiqa vaqt beriladi. O'tish uchun kamida 18 ta savolga (90%) to'g'ri javob berishingiz kerak, ya'ni maksimal 2 tagacha xatoga yo'l qo'yiladi."
        ),
      },
      {
        id: "exam-3",
        category: "exam",
        question: t("faq.q3", "F1–F5 tugmalari orqali ishlash imkoni bormi?"),
        answer: t(
          "faq.a3",
          "Ha! Haqiqiy YHXBB imtihon markazlarida klaviaturaning F1–F5 tugmalari orqali javob tanlanadi. Platformamizda va Desktop dasturimizda ham bu funksiya to'liq ishlaydi, bu esa imtihon oldidan qo'lingizni o'rgatishga yordam beradi."
        ),
      },
      {
        id: "exam-4",
        category: "exam",
        question: t("faq.q4", "Marafon rejimi nima va u qanday ishlaydi?"),
        answer: t(
          "faq.a4",
          "Marafon rejimida bazadagi barcha 1200 ta savol ketma-ket, to'xtovsiz beriladi. Bu sizga butun kurs bo'yicha bilimlaringizni sinovdan o'tkazish va zaif savollarni bir joyda aniqlash imkonini beradi."
        ),
      },
      {
        id: "exam-5",
        category: "exam",
        question: t("faq.q12", "Xatolar ustida ishlash bo'limi qanday yordam beradi?"),
        answer: t(
          "faq.a12",
          "Har qanday test yoki bilet yechish paytida noto'g'ri belgilangan savollaringiz avtomatik tarzda 'Xatolar' daftarchasiga yozib boriladi. Siz barcha xatolaringizni alohida qayta yechib, ularning to'g'ri qoidasini mustahkamlashingiz mumkin."
        ),
      },
      // To'lov
      {
        id: "pay-1",
        category: "payment",
        question: t("faq.q5", "To'lov usullari qanday?"),
        answer: t(
          "faq.a5",
          "Click, Payme, Uzum Bank va barcha Humo, Uzcard hamda Visa/Mastercard kartalari orqali to'lov qilishingiz mumkin. To'lov amalga oshishi bilanoq profilingizda premium imkoniyatlar avtomatik tarzda ochiladi."
        ),
      },
      {
        id: "pay-2",
        category: "payment",
        question: t("faq.q6", "Bepul foydalanish imkoniyati bormi?"),
        answer: t(
          "faq.a6",
          "Ha! Har bir yangi foydalanuvchi platformani sinab ko'rishi uchun 1 ta bepul to'liq sinov imtihoni va asosiy yo'l harakati belgilari bo'yicha erkin mashq qilish imkoniyati beriladi."
        ),
      },
      {
        id: "pay-3",
        category: "payment",
        question: t("faq.q7", "Aktivatsiya kodi nima va uni qayerdan olsam bo'ladi?"),
        answer: t(
          "faq.a7",
          "Aktivatsiya kodi — bu maxsus promo-kod bo'lib, uni hamkor avtomaktablardan yoki aksiyalarimiz orqali olishingiz mumkin. Kodni shaxsiy kabinet sozlamalarida kiritish orqali tarifni faollashtirasiz."
        ),
      },
      // Ilovalar & Offline
      {
        id: "app-1",
        category: "app",
        question: t("faq.q8", "Internet yo'q paytda ham ishlatish mumkinmi?"),
        answer: t(
          "faq.a8",
          "Ha! Bizning kompyuterlar uchun mo'ljallangan Prava Desktop (Windows) ilovamiz to'liq offline rejimda ishlaydi. Barcha savollar bazasi kompyuteringizga yuklanadi va internet talab qilinmaydi."
        ),
      },
      {
        id: "app-2",
        category: "app",
        question: t("faq.q9", "Telefon orqali kirsa bo'ladimi?"),
        answer: t(
          "faq.a9",
          "Albatta! Saytimiz barcha smartfon va planshetlar uchun to'liq moslashtirilgan. Shuningdek, Google Play dan Android ilovamizni yoki Safari/Chrome orqali PWA ilovasini o'rnatishingiz mumkin."
        ),
      },
      // Akkaunt
      {
        id: "acc-1",
        category: "account",
        question: t("faq.q10", "Google yoki Telegram orqali ro'yxatdan o'tish mumkinmi?"),
        answer: t(
          "faq.a10",
          "Ha, siz Google akkauntingiz yoki Telegram botimiz orqali birgina tugmani bosib, hech qanday qo'shimcha parol eslab qolmasdan tizimga tez va xavfsiz kirishingiz mumkin."
        ),
      },
      {
        id: "acc-2",
        category: "account",
        question: t("faq.q11", "Statistikam saqlanib qoladimi?"),
        answer: t(
          "faq.a11",
          "Barcha yechilgan testlaringiz, xatolar ro'yxati va erishilgan natijalar profilingizda xavfsiz saqlanadi. Istalgan qurilmadan (kompyuter, telefon, planshet) kirganingizda profilingiz sinxronlashadi."
        ),
      },
    ],
    [t]
  );

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      const matchCategory = activeTab === "all" || item.category === activeTab;
      const query = debouncedSearch.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query);
      return matchCategory && matchSearch;
    });
  }, [faqs, activeTab, debouncedSearch]);

  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <>
      <SEO
        title="Ko'p so'raladigan savollar (FAQ) — Prava Online"
        description="Prava Online haydovchilik imtihoni platformasi bo'yicha eng ko'p beriladigan savollarga javoblar. Imtihon tartibi, to'lovlar, ilovalar va akkaunt."
        keywords="prava online faq, haydovchilik imtihoni savollar javoblar, prava test qanday ishlaydi, YHXBB imtihon qoidalari"
        canonical="/faq"
        jsonLd={jsonLdData}
      />

      <div className="saas-page-container">
        {/* Header Block */}
        <div className="saas-header-block">
          <div className="saas-badge-pill">
            <IconSparkles size={13} />
            <span>{t("faq.badge", "Ma'lumotlar markazi")}</span>
          </div>
          <h1 className="saas-page-title">{t("faq.pageTitle", "Ko'p so'raladigan savollar")}</h1>
          <p className="saas-page-subtitle">
            {t(
              "faq.pageSub",
              "Sizni qiziqtirgan savolga javob toping yoki bevosita mutaxassislarimiz bilan bog'laning."
            )}
          </p>

          {/* Search Input */}
          <Box w="100%" maw={520} mt="sm">
            <TextInput
              placeholder={t("faq.searchPlaceholder", "Savolingizni qidiring...")}
              size="md"
              radius="xl"
              leftSection={<IconSearch size={18} />}
              rightSection={
                search ? (
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="gray"
                    onClick={() => setSearch("")}
                    aria-label={t("common.clear", "Tozalash")}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                ) : null
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("faq.searchPlaceholder", "Savolingizni qidiring...")}
            />
          </Box>
        </div>

        {/* Categories Tabs */}
        <Tabs
          value={activeTab}
          onChange={(v) => setActiveTab(v || "all")}
          variant="pills"
          radius="xl"
          mb="xl"
        >
          <Tabs.List justify="center" style={{ flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
            <Tabs.Tab value="all">{t("faq.tabAll", "Barchasi")}</Tabs.Tab>
            <Tabs.Tab value="exam">{t("faq.tabExam", "Imtihon")}</Tabs.Tab>
            <Tabs.Tab value="payment">{t("faq.tabPayment", "To'lov va Tariflar")}</Tabs.Tab>
            <Tabs.Tab value="app">{t("faq.tabApp", "Ilovalar va Offline")}</Tabs.Tab>
            <Tabs.Tab value="account">{t("faq.tabAccount", "Akkaunt")}</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Questions Accordion */}
        <Box maw={860} mx="auto" mb={64}>
          {filteredFaqs.length === 0 ? (
            <Center py={64}>
              <Stack align="center" gap="xs">
                <IconHelpCircle size={48} color="var(--text-muted)" style={{ opacity: 0.4 }} />
                <Text c="dimmed" size="md">
                  {t("faq.notFound", "Savol topilmadi. Qidiruv so'zini o'zgartirib ko'ring.")}
                </Text>
              </Stack>
            </Center>
          ) : (
            <Accordion
              variant="separated"
              radius="md"
              chevronPosition="right"
              defaultValue={filteredFaqs[0]?.id}
              chevron={
                <ThemeIcon variant="light" radius="xl" size="sm">
                  <IconPlus size={14} />
                </ThemeIcon>
              }
            >
              {filteredFaqs.map((faq) => (
                <Accordion.Item
                  key={faq.id}
                  value={faq.id}
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    boxShadow: "var(--card-shadow-sm)",
                    borderRadius: "var(--radius-md, 16px)",
                    marginBottom: 12,
                    overflow: "hidden",
                  }}
                >
                  <Accordion.Control style={{ fontSize: 15, fontWeight: 600 }}>
                    <HighlightMatch text={faq.question} query={debouncedSearch} />
                  </Accordion.Control>
                  <Accordion.Panel style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
                    <HighlightMatch text={faq.answer} query={debouncedSearch} />
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Box>

        {/* Still Have Questions Banner */}
        <div
          className="saas-card"
          style={{
            maxWidth: 860,
            margin: "0 auto",
            textAlign: "center",
            padding: "40px 24px",
          }}
        >
          <Stack align="center" gap="xs">
            <ThemeIcon size={48} radius="xl" color="blue" variant="light">
              <IconMessageCircleQuestion size={26} />
            </ThemeIcon>
            <Text fw={700} size="lg">
              {t("faq.stillQuestions", "Savolingizga javob topmadingizmi?")}
            </Text>
            <Text size="sm" c="dimmed" maw={480} lh={1.5}>
              {t(
                "faq.stillQuestionsSub",
                "Bizning qo'llab-quvvatlash guruhimiz sizga yordam berishdan mamnun bo'ladi."
              )}
            </Text>
            <Group gap="sm" mt="xs">
              <Link to="/contact" className="saas-btn-primary">
                {t("contact.title", "Biz bilan bog'laning")}
                <IconArrowRight size={15} />
              </Link>
              <a
                href="https://t.me/pravaonlineuz"
                target="_blank"
                rel="noopener noreferrer"
                className="saas-btn-secondary"
              >
                <IconBrandTelegram size={16} />
                Telegram
              </a>
            </Group>
          </Stack>
        </div>
      </div>
    </>
  );
}
