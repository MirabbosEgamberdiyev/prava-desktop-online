import {
  Badge,
  Box,
  Divider,
  Flex,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconTarget,
  IconBrain,
  IconDeviceDesktop,
  IconShieldCheck,
  IconArrowRight,
  IconCircleCheck,
  IconSparkles,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "../../components/common/SEO";

export default function About_Page() {
  const { t } = useTranslation();

  const values = [
    {
      icon: IconTarget,
      title: t("about.val1Title", "100% Rasmiy andoza"),
      desc: t(
        "about.val1Desc",
        "Barcha 1200+ test savollari va biletlar O'zbekiston Respublikasi IIV YHXXning amaldagi yo'l harakati qoidalari va imtihon andozalariga to'liq mos keladi."
      ),
      color: "blue",
    },
    {
      icon: IconBrain,
      title: t("about.val2Title", "Intellektual ta'lim"),
      desc: t(
        "about.val2Desc",
        "Har bir noto'g'ri javobingiz tahlil qilinadi va maxsus 'Xatolar ustida ishlash' tizimi orqali zaif mavzularingiz mustahkamlanadi."
      ),
      color: "blue",
    },
    {
      icon: IconDeviceDesktop,
      title: t("about.val3Title", "Online va Offline sinergiya"),
      desc: t(
        "about.val3Desc",
        "Veb-sayt bilan bir qatorda mustaqil ishlaydigan tezkor Desktop ilovamiz yordamida internetsiz kompyuteringizda ham mashq qilishingiz mumkin."
      ),
      color: "blue",
    },
    {
      icon: IconShieldCheck,
      title: t("about.val4Title", "99.4% Muvaffaqiyat ko'rsatkichi"),
      desc: t(
        "about.val4Desc",
        "Barcha 70 ta bilet bo'yicha to'liq tayyorgarlik ko'rgan o'quvchilarimiz haqiqiy davlat imtihonida 20 tadan 18+ to'g'ri javob bilan birinchi urinishda o'tishmoqda."
      ),
      color: "blue",
    },
  ];

  const milestones = [
    { number: "1 200+", label: t("about.stat1", "Rasmiy savollar bazasi") },
    { number: "70", label: t("about.stat2", "Rasmiy imtihon biletlari") },
    { number: "50 000+", label: t("about.stat3", "Muvaffaqiyatli o'quvchilar") },
    { number: "3", label: t("about.stat4", "O'rganish tillari (Lotin, Kirill, Rus)") },
  ];

  const reasons = [
    {
      title: t("about.reason1Title", "Savollarni shunchaki yodlamaysiz — tushunasiz"),
      desc: t(
        "about.reason1Desc",
        "Oddiy test saytlaridan farqli o'laroq, har bir savolda rasmiy YHQ moddasi, batafsil qoida izohi va ko'rgazmali yo'l vaziyatlari tushuntiriladi."
      ),
    },
    {
      title: t("about.reason2Title", "Haqiqiy YHXX imtihon muhiti"),
      desc: t(
        "about.reason2Desc",
        "Davlat markazlaridagi kabi 20 ta savol, 20 daqiqa vaqt nazorati, maksimal 2 tagacha xato chegarasi va F1–F5 klaviatura tezkor tugmalari orqali mashq qilasiz."
      ),
    },
    {
      title: t("about.reason3Title", "Intellektual xatolar tahlili"),
      desc: t(
        "about.reason3Desc",
        "Tizim siz adashgan savollarni alohida 'Xatolar' daftarchasiga jamlaydi va zaif tomonlaringizni 100% o'zlashtirmaguningizcha mashq qildiradi."
      ),
    },
    {
      title: t("about.reason4Title", "Barcha qurilmalarda sinxron"),
      desc: t(
        "about.reason4Desc",
        "Telefoningizda boshlagan biletni kompyuterda davom ettiring. Windows, Android, iOS va Web ekotizimi orqali har joyda tayyorlaning."
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Biz haqimizda — Prava Online professional ta'lim platformasi"
        description="Prava Online — O'zbekistonda haydovchilik guvohnomasi imtihoniga tayyorlanishning eng ilg'or, ishonchli va to'liq raqamli ekotizimi. Bizning missiyamiz va afzalliklarimiz."
        keywords="prava online biz haqimizda, haydovchilik maktabi test, avtomaktab prava uz, YHXBB imtihon tayyorgarlik"
        canonical="/about"
      />

      <div className="saas-page-container">
        {/* Header Block */}
        <div className="saas-header-block">
          <div className="saas-badge-pill">
            <IconSparkles size={13} />
            <span>{t("about.badge", "Ishonchli va Zamonaviy")}</span>
          </div>
          <h1 className="saas-page-title">
            {t("about.title", "Prava Online — Haydovchilikka ishonchli qadam")}
          </h1>
          <p className="saas-page-subtitle">
            {t(
              "about.subtitle",
              "Biz haydovchilik guvohnomasi imtihoniga tayyorlanish jarayonini sodda, qulay va har bir o'quvchi uchun kafolatlangan natijali qilish maqsadida yaratildik."
            )}
          </p>
        </div>

        {/* Mission & Overview Section */}
        <Grid gutter={{ base: "xl", md: 48 }} align="center" mb={64}>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <Badge color="blue" variant="light" size="md" w="fit-content">
                {t("about.missionBadge", "Bizning Missiyamiz")}
              </Badge>
              <Title order={2} style={{ fontSize: "clamp(1.5rem, 2.2vw, 2rem)", lineHeight: 1.25 }}>
                {t(
                  "about.missionTitle",
                  "Yo'llarda xavfsizlik — puxta nazariy bilimdan boshlanadi"
                )}
              </Title>
              <Text size="md" c="dimmed" lh={1.7}>
                {t(
                  "about.storyP1",
                  "Prava Online — bu shunchaki test sayti emas. Bu har bir bo'lajak haydovchiga yo'l harakati qoidalarini yodlash emas, balki chuqur tushunish imkonini beruvchi interaktiv o'quv tizimidir."
                )}
              </Text>
              <Text size="md" c="dimmed" lh={1.7}>
                {t(
                  "about.storyP2",
                  "Platformamiz IIV YHXXning 2026-yilgi eng so'nggi talablariga to'liq javob beradi: haqiqiy imtihondagi kabi 20 daqiqa vaqt chegarasi, 20 ta tasodifiy savollar, ruxsat etilgan xatolar me'yori va F1–F5 klaviatura tezkor tugmalari orqali xuddi imtihon xonasida o'tirgandek amaliyot qilasiz."
                )}
              </Text>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <div className="saas-card">
              <Group gap="md" mb="lg">
                <ThemeIcon size={48} radius="md" color="blue" variant="light">
                  <IconShieldCheck size={26} />
                </ThemeIcon>
                <div>
                  <Text fw={700} size="lg">
                    {t("about.cardTitle", "Kafolatlangan Sifat")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t("about.cardSub", "Rasmiy IIV YHXX talablariga 100% mos")}
                  </Text>
                </div>
              </Group>
              <Divider mb="lg" />
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                {milestones.map((m, idx) => (
                  <div key={idx} className="saas-card-flat" style={{ padding: "16px" }}>
                    <Text fw={800} size="1.6rem" c="blue.6" className="font-tabular" style={{ lineHeight: 1.2 }}>
                      {m.number}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4} fw={500}>
                      {m.label}
                    </Text>
                  </div>
                ))}
              </SimpleGrid>
            </div>
          </Grid.Col>
        </Grid>

        {/* Why Prava Online - 4 Pillars */}
        <Box mb={64}>
          <div className="saas-header-block" style={{ marginBottom: 32 }}>
            <h2 className="saas-page-title" style={{ fontSize: "clamp(1.5rem, 2.2vw, 2rem)" }}>
              {t("about.valuesTitle", "Nima uchun aynan Prava Online?")}
            </h2>
            <p className="saas-page-subtitle">
              {t(
                "about.valuesSub",
                "O'zbekistondagi boshqa manbalardan ajratib turuvchi asosiy afzalliklarimiz."
              )}
            </p>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {values.map((v, idx) => (
              <div key={idx} className="saas-card" style={{ height: "100%" }}>
                <Group wrap="nowrap" align="flex-start" gap="md">
                  <ThemeIcon size={44} radius="md" color={v.color} variant="light">
                    <v.icon size={24} />
                  </ThemeIcon>
                  <div>
                    <Text fw={700} size="md" mb={8}>
                      {v.title}
                    </Text>
                    <Text size="sm" c="dimmed" lh={1.6}>
                      {v.desc}
                    </Text>
                  </div>
                </Group>
              </div>
            ))}
          </SimpleGrid>
        </Box>

        {/* The Problem We Solve */}
        <div className="saas-card" style={{ marginBottom: 64, padding: "32px 24px" }}>
          <Stack gap="xl">
            <div>
              <Badge color="teal" variant="light" size="md" mb="xs">
                {t("about.problemBadge", "Qanday muammoni hal qilamiz?")}
              </Badge>
              <Title order={2} style={{ fontSize: "clamp(1.35rem, 2vw, 1.75rem)" }}>
                {t("about.problemTitle", "Nega ko'pchilik birinchi imtihondan o'ta olmaydi?")}
              </Title>
            </div>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
              {reasons.map((r, idx) => (
                <Group key={idx} align="flex-start" wrap="nowrap" gap="sm">
                  <ThemeIcon size={28} radius="xl" color="teal" variant="light" mt={2}>
                    <IconCircleCheck size={16} />
                  </ThemeIcon>
                  <Stack gap={4}>
                    <Text fw={600} size="sm">
                      {r.title}
                    </Text>
                    <Text size="xs" c="dimmed" lh={1.6}>
                      {r.desc}
                    </Text>
                  </Stack>
                </Group>
              ))}
            </SimpleGrid>
          </Stack>
        </div>

        {/* Clean SaaS CTA Banner */}
        <div
          className="saas-card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: "var(--surface)",
            borderColor: "var(--primary)",
          }}
        >
          <Stack align="center" gap="md" maw={640} mx="auto">
            <h2 className="saas-page-title" style={{ fontSize: "clamp(1.5rem, 2.2vw, 2rem)" }}>
              {t("about.ctaTitle", "Haydovchilik orzuyingizni haqiqatga aylantiring")}
            </h2>
            <p className="saas-page-subtitle">
              {t(
                "about.ctaDesc",
                "Bugunoq bepul ro'yxatdan o'ting yoki sinov imtihonida o'z kuchingizni sinab ko'ring."
              )}
            </p>
            <Flex
              direction={{ base: "column", sm: "row" }}
              justify="center"
              align="center"
              gap="md"
              mt="sm"
              w={{ base: "100%", sm: "auto" }}
            >
              <Link to="/auth/register" className="saas-btn-primary">
                {t("home.hero.startFree", "Bepul boshlash")}
                <IconArrowRight size={16} />
              </Link>
              <Link to="/partners" className="saas-btn-secondary">
                {t("nav.corporate", "Hamkorlik imkoniyatlari")}
              </Link>
            </Flex>
          </Stack>
        </div>
      </div>
    </>
  );
}
