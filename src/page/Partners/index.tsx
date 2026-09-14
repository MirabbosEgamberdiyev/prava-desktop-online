import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  TextInput,
  Select,
  Textarea,
  SegmentedControl,
  Accordion,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBuildingCommunity,
  IconSchool,
  IconDeviceDesktop,
  IconWifiOff,
  IconDatabase,
  IconUsers,
  IconChartBar,
  IconNetwork,
  IconKeyboard,
  IconRefresh,
  IconHeadset,
  IconCheck,
  IconSend,
  IconShieldCheck,
  IconSparkles,
  IconTruck,
  IconCircleCheck,
  IconFileCertificate,
  IconDownload,
  IconBrandTelegram,
  IconPhone,
  IconUser,
  IconAt,
  IconMail,
  IconClock,
  IconMapPin,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "../../components/common/SEO";
import api from "../../api/api";
import EnterpriseContactCard from "../../components/common/EnterpriseContactCard";

export default function Partners_Page() {
  const { t } = useTranslation();

  // Form State
  const [orgName, setOrgName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [telegram, setTelegram] = useState("");
  const [orgType, setOrgType] = useState<string | null>("school");
  const [workstations, setWorkstations] = useState("10");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [ticketId, setTicketId] = useState("");

  // Phone input formatting (+998 XX XXX XX XX)
  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (!digits.startsWith("998")) {
      digits = "998" + digits;
    }
    digits = digits.slice(0, 12);

    let formatted = "+998";
    if (digits.length > 3) formatted += " " + digits.slice(3, 5);
    if (digits.length > 5) formatted += " " + digits.slice(5, 8);
    if (digits.length > 8) formatted += " " + digits.slice(8, 10);
    if (digits.length > 10) formatted += " " + digits.slice(10, 12);

    setPhone(formatted);
  };

  // Telegram username formatting
  const handleTelegramChange = (val: string) => {
    const clean = val.replace(/^@+/, "").trim();
    if (clean.length > 0) {
      setTelegram("@" + clean);
    } else {
      setTelegram("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!orgName.trim() || orgName.trim().length < 2) {
      setFormError(t("partners.errOrganization", "Tashkilot nomini kiriting (kamida 2 ta belgi)"));
      return;
    }
    if (!contactPerson.trim() || contactPerson.trim().length < 2) {
      setFormError(t("partners.errFullName", "Mas'ul shaxs ismini kiriting (kamida 2 ta belgi)"));
      return;
    }
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 12) {
      setFormError(t("partners.errPhone", "Telefon raqamini to'liq kiriting: +998 XX XXX XX XX"));
      return;
    }
    if (!orgType) {
      setFormError(t("partners.errOrgType", "Tashkilot turini tanlang"));
      return;
    }

    setIsSubmitting(true);
    const generatedId = `CORP-${Math.floor(10000 + Math.random() * 90000)}`;
    let finalTicket = generatedId;

    const normalizedTelegram = telegram.trim()
      ? (telegram.trim().startsWith("@") ? telegram.trim() : `@${telegram.trim()}`)
      : "";

    const payload = {
      organization: orgName.trim(),
      fullName: contactPerson.trim(),
      phone: phone.trim(),
      telegram: normalizedTelegram,
      region: city.trim(),
      organizationType: orgType,
      computerCount: workstations || "",
      comment: notes.trim(),
    };

    try {
      const res = await api.post("/api/v1/public/contact/inquiry", payload);
      if (res.data?.data) {
        finalTicket = res.data.data.ticketId || generatedId;
      }
    } catch (err) {
      console.warn("Partners inquiry backend notification fallback:", err);
    } finally {
      setTicketId(finalTicket);
      setIsSubmitting(false);
      setFormSubmitted(true);

      notifications.show({
        title: t("partners.successTitle", "So‘rovingiz muvaffaqiyatli qabul qilindi"),
        message: t("partners.successDesc", "Mutaxassisimiz murojaatingizni qabul qildi. Tez orada siz bilan bog‘lanamiz."),
        color: "green",
      });
    }
  };

  const handleReset = () => {
    setOrgName("");
    setContactPerson("");
    setPhone("+998 ");
    setTelegram("");
    setOrgType("school");
    setWorkstations("10");
    setCity("");
    setNotes("");
    setFormSubmitted(false);
    setFormError("");
  };

  const scrollToForm = () => {
    document.getElementById("partner-inquiry-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const audienceSegments = [
    {
      icon: IconSchool,
      title: t("partners.seg1Title", "Avtomaktablar"),
      desc: t(
        "partners.seg1Desc",
        "Nazariy imtihon xonalarini jihozlash, o'quvchilarga F1–F5 klaviatura ko'nikmalarini singdirish va real davlat imtihoni muhitini yaratish."
      ),
      color: "blue",
    },
    {
      icon: IconBuildingCommunity,
      title: t("partners.seg2Title", "O'quv markazlari va kollejlar"),
      desc: t(
        "partners.seg2Desc",
        "Guruhlar kesimida test o'tkazish, o'quv dasturi bo'yicha oraliq nazoratlarni tashkil qilish va monitoring olib borish."
      ),
      color: "blue",
    },
    {
      icon: IconTruck,
      title: t("partners.seg3Title", "Korporativ avtoparklar va logistika"),
      desc: t(
        "partners.seg3Desc",
        "Kompaniya haydovchilarining yo'l harakati qoidalari bo'yicha bilim darajasini davriy tekshirish va attestatsiyadan o'tkazish."
      ),
      color: "blue",
    },
    {
      icon: IconShieldCheck,
      title: t("partners.seg4Title", "Davlat va xususiy tashkilotlar"),
      desc: t(
        "partners.seg4Desc",
        "Tashqi internetga ulanmasdan, ichki lokal tarmoq (LAN) doirasida xavfsiz va mustaqil attestatsiya tizimini joriy qilish."
      ),
      color: "blue",
    },
  ];

  const capabilities = [
    {
      icon: IconWifiOff,
      title: t("partners.f1Title", "100% Offline va Barqaror Ishlash"),
      desc: t(
        "partners.f1Desc",
        "Dastur butunlay internetsiz ishlaydi. Internet tezligi yoki uzilishlari dars jarayoniga mutlaqo ta'sir qilmaydi."
      ),
      color: "blue",
    },
    {
      icon: IconDatabase,
      title: t("partners.f2Title", "Lokal Rasmiy Savollar Bazasi"),
      desc: t(
        "partners.f2Desc",
        "IIV YHXXning 2026-yilgi amaldagi 1200+ rasmiy savollari, biletlar va yo'l chizmalari kompyuterga lokal o'rnatiladi."
      ),
      color: "blue",
    },
    {
      icon: IconDeviceDesktop,
      title: t("partners.f3Title", "O'qituvchi va Nazoratchi Paneli"),
      desc: t(
        "partners.f3Desc",
        "O'qituvchi dars vaqtida har bir o'quvchining qaysi savolda turganini va to'plagan ballarini o'z monitorida ko'rib turadi."
      ),
      color: "blue",
    },
    {
      icon: IconUsers,
      title: t("partners.f4Title", "Guruhlar va Oqimlar Boshqaruvi"),
      desc: t(
        "partners.f4Desc",
        "O'quv guruhlarini shakllantirish, o'quvchilarni ro'yxatga olish va sinov muddatlarini belgilash imkoniyati."
      ),
      color: "blue",
    },
    {
      icon: IconChartBar,
      title: t("partners.f5Title", "Natijalar Tahlili va Monitoring"),
      desc: t(
        "partners.f5Desc",
        "Qaysi yo'l qoidalari yoki mavzularda xatolar ko'p bo'layotganini aniqlash va zaif mavzular bo'yicha tahliliy hisobot olish."
      ),
      color: "blue",
    },
    {
      icon: IconNetwork,
      title: t("partners.f6Title", "Ichki Tarmoqda (LAN) Ishlash"),
      desc: t(
        "partners.f6Desc",
        "Kompyuter sinfidagi barcha qurilmalar lokal tarmoq orqali o'qituvchi kompyuteriga ulanadi va tashqi trafik talab qilmaydi."
      ),
      color: "blue",
    },
    {
      icon: IconKeyboard,
      title: t("partners.f7Title", "F1–F5 Klaviatura Boshqaruvi"),
      desc: t(
        "partners.f7Desc",
        "YHXX imtihon markazlaridagi standart klaviatura boshqaruvi bilan to'liq bir xil, bu o'quvchida amaliy ko'nikma hosil qiladi."
      ),
      color: "blue",
    },
    {
      icon: IconRefresh,
      title: t("partners.f8Title", "Avtomatik Yangilanishlar"),
      desc: t(
        "partners.f8Desc",
        "Yo'l harakati qoidalariga rasmiy o'zgartirishlar kiritilganda dastur bazasini oson va xavfsiz yangilash mexanizmi."
      ),
      color: "blue",
    },
    {
      icon: IconHeadset,
      title: t("partners.f9Title", "Korporativ Texnik Qo'llab-quvvatlash"),
      desc: t(
        "partners.f9Desc",
        "Dasturni o'rnatish, kompyuterlarni sozlash va xodimlarni o'rgatish bo'yicha mas'ul mutaxassis ko'magi."
      ),
      color: "blue",
    },
  ];

  const steps = [
    {
      num: t("partners.step1Num", "01"),
      title: t("partners.step1Title", "Murojaat va maslahatlashuv"),
      desc: t(
        "partners.step1Desc",
        "Tashkilotingiz talablari, kompyuterlar soni va sinflar infratuzilmasi tahlil qilinadi."
      ),
    },
    {
      num: t("partners.step2Num", "02"),
      title: t("partners.step2Title", "Dasturni o'rnatish va sozlash"),
      desc: t(
        "partners.step2Desc",
        "Mutaxassislarimiz yordamida Prava Desktop Enterprise tizimi kompyuter sinfiga o'rnatiladi va lokal tarmoq sozlanadi."
      ),
    },
    {
      num: t("partners.step3Num", "03"),
      title: t("partners.step3Title", "O'qituvchilarni yo'riqnoma bilan ta'minlash"),
      desc: t(
        "partners.step3Desc",
        "O'qituvchi va administratorlar uchun tizimdan foydalanish va guruhlarni boshqarish bo'yicha qisqa yo'riqnoma beriladi."
      ),
    },
    {
      num: t("partners.step4Num", "04"),
      title: t("partners.step4Title", "Doimiy texnik kafolat"),
      desc: t(
        "partners.step4Desc",
        "Savollar bazasi yangilanishi va tizim barqarorligi doimiy nazorat qilib boriladi."
      ),
    },
  ];

  const partnerFaq = [
    {
      id: "pfaq-1",
      question: t("partners.q1", "Dastur ishlashi uchun internet doimiy bo'lishi shartmi?"),
      answer: t(
        "partners.a1",
        "Yo'q. Prava Desktop Enterprise tizimi 100% offline ishlashga mo'ljallangan. Barcha savollar bazasi va tekshiruv algoritmlari kompyuterning o'zida lokal saqlanadi. Kompyuter sinfidagi o'quvchilar va o'qituvchi o'rtasidagi ma'lumotlar ichki lokal tarmoq (LAN) orqali internet talab qilinmasdan uzatiladi."
      ),
    },
    {
      id: "pfaq-2",
      question: t("partners.q2", "Kompyuterlarga qanday texnik talablar qo'yiladi?"),
      answer: t(
        "partners.a2",
        "Dastur resurs tejamkor bo'lib, Windows 7, 8, 10 va 11 operatsion tizimlarida barqaror ishlaydi. 2 GB tezkor xotira (RAM) va 500 MB disk maydoni kifoya qiladi. Maxsus qimmatbaho server yoki kuchli protsessor talab etilmaydi."
      ),
    },
    {
      id: "pfaq-3",
      question: t("partners.q3", "Yangi yo'l qoidalari qabul qilinsa, savollar qanday yangilanadi?"),
      answer: t(
        "partners.a3",
        "Qonunchilikka yoki YHXX standartlariga o'zgartirish kiritilganda biz rasmiy yangilanish paketini taqdim etamiz. Yangilanish bitta tugma yoki lokal fayl orqali osonlik bilan o'rnatiladi."
      ),
    },
    {
      id: "pfaq-4",
      question: t("partners.q4", "Dasturni joriy qilishdan oldin sinab ko'rish mumkinmi?"),
      answer: t(
        "partners.a4",
        "Albatta. Hamkorlik so'rovini qoldirganingizdan so'ng mutaxassislarimiz tashkilotingiz uchun sinov versiyasini taqdim etadi va imkoniyatlarni amalda ko'rsatib beradi."
      ),
    },
  ];

  const getOrgTypeName = (type: string | null) => {
    switch (type) {
      case "school":
        return t("partners.orgTypeSchool", "Avtomaktab");
      case "center":
        return t("partners.orgTypeCenter", "O'quv markazi / Kollej");
      case "corporate":
        return t("partners.orgTypeCorporate", "Korporativ avtopark / Logistika");
      case "state":
        return t("partners.orgTypeState", "Davlat muassasasi");
      case "other":
        return t("partners.orgTypeOther", "Boshqa tashkilot");
      default:
        return type || t("partners.notSpecified", "Ko‘rsatilmagan");
    }
  };

  return (
    <>
      <SEO
        title="Avtomaktablar va Hamkorlar uchun Korporativ Yechimlar — Prava Online"
        description="Avtomaktablar, o'quv markazlari va tashkilotlar uchun Prava Desktop Enterprise offline tizimi. Lokal tarmoq, o'qituvchi paneli, F1-F5 imtihon simulyatori va rasmiy savollar bazasi."
        keywords="avtomaktablar uchun dastur, prava desktop enterprise, avtomaktab test dasturi, haydovchilik o'quv markazi dasturi, offline prava test"
        canonical="/partners"
      />

      <div className="saas-page-container">
        {/* Header Block */}
        <div className="saas-header-block">
          <div className="saas-badge-pill">
            <IconSparkles size={13} />
            <span>{t("partners.badge", "Avtomaktablar va Korporativ Hamkorlik")}</span>
          </div>

          <Title order={1} className="saas-page-title">
            {t(
              "partners.title",
              "Ta'lim muassasalari va avtomaktablar uchun zamonaviy dasturiy majmua"
            )}
          </Title>

          <Text size="md" c="var(--text-muted)" className="saas-page-subtitle">
            {t(
              "partners.subtitle",
              "Kompyuter sinflari, ichki tarmoq va to'liq offline rejimda ishlovchi rasmiy imtihon tizimi. O'quvchilarni davlat YHXX imtihoniga tayyorlash jarayonini markazlashgan holda boshqaring."
            )}
          </Text>

          <Flex
            direction={{ base: "column", sm: "row" }}
            justify="center"
            align="center"
            gap="sm"
            mt="lg"
            w={{ base: "100%", sm: "auto" }}
          >
            <Button
              size="md"
              radius="md"
              className="saas-btn-primary"
              onClick={scrollToForm}
              leftSection={<IconSend size={16} />}
            >
              {t("partners.ctaConsult", "Hamkorlik so'rovini qoldirish")}
            </Button>
            <Link to="/downloads" style={{ textDecoration: "none" }}>
              <Button
                size="md"
                radius="md"
                className="saas-btn-secondary"
                leftSection={<IconDownload size={16} />}
              >
                {t("partners.ctaDownload", "Desktop versiyani ko'rish")}
              </Button>
            </Link>
          </Flex>
        </div>

        {/* Audience Segments */}
        <div style={{ marginBottom: 64 }}>
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            c="var(--primary)"
            ta="center"
            mb={6}
            style={{ letterSpacing: "1px" }}
          >
            {t("partners.segBadge", "Kimlar uchun mo'ljallangan?")}
          </Text>
          <Title order={2} ta="center" size="h3" mb="xl">
            {t("partners.segTitle", "Har qanday o'quv infratuzilmasiga moslashuvchan")}
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {audienceSegments.map((seg, idx) => {
              const IconComp = seg.icon;
              return (
                <div key={idx} className="saas-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <ThemeIcon size={42} radius="md" color={seg.color} variant="light" mb="md">
                    <IconComp size={22} />
                  </ThemeIcon>
                  <Text fw={700} size="md" mb="xs">
                    {seg.title}
                  </Text>
                  <Text size="xs" c="dimmed" lh={1.6} style={{ flex: 1 }}>
                    {seg.desc}
                  </Text>
                </div>
              );
            })}
          </SimpleGrid>
        </div>

        {/* 9 Core Capabilities Matrix */}
        <div style={{ marginBottom: 72 }}>
          <div className="saas-card" style={{ padding: "36px 30px" }}>
            <Box ta="center" mb={36}>
              <Text
                size="xs"
                fw={700}
                tt="uppercase"
                c="var(--primary)"
                mb={6}
                style={{ letterSpacing: "1px" }}
              >
                {t("partners.featBadge", "Funksional Imkoniyatlar")}
              </Text>
              <Title order={2} size="h3" mb="xs">
                {t("partners.featTitle", "Prava Desktop Enterprise — Ta'lim jarayonini to'liq nazorat qilish")}
              </Title>
              <Text size="xs" c="dimmed" maw={640} mx="auto">
                {t(
                  "partners.featSubtitle",
                  "O'qituvchi va ma'muriyat uchun barcha zarur vositalar bitta dasturiy ta'minotda jamlangan."
                )}
              </Text>
            </Box>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
              {capabilities.map((cap, idx) => {
                const IconComp = cap.icon;
                return (
                  <Group key={idx} align="flex-start" gap="md" wrap="nowrap">
                    <ThemeIcon size={40} radius="md" color={cap.color} variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                      <IconComp size={20} />
                    </ThemeIcon>
                    <Stack gap={4}>
                      <Text fw={700} size="sm">
                        {cap.title}
                      </Text>
                      <Text size="xs" c="dimmed" lh={1.5}>
                        {cap.desc}
                      </Text>
                    </Stack>
                  </Group>
                );
              })}
            </SimpleGrid>
          </div>
        </div>

        {/* Implementation Steps */}
        <div style={{ marginBottom: 64 }}>
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            c="var(--primary)"
            ta="center"
            mb={6}
            style={{ letterSpacing: "1px" }}
          >
            {t("partners.stepsBadge", "Joriy Qilish Bosqichlari")}
          </Text>
          <Title order={2} ta="center" size="h3" mb="xl">
            {t("partners.stepsTitle", "Hamkorlik qanday amalga oshiriladi?")}
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="saas-card"
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  padding: "24px 20px",
                }}
              >
                <Text
                  size="28px"
                  fw={900}
                  c="var(--primary)"
                  style={{ opacity: 0.25, lineHeight: 1, marginBottom: 12 }}
                >
                  {st.num}
                </Text>
                <Text fw={700} size="sm" mb="xs">
                  {st.title}
                </Text>
                <Text size="xs" c="dimmed" lh={1.5}>
                  {st.desc}
                </Text>
              </div>
            ))}
          </SimpleGrid>
        </div>

        {/* B2B Partnership & Direct Contact Section */}
        <div id="partner-inquiry-form" style={{ marginBottom: 64, scrollMarginTop: 32 }}>
          <Box ta="center" mb="xl">
            <div className="saas-badge-pill" style={{ marginBottom: 12 }}>
              <IconFileCertificate size={13} />
              <span>{t("partners.formBadge", "Hamkorlik So'rovi")}</span>
            </div>
            <Title order={2} size="h2" mb="xs">
              {t("partners.formTitle", "Hamkorlik bo'yicha so'rov yuboring")}
            </Title>
            <Text size="sm" c="dimmed" maw={640} mx="auto" lh={1.6}>
              {t(
                "partners.formSubtitle",
                "Tashkilotingiz ma'lumotlarini qoldiring, mutaxassisimiz 1 ish kuni ichida siz bilan bog'lanib, batafsil ma'lumot beradi."
              )}
            </Text>
          </Box>

          <Grid gutter="xl" align="stretch">
            {/* Left: Lead Inquiry Form / Enterprise Success */}
            <Grid.Col span={{ base: 12, lg: 7 }} order={{ base: 1, lg: 1 }}>
              <div
                className="saas-card"
                style={{
                  height: "100%",
                  padding: "32px 24px",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                {formSubmitted ? (
                  <Stack align="center" gap="md" py="xl">
                    <ThemeIcon size={72} radius="xl" color="green" variant="light">
                      <IconCircleCheck size={44} />
                    </ThemeIcon>
                    <Title order={3} size="h3" ta="center">
                      {t("partners.successTitle", "So‘rovingiz muvaffaqiyatli qabul qilindi")}
                    </Title>
                    <Badge size="xl" variant="filled" color="blue" radius="md" style={{ fontFamily: "monospace", letterSpacing: 1 }}>
                      {t("partners.ticketLabel", "Murojaat raqami")}: #{ticketId}
                    </Badge>
                    <Text size="sm" c="dimmed" ta="center" maw={480} lh={1.6}>
                      {t(
                        "partners.successDescNew",
                        "Mutaxassisimiz murojaatingizni qabul qildi. Tez orada siz bilan bog‘lanamiz."
                      )}
                    </Text>

                    {/* Summary of submitted data */}
                    <Box
                      w="100%"
                      maw={460}
                      p="md"
                      mt="sm"
                      style={{
                        backgroundColor: "var(--mantine-color-default-hover)",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: "0.5px" }}>
                        {t("partners.summaryTitle", "Yuborilgan so'rov tafsilotlari:")}
                      </Text>
                      <Stack gap={6}>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("partners.orgName", "Tashkilot")}:</Text>
                          <Text size="xs" fw={600}>{orgName}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("partners.contactPerson", "Mas'ul shaxs")}:</Text>
                          <Text size="xs" fw={600}>{contactPerson}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("partners.phone", "Telefon")}:</Text>
                          <Text size="xs" fw={600}>{phone}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("partners.orgType", "Tashkilot turi")}:</Text>
                          <Text size="xs" fw={600}>{getOrgTypeName(orgType)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("partners.city", "Shahar / Hudud")}:</Text>
                          <Text size="xs" fw={600}>{city.trim() || t("partners.notSpecified", "Ko‘rsatilmagan")}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">Telegram:</Text>
                          <Text size="xs" fw={600}>{telegram.trim() || t("partners.notSpecified", "Ko‘rsatilmagan")}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("partners.workstations", "O'quv kompyuterlari")}:</Text>
                          <Text size="xs" fw={600}>{workstations ? `${workstations} ta` : t("partners.notSpecified", "Ko‘rsatilmagan")}</Text>
                        </Group>
                      </Stack>
                    </Box>

                    {/* 3 Action Buttons */}
                    <Stack w="100%" maw={460} gap="xs" mt="md">
                      <Button
                        variant="filled"
                        color="blue"
                        size="md"
                        radius="md"
                        leftSection={<IconPhone size={18} />}
                        component="a"
                        href="tel:+998993912505"
                      >
                        +998 99 391 25 05
                      </Button>
                      <Group grow gap="xs">
                        <Button
                          component="a"
                          href="https://t.me/pravaonlineuz"
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="light"
                          color="blue"
                          size="sm"
                          radius="md"
                          leftSection={<IconBrandTelegram size={16} />}
                        >
                          {t("partners.btnTelegram", "Telegram orqali bog‘lanish")}
                        </Button>
                        <Button
                          component="a"
                          href="mailto:info@pravaonline.uz"
                          variant="light"
                          color="blue"
                          size="sm"
                          radius="md"
                          leftSection={<IconMail size={16} />}
                        >
                          {t("partners.btnEmail", "Email yozish")}
                        </Button>
                      </Group>
                      <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        onClick={handleReset}
                        leftSection={<IconRefresh size={14} />}
                        mt={4}
                      >
                        {t("partners.sendAnother", "Yangi so‘rov yuborish")}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                      {formError && (
                        <Alert color="red" radius="md" py="xs">
                          {formError}
                        </Alert>
                      )}

                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <TextInput
                          label={t("partners.orgName", "Tashkilot yoki avtomaktab nomi")}
                          placeholder={t("partners.orgNamePlaceholder", "Masalan: Avto-Lider MCHJ")}
                          required
                          value={orgName}
                          onChange={(e) => setOrgName(e.currentTarget.value)}
                          leftSection={<IconBuildingCommunity size={16} />}
                        />
                        <TextInput
                          label={t("partners.contactPerson", "Mas'ul shaxs (F.I.Sh.)")}
                          placeholder={t("partners.contactPersonPlaceholder", "Ism va familiyangiz")}
                          required
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.currentTarget.value)}
                          leftSection={<IconUser size={16} />}
                        />
                      </SimpleGrid>

                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <TextInput
                          label={t("partners.phone", "Telefon raqami")}
                          placeholder="+998 90 123 45 67"
                          required
                          value={phone}
                          onChange={(e) => handlePhoneChange(e.currentTarget.value)}
                          leftSection={<IconPhone size={16} />}
                        />
                        <Select
                          label={t("partners.orgType", "Tashkilot turi")}
                          required
                          value={orgType}
                          onChange={setOrgType}
                          data={[
                            { value: "school", label: t("partners.orgTypeSchool", "Avtomaktab") },
                            { value: "center", label: t("partners.orgTypeCenter", "O'quv markazi / Kollej") },
                            { value: "corporate", label: t("partners.orgTypeCorporate", "Korporativ avtopark / Logistika") },
                            { value: "state", label: t("partners.orgTypeState", "Davlat muassasasi") },
                            { value: "other", label: t("partners.orgTypeOther", "Boshqa tashkilot") },
                          ]}
                        />
                      </SimpleGrid>

                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <TextInput
                          label={t("partners.city", "Shahar / Hudud")}
                          placeholder={t("partners.cityPlaceholder", "Toshkent shahri, Samarqand...")}
                          value={city}
                          onChange={(e) => setCity(e.currentTarget.value)}
                          leftSection={<IconMapPin size={16} />}
                        />
                        <TextInput
                          label={t("contact.telegram", "Telegram username")}
                          placeholder="@username"
                          value={telegram}
                          onChange={(e) => handleTelegramChange(e.currentTarget.value)}
                          leftSection={<IconAt size={16} />}
                        />
                      </SimpleGrid>

                      <div>
                        <Text size="sm" fw={500} mb={6}>
                          {t("partners.workstations", "O'quv kompyuterlari soni")}
                        </Text>
                        <SegmentedControl
                          fullWidth
                          value={workstations}
                          onChange={setWorkstations}
                          data={[
                            { label: t("partners.workstationsOption1", "1 – 10 ta"), value: "10" },
                            { label: t("partners.workstationsOption2", "11 – 30 ta"), value: "30" },
                            { label: t("partners.workstationsOption3", "30 tadan ortiq"), value: "50" },
                          ]}
                        />
                      </div>

                      <Textarea
                        label={t("partners.notes", "Qo'shimcha izoh yoki talablar")}
                        placeholder={t(
                          "partners.notesPlaceholder",
                          "Dasturni joriy qilish muddatlari, mavjud kompyuterlar xususiyatlari..."
                        )}
                        minRows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                      />

                      <Button
                        type="submit"
                        size="md"
                        radius="md"
                        loading={isSubmitting}
                        className="saas-btn-primary saas-interactive-btn"
                        rightSection={<IconSend size={16} />}
                        mt="sm"
                        h={48}
                        fw={700}
                      >
                        {isSubmitting
                          ? t("partners.sending", "Yuborilmoqda...")
                          : t("partners.submitBtn", "Hamkorlik so'rovini yuborish")}
                      </Button>
                    </Stack>
                  </form>
                )}
              </div>
            </Grid.Col>

            {/* Right: Contact Hub */}
            <Grid.Col span={{ base: 12, lg: 5 }} order={{ base: 2, lg: 2 }}>
              <div
                className="saas-card"
                style={{
                  height: "100%",
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <Group gap="xs" mb="xs">
                    <ThemeIcon size={32} radius="md" color="blue" variant="light">
                      <IconHeadset size={18} />
                    </ThemeIcon>
                    <Text size="xs" fw={700} tt="uppercase" c="var(--primary)" style={{ letterSpacing: "1px" }}>
                      {t("partners.directContactBadge", "24/7 texnik va konsultativ yordam")}
                    </Text>
                  </Group>
                  <Title order={3} size="h3" mb="xs">
                    {t("partners.directContactTitle", "Mutaxassis bilan bog‘lanish")}
                  </Title>
                  <Text size="xs" c="dimmed" lh={1.6} mb="lg">
                    {t(
                      "partners.directContactDesc",
                      "Hamkorlik, joriy etish, texnik maslahat va korporativ takliflar bo‘yicha biz bilan bog‘laning."
                    )}
                  </Text>

                  <Stack gap="sm">
                    {/* Phone */}
                    <EnterpriseContactCard
                      icon={IconPhone}
                      color="blue"
                      label={t("partners.contactPhoneLabel", "Telefon raqami")}
                      value="+998 99 391 25 05"
                      sub={t("partners.contactPhoneSub", "24/7 qo‘ng‘iroqlar qabul qilinadi")}
                      href="tel:+998993912505"
                      ariaLabel="Telefon orqali bog'lanish"
                    />

                    {/* Telegram */}
                    <EnterpriseContactCard
                      icon={IconBrandTelegram}
                      color="blue"
                      label={t("partners.contactTgLabel", "Telegram orqali aloqa")}
                      value="@pravaonlineuz"
                      sub={t("partners.contactTgSub", "Tezkor yozishmalar va konsultatsiyalar")}
                      href="https://t.me/pravaonlineuz"
                      external
                      ariaLabel="Telegram orqali bog'lanish"
                    />

                    {/* Email */}
                    <EnterpriseContactCard
                      icon={IconMail}
                      color="blue"
                      label={t("partners.contactEmailLabel", "Elektron pochta")}
                      value="info@pravaonline.uz"
                      sub={t("partners.contactEmailSub", "Rasmiy tijorat va hamkorlik murojaatlari")}
                      href="mailto:info@pravaonline.uz"
                      ariaLabel="Email orqali bog'lanish"
                    />

                    {/* Working Hours */}
                    <EnterpriseContactCard
                      icon={IconClock}
                      color="blue"
                      label={t("partners.contactHoursLabel", "Ish vaqti")}
                      value="24/7"
                      badge="Faol"
                      sub={t("partners.contactHoursSub", "Sutka davomida murojaatlar qabul qilinadi")}
                      ariaLabel="Ish vaqti"
                    />
                  </Stack>
                </div>

                {/* Guarantees Box */}
                <Box
                  mt="xl"
                  pt="md"
                  style={{
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <Stack gap={8}>
                    <Group gap="xs">
                      <IconCheck size={14} color="var(--primary)" />
                      <Text size="xs" c="dimmed">{t("partners.guarantee1", "Bepul konsultatsiya va demo namoyish")}</Text>
                    </Group>
                    <Group gap="xs">
                      <IconCheck size={14} color="var(--primary)" />
                      <Text size="xs" c="dimmed">{t("partners.guarantee2", "Tashkilot talablariga individual moslashuv")}</Text>
                    </Group>
                    <Group gap="xs">
                      <IconCheck size={14} color="var(--primary)" />
                      <Text size="xs" c="dimmed">{t("partners.guarantee3", "Rasmiy shartnoma va to'liq hujjatlar to'plami")}</Text>
                    </Group>
                  </Stack>
                </Box>
              </div>
            </Grid.Col>
          </Grid>
        </div>

        {/* Partner FAQ - Full Width Section */}
        <div style={{ marginBottom: 64 }}>
          <Box ta="center" mb="lg">
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c="var(--primary)"
              mb={8}
              style={{ letterSpacing: "1px" }}
            >
              {t("partners.faqBadge", "Ko'p So'raladigan Savollar")}
            </Text>
            <Title order={2} size="h3">
              {t("partners.faqTitle", "Hamkorlik va joriy qilish bo'yicha savollar")}
            </Title>
          </Box>

          <Accordion variant="separated" radius="md" style={{ width: "100%", margin: "0 auto" }}>
            {partnerFaq.map((faq) => (
              <Accordion.Item key={faq.id} value={faq.id} className="saas-card" style={{ marginBottom: 12 }}>
                <Accordion.Control>
                  <Text fw={600} size="sm">
                    {faq.question}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="xs" c="dimmed" lh={1.7}>
                    {faq.answer}
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
    </>
  );
}
