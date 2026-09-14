import { useState } from "react";
import {
  Anchor,
  Button,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Accordion,
  Badge,
  Box,
  SegmentedControl,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPhone,
  IconBrandTelegram,
  IconClock,
  IconMapPin,
  IconSend,
  IconMail,
  IconUser,
  IconCircleCheck,
  IconShieldCheck,
  IconSchool,
  IconDeviceDesktop,
  IconHeadset,
  IconTruck,
  IconUsers,
  IconBuildingCommunity,
  IconAt,
  IconAlertCircle,
  IconCheck,
  IconRefresh,
  IconSparkles,
  IconPhoneCall,
  IconArrowRight,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "../../components/common/SEO";
import api from "../../api/api";
import EnterpriseContactCard from "../../components/common/EnterpriseContactCard";

export default function Contact_Page() {
  const { t } = useTranslation();

  // Form State
  const [organization, setOrganization] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [telegram, setTelegram] = useState("");
  const [region, setRegion] = useState<string | null>("tashkent_city");
  const [organizationType, setOrganizationType] = useState<string | null>("school");
  const [computerCount, setComputerCount] = useState("10");
  const [comment, setComment] = useState("");

  // UX & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Phone input helper: auto-formats into +998 XX XXX XX XX
  const formatUzPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    let rest = digits.startsWith("998") ? digits.slice(3) : digits;
    rest = rest.slice(0, 9);

    let formatted = "+998";
    if (rest.length > 0) {
      formatted += " " + rest.slice(0, 2);
    }
    if (rest.length > 2) {
      formatted += " " + rest.slice(2, 5);
    }
    if (rest.length > 5) {
      formatted += " " + rest.slice(5, 7);
    }
    if (rest.length > 7) {
      formatted += " " + rest.slice(7, 9);
    }
    return formatted;
  };

  const handlePhoneChange = (val: string) => {
    if (
      !val ||
      val.trim() === "+" ||
      val.trim() === "+9" ||
      val.trim() === "+99" ||
      val.trim() === "+998"
    ) {
      setPhone("+998 ");
      return;
    }
    setPhone(formatUzPhone(val));
  };

  // Telegram username helper: strips leading spaces, ensures @ if text present
  const handleTelegramChange = (val: string) => {
    const clean = val.trim();
    if (!clean) {
      setTelegram("");
    } else if (clean.startsWith("@")) {
      setTelegram(clean);
    } else {
      setTelegram("@" + clean);
    }
  };

  const validateForm = (): boolean => {
    setValidationError(null);

    if (!organization.trim() || organization.trim().length < 2) {
      setValidationError(
        t("contact.errOrganization", "Tashkilot nomini kiriting (kamida 2 ta belgi)")
      );
      return false;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setValidationError(
        t("contact.errFullName", "Mas'ul shaxs ismini kiriting (kamida 2 ta belgi)")
      );
      return false;
    }

    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 12) {
      setValidationError(
        t("contact.errPhone", "Telefon raqamini to'liq kiriting: +998 XX XXX XX XX")
      );
      return false;
    }

    if (!organizationType) {
      setValidationError(t("contact.errOrgType", "Tashkilot turini tanlang"));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const generatedFallbackTicket = "CORP-" + Math.floor(10000 + Math.random() * 90000);

    const normalizedTelegram = telegram.trim()
      ? telegram.startsWith("@")
        ? telegram.trim()
        : "@" + telegram.trim()
      : "";

    const payload = {
      organization: organization.trim(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      telegram: normalizedTelegram || null,
      region: region || "tashkent_city",
      organizationType,
      computerCount,
      comment: comment.trim(),
    };

    let finalTicket = generatedFallbackTicket;
    let isDelivered = false;
    try {
      const res = await api.post("/api/v1/public/contact/inquiry", payload);
      if (res.data?.data) {
        finalTicket = res.data.data.ticketId || generatedFallbackTicket;
        isDelivered = Boolean(res.data.data.delivered);
      }
    } catch (err) {
      console.warn("Contact inquiry API call failed, falling back to local ticket:", err);
    } finally {
      setTicketId(finalTicket);
      setIsSubmitting(false);
      setFormSubmitted(true);

      notifications.show({
        title: isDelivered
          ? t("contact.sentTitle", "So‘rovingiz qabul qilindi!")
          : t("contact.ticketLabel", "Murojaat raqami") + ": #" + finalTicket,
        message: t(
          "contact.successDesc",
          "Mutaxassisimiz 1 ish kuni ichida siz bilan bog‘lanadi."
        ),
        color: "green",
        withBorder: true,
      });
    }
  };

  const handleResetForm = () => {
    setOrganization("");
    setFullName("");
    setPhone("+998 ");
    setTelegram("");
    setRegion("tashkent_city");
    setOrganizationType("school");
    setComputerCount("10");
    setComment("");
    setFormSubmitted(false);
    setValidationError(null);
  };

  // Direct Contact Channels
  const directChannels = [
    {
      icon: IconPhoneCall,
      title: t("contact.phoneTitle", "Telefon raqami"),
      value: "+998 99 391 25 05",
      desc: t("contact.phoneDesc", "24/7 qo‘ng‘iroqlar qabul qilinadi."),
      link: "tel:+998993912505",
      badge: t("contact.badgeDirectCall", "To'g'ridan-to'g'ri qo'ng'iroq"),
      actionLabel: t("contact.callNow", "Qo'ng'iroq qilish"),
    },
    {
      icon: IconBrandTelegram,
      title: t("contact.telegramTitle", "Telegram rasmiy aloqa"),
      value: "@pravaonlineuz",
      desc: t("contact.telegramDesc", "O'rtacha javob vaqti: 5 daqiqa. 24/7 faol."),
      link: "https://t.me/pravaonlineuz",
      badge: t("contact.badgeFastReply", "Tezkor javob (5 daqiqa)"),
      actionLabel: t("contact.openTelegram", "Telegramda yozish"),
    },
    {
      icon: IconMail,
      title: t("contact.emailTitle", "Elektron pochta"),
      value: "info@pravaonline.uz",
      desc: t("contact.emailDesc", "Rasmiy so'rovlar, shartnomalar va takliflar."),
      link: "mailto:info@pravaonline.uz",
      badge: t("contact.badgeEmail", "Rasmiy xatlar"),
      actionLabel: t("contact.sendEmail", "Xat yuborish"),
    },
    {
      icon: IconClock,
      title: t("contact.hoursTitle", "Ish vaqti"),
      value: "24/7",
      desc: t("contact.hoursDesc", "Sutka davomida murojaatlar qabul qilinadi."),
      link: undefined,
      badge: t("contact.badgeSchedule", "24/7 Faol"),
      actionLabel: null,
    },
    {
      icon: IconMapPin,
      title: t("contact.locationTitle", "Hudud va Bosh ofis"),
      value: t("contact.cityTashkent", "Toshkent shahri"),
      desc: t("contact.locationDesc", "O'zbekiston Respublikasi, Toshkent shahri."),
      link: undefined,
      badge: t("contact.badgeHeadOffice", "Bosh ofis"),
      actionLabel: null,
    },
  ];

  // Trust Section: "Nima uchun biz bilan bog'lanishadi?"
  const trustPillars = [
    {
      icon: IconSchool,
      title: t("contact.trust1Title", "Avtomaktablar uchun yechimlar"),
      desc: t(
        "contact.trust1Desc",
        "Nazariy imtihon sinflarini jihozlash, o'quvchilarga F1–F5 klaviatura ko'nikmalarini singdirish va YHXX imtihon simulyatori."
      ),
      color: "blue",
    },
    {
      icon: IconDeviceDesktop,
      title: t("contact.trust2Title", "Desktop versiyani joriy qilish"),
      desc: t(
        "contact.trust2Desc",
        "Prava Desktop Enterprise tizimini kompyuter sinfiga o'rnatish, lokal tarmoq (LAN) va 100% offline rejimni sozlash."
      ),
      color: "teal",
    },
    {
      icon: IconHeadset,
      title: t("contact.trust3Title", "Kafolatlangan texnik yordam"),
      desc: t(
        "contact.trust3Desc",
        "Dasturiy ta'minotning uzluksiz ishlashi, savollar bazasini yangilash va o'qituvchilarga amaliy yo'riqnoma berish."
      ),
      color: "grape",
    },
    {
      icon: IconTruck,
      title: t("contact.trust4Title", "Korporativ hamkorlik"),
      desc: t(
        "contact.trust4Desc",
        "Kompaniyalar va logistika avtoparklari haydovchilarining yo'l harakati bilimlarini davriy attestatsiyadan o'tkazish."
      ),
      color: "orange",
    },
    {
      icon: IconUsers,
      title: t("contact.trust5Title", "Individual konsultatsiyalar"),
      desc: t(
        "contact.trust5Desc",
        "Nomzod haydovchilar uchun imtihon qoidalari, biletlar tizimi va platformadan foydalanish bo'yicha maslahatlar."
      ),
      color: "indigo",
    },
    {
      icon: IconShieldCheck,
      title: t("contact.trust6Title", "Rasmiy kafolat va shartnoma"),
      desc: t(
        "contact.trust6Desc",
        "Har bir hamkorlik rasmiy shartnoma asosida amalga oshiriladi, hisob-faktura va to'liq hujjatlar taqdim etiladi."
      ),
      color: "cyan",
    },
  ];

  // Uzbekistan 14 regions
  const regionOptions = [
    { value: "tashkent_city", label: t("contact.regTashkentCity", "Toshkent shahri") },
    { value: "tashkent_reg", label: t("contact.regTashkentReg", "Toshkent viloyati") },
    { value: "samarkand", label: t("contact.regSamarkand", "Samarqand viloyati") },
    { value: "fergana", label: t("contact.regFergana", "Farg'ona viloyati") },
    { value: "andijan", label: t("contact.regAndijan", "Andijon viloyati") },
    { value: "namangan", label: t("contact.regNamangan", "Namangan viloyati") },
    { value: "bukhara", label: t("contact.regBukhara", "Buxoro viloyati") },
    { value: "khorezm", label: t("contact.regKhorezm", "Xorazm viloyati") },
    { value: "kashkadarya", label: t("contact.regKashkadarya", "Qashqadaryo viloyati") },
    { value: "surkhandarya", label: t("contact.regSurkhandarya", "Surxondaryo viloyati") },
    { value: "navoi", label: t("contact.regNavoi", "Navoiy viloyati") },
    { value: "jizzakh", label: t("contact.regJizzakh", "Jizzax viloyati") },
    { value: "sirdarya", label: t("contact.regSirdarya", "Sirdaryo viloyati") },
    {
      value: "karakalpakstan",
      label: t("contact.regKarakalpakstan", "Qoraqalpog'iston Respublikasi"),
    },
  ];

  // Organization Types
  const orgTypeOptions = [
    { value: "school", label: t("contact.orgSchool", "Avtomaktab") },
    { value: "center", label: t("contact.orgCenter", "O'quv markazi / Kollej") },
    { value: "corporate", label: t("contact.orgCorporate", "Korporativ avtopark / Logistika") },
    { value: "state", label: t("contact.orgState", "Davlat muassasasi") },
    { value: "other", label: t("contact.orgOther", "Boshqa tashkilot") },
  ];

  const getOrgTypeName = (type: string | null) => {
    const found = orgTypeOptions.find((o) => o.value === type);
    return found ? found.label : type || t("contact.notSpecified", "Ko‘rsatilmagan");
  };

  const getRegionName = (val: string | null) => {
    const found = regionOptions.find((r) => r.value === val);
    return found ? found.label : val || t("contact.notSpecified", "Ko‘rsatilmagan");
  };

  // Quick FAQ
  const quickResolutions = [
    {
      id: "quick-1",
      question: t("contact.quick1Q", "Dasturni o'rnatish uchun nima talab qilinadi?"),
      answer: t(
        "contact.quick1A",
        "Windows 7, 8, 10 yoki 11 operatsion tizimidagi oddiy kompyuterlar kifoya qiladi. Maxsus qimmatbaho server yoki kuchli protsessor talab etilmaydi. Mutaxassisimiz dasturni 1 kunda to'liq o'rnatib beradi."
      ),
    },
    {
      id: "quick-2",
      question: t("contact.quick2Q", "Dastur internetsiz ishlaydimi?"),
      answer: t(
        "contact.quick2A",
        "Ha. Prava Desktop Enterprise 100% offline ishlashga mo'ljallangan. Kompyuter sinfidagi qurilmalar ichki lokal tarmoq (LAN) orqali internet sarflamasdan o'zaro ma'lumot almashadi."
      ),
    },
    {
      id: "quick-3",
      question: t("contact.quick3Q", "Hamkorlik so'rovi yuborilgach, qancha vaqtda bog'lanasiz?"),
      answer: t(
        "contact.quick3A",
        "So'rovingiz qabul qilingach, mutaxassisimiz 1 ish kuni ichida (odatda bir necha soatda) siz ko'rsatgan telefon yoki Telegram orqali bog'lanadi."
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Aloqa va Korporativ Hamkorlik Markazi — Prava Online"
        description="Avtomaktablar, o'quv markazlari va tashkilotlar uchun rasmiy aloqa va hamkorlik markazi. Telefon: +998 99 391 25 05, Telegram: @pravaonlineuz, Email: info@pravaonline.uz."
        keywords="prava online aloqa, avtomaktab hamkorlik, prava desktop o'rnatish, prava online qo'llab-quvvatlash, prava enterprise aloqa"
        canonical="/contact"
      />

      <div className="saas-page-container">
        {/* Header Block */}
        <div className="saas-header-block">
          <div className="saas-badge-pill">
            <IconBuildingCommunity size={13} />
            <span>{t("contact.badge", "Professional Aloqa va Hamkorlik Markazi")}</span>
          </div>
          <h1 className="saas-page-title">
            {t("contact.title", "Biz bilan bog'laning va hamkorlikni boshlang")}
          </h1>
          <p className="saas-page-subtitle">
            {t(
              "contact.subtitle",
              "Avtomaktablar, o'quv markazlari va korporativ hamkorlar uchun institutsional yechimlar, texnik yordam hamda tezkor konsultatsiya."
            )}
          </p>
        </div>

        {/* Priority Direct Contact Channels (Forma to'ldirmasdan ham bog'lanish) */}
        <div style={{ marginBottom: 48 }}>
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            c="var(--primary)"
            ta="center"
            mb={6}
            style={{ letterSpacing: "1px" }}
          >
            {t("contact.directChannelsBadge", "To'g'ridan-to'g'ri aloqa kanallari")}
          </Text>
          <Title order={2} ta="center" size="h4" mb="lg">
            {t("contact.directChannelsTitle", "Forma to'ldirmasdan darhol bog'lanishingiz mumkin")}
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {directChannels.map((c, idx) => (
              <EnterpriseContactCard
                key={idx}
                icon={c.icon}
                color="blue"
                label={c.title}
                value={c.value}
                sub={c.desc}
                badge={c.badge}
                href={c.link}
                external={c.link?.startsWith("http")}
                ariaLabel={c.title}
              />
            ))}

            {/* Tech Support Routing */}
            <EnterpriseContactCard
              icon={IconSparkles}
              color="blue"
              label={t("contact.routingTitle", "Bo'limlar bo'yicha yo'naltirish")}
              value={t("contact.talkToDirector", "@pravaonlineuz ga yozish")}
              sub={t("contact.techSupportDesc", "Dasturni o'rnatish va tarmoq sozlamalari.")}
              href="https://t.me/pravaonlineuz"
              external
              badge="Direct"
              ariaLabel={t("contact.routingTitle", "Bo'limlar bo'yicha yo'naltirish")}
            />
          </SimpleGrid>
        </div>

        {/* Trust Section: "Nima uchun biz bilan bog'lanishadi?" */}
        <div style={{ marginBottom: 56 }}>
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            c="var(--primary)"
            ta="center"
            mb={6}
            style={{ letterSpacing: "1px" }}
          >
            {t("contact.trustBadge", "Ishonch va Hamkorlik")}
          </Text>
          <Title order={2} ta="center" size="h3" mb="xl">
            {t("contact.trustTitle", "Nima uchun biz bilan bog'lanishadi?")}
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {trustPillars.map((p, idx) => {
              const IconComp = p.icon;
              return (
                <div
                  key={idx}
                  className="saas-card"
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    padding: "24px 20px",
                  }}
                >
                  <ThemeIcon size={40} radius="md" color={p.color} variant="light" mb="sm">
                    <IconComp size={20} />
                  </ThemeIcon>
                  <Text fw={700} size="sm" mb="xs">
                    {p.title}
                  </Text>
                  <Text size="xs" c="dimmed" lh={1.6} style={{ flex: 1 }}>
                    {p.desc}
                  </Text>
                </div>
              );
            })}
          </SimpleGrid>
        </div>

        {/* Partnership Form & Enterprise Contact Hub */}
        <div id="inquiry-form" style={{ marginBottom: 48 }}>
          <Grid gutter="xl" align="stretch">
            {/* Left: Form or Corporate Success Card */}
            <Grid.Col span={{ base: 12, lg: 7 }}>
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
                      {t("contact.successTitle", "So‘rovingiz muvaffaqiyatli qabul qilindi")}
                    </Title>
                    <Badge
                      size="xl"
                      variant="filled"
                      color="blue"
                      radius="md"
                      style={{ fontFamily: "monospace", letterSpacing: 1 }}
                    >
                      {t("contact.ticketLabel", "Murojaat raqami")}: #{ticketId}
                    </Badge>
                    <Text size="sm" c="dimmed" ta="center" maw={480} lh={1.6}>
                      {t(
                        "contact.successDesc",
                        "Mutaxassisimiz 1 ish kuni ichida siz bilan bog‘lanadi."
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
                      <Text
                        size="xs"
                        fw={700}
                        c="dimmed"
                        tt="uppercase"
                        mb="xs"
                        style={{ letterSpacing: "0.5px" }}
                      >
                        {t("contact.summaryTitle", "Yuborilgan so'rov tafsilotlari:")}
                      </Text>
                      <Stack gap={6}>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("contact.orgName", "Tashkilot")}:</Text>
                          <Text size="xs" fw={600}>{organization}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("contact.contactPerson", "Mas'ul shaxs")}:</Text>
                          <Text size="xs" fw={600}>{fullName}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("contact.phone", "Telefon")}:</Text>
                          <Text size="xs" fw={600}>{phone}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("contact.orgType", "Tashkilot turi")}:</Text>
                          <Text size="xs" fw={600}>{getOrgTypeName(organizationType)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("contact.region", "Hudud")}:</Text>
                          <Text size="xs" fw={600}>{getRegionName(region)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">Telegram:</Text>
                          <Text size="xs" fw={600}>{telegram.trim() || t("contact.notSpecified", "Ko‘rsatilmagan")}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">{t("contact.computerCount", "Kompyuterlar soni")}:</Text>
                          <Text size="xs" fw={600}>{computerCount ? (computerCount + " ta") : t("contact.notSpecified", "Ko‘rsatilmagan")}</Text>
                        </Group>
                      </Stack>
                    </Box>

                    {/* Corporate Action Buttons */}
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
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
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
                          {t("contact.btnTelegram", "Telegram orqali bog‘lanish")}
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
                          {t("contact.btnEmail", "Email yozish")}
                        </Button>
                      </SimpleGrid>
                      <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        onClick={handleResetForm}
                        leftSection={<IconRefresh size={14} />}
                        mt={4}
                      >
                        {t("contact.sendAnother", "Yangi so'rov yuborish")}
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <div>
                    <Box mb="lg">
                      <div className="saas-badge-pill" style={{ marginBottom: 8 }}>
                        <IconShieldCheck size={13} />
                        <span>{t("contact.crmBadge", "Hamkorlik Markazi")}</span>
                      </div>
                      <Title order={2} style={{ fontSize: "1.35rem", marginBottom: 6 }}>
                        {t("contact.formMainTitle", "Hamkorlik so'rovini yuborish")}
                      </Title>
                      <Text size="xs" c="dimmed" lh={1.6}>
                        {t(
                          "contact.formMainSubtitle",
                          "Quyidagi ma'lumotlarni to'ldiring. So'rovingiz to'g'ridan-to'g'ri mas'ul mutaxassisga yo'naltiriladi va 1 ish kuni ichida aloqaga chiqiladi."
                        )}
                      </Text>
                    </Box>

                    <form onSubmit={handleSubmit}>
                      <Stack gap="md">
                        {validationError && (
                          <Alert
                            icon={<IconAlertCircle size={16} />}
                            color="red"
                            radius="md"
                            title={t("common.error", "Xatolik")}
                            py="xs"
                          >
                            {validationError}
                          </Alert>
                        )}

                        {/* Organization & Contact Person */}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          <TextInput
                            label={t("contact.orgName", "Tashkilot nomi")}
                            placeholder={t("contact.orgNamePlaceholder", "Masalan: Avto-Lider MCHJ")}
                            required
                            value={organization}
                            onChange={(e) => setOrganization(e.currentTarget.value)}
                            leftSection={<IconBuildingCommunity size={16} />}
                          />
                          <TextInput
                            label={t("contact.contactPerson", "Mas'ul shaxs (F.I.Sh.)")}
                            placeholder={t("contact.contactPersonPlaceholder", "Ism va familiyangiz")}
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.currentTarget.value)}
                            leftSection={<IconUser size={16} />}
                          />
                        </SimpleGrid>

                        {/* Phone & Organization Type */}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          <TextInput
                            label={t("contact.phone", "Telefon raqami")}
                            placeholder="+998 90 123 45 67"
                            required
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.currentTarget.value)}
                            leftSection={<IconPhone size={16} />}
                          />
                          <Select
                            label={t("contact.orgType", "Tashkilot turi")}
                            value={organizationType}
                            onChange={setOrganizationType}
                            data={orgTypeOptions}
                            required
                          />
                        </SimpleGrid>

                        {/* Region & Telegram (Optional) */}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          <Select
                            label={
                              <Group gap={4}>
                                <span>{t("contact.region", "Hudud")}</span>
                                <Text size="xs" c="dimmed" inherit>
                                  {t("contact.optionalNotice", "(ixtiyoriy)")}
                                </Text>
                              </Group>
                            }
                            value={region}
                            onChange={setRegion}
                            data={regionOptions}
                            searchable
                            clearable
                          />
                          <TextInput
                            label={
                              <Group gap={4}>
                                <span>{t("contact.telegram", "Telegram username")}</span>
                                <Text size="xs" c="dimmed" inherit>
                                  {t("contact.optionalNotice", "(ixtiyoriy)")}
                                </Text>
                              </Group>
                            }
                            placeholder="@username"
                            value={telegram}
                            onChange={(e) => handleTelegramChange(e.currentTarget.value)}
                            leftSection={<IconAt size={16} />}
                          />
                        </SimpleGrid>

                        {/* Computer Workstations Count */}
                        <div>
                          <Text size="sm" fw={500} mb={6}>
                            {t("contact.computerCount", "Kompyuterlar soni")}
                          </Text>
                          <SegmentedControl
                            fullWidth
                            value={computerCount}
                            onChange={setComputerCount}
                            data={[
                              { label: t("contact.compOpt1", "1 – 10 ta"), value: "10" },
                              { label: t("contact.compOpt2", "11 – 30 ta"), value: "30" },
                              { label: t("contact.compOpt3", "30 tadan ortiq"), value: "50" },
                            ]}
                          />
                        </div>

                        {/* Comment */}
                        <Textarea
                          label={
                            <Group gap={4}>
                              <span>{t("contact.comment", "Izoh yoki qo'shimcha talablar")}</span>
                              <Text size="xs" c="dimmed" inherit>
                                {t("contact.optionalNotice", "(ixtiyoriy)")}
                              </Text>
                            </Group>
                          }
                          placeholder={t(
                            "contact.commentPlaceholder",
                            "Dasturni joriy qilish muddatlari, mavjud kompyuterlar xususiyatlari yoki savollaringiz..."
                          )}
                          minRows={3}
                          value={comment}
                          onChange={(e) => setComment(e.currentTarget.value)}
                        />

                        {/* Submit Button with UX feedback */}
                        <Button
                          type="submit"
                          size="md"
                          radius="md"
                          h={44}
                          loading={isSubmitting}
                          disabled={isSubmitting}
                          className="saas-btn-primary"
                          rightSection={<IconSend size={16} />}
                          mt="xs"
                        >
                          {isSubmitting
                            ? t("contact.sending", "Yuborilmoqda...")
                            : t("contact.submitBtn", "Hamkorlik so‘rovini yuborish")}
                        </Button>
                      </Stack>
                    </form>
                  </div>
                )}
              </div>
            </Grid.Col>

            {/* Right: Contact Hub (Identical to Partners) */}
            <Grid.Col span={{ base: 12, lg: 5 }}>
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
                    <Text
                      size="xs"
                      fw={700}
                      tt="uppercase"
                      c="var(--primary)"
                      style={{ letterSpacing: "1px" }}
                    >
                      {t("contact.contactHubBadge", "24/7 texnik va konsultativ yordam")}
                    </Text>
                  </Group>
                  <Title order={3} size="h3" mb="xs">
                    {t("contact.contactHubTitle", "Mutaxassis bilan bog‘lanish")}
                  </Title>
                  <Text size="xs" c="dimmed" lh={1.6} mb="lg">
                    {t(
                      "contact.contactHubDesc",
                      "Hamkorlik, dasturni joriy etish, savollar va texnik yordam bo‘yicha to‘g‘ridan-to‘g‘ri bog‘laning."
                    )}
                  </Text>

                  <Stack gap="sm">
                    {/* Phone */}
                    <EnterpriseContactCard
                      icon={IconPhone}
                      color="blue"
                      label={t("contact.contactPhoneLabel", "Telefon raqami")}
                      value="+998 99 391 25 05"
                      sub={t("contact.contactPhoneSub", "24/7 qo‘ng‘iroqlar qabul qilinadi")}
                      href="tel:+998993912505"
                      ariaLabel="Telefon orqali bog'lanish"
                    />

                    {/* Telegram */}
                    <EnterpriseContactCard
                      icon={IconBrandTelegram}
                      color="blue"
                      label={t("contact.contactTgLabel", "Telegram orqali aloqa")}
                      value="@pravaonlineuz"
                      sub={t("contact.contactTgSub", "Tezkor yozishmalar va konsultatsiyalar")}
                      href="https://t.me/pravaonlineuz"
                      external
                      ariaLabel="Telegram orqali bog'lanish"
                    />

                    {/* Email */}
                    <EnterpriseContactCard
                      icon={IconMail}
                      color="blue"
                      label={t("contact.contactEmailLabel", "Elektron pochta")}
                      value="info@pravaonline.uz"
                      sub={t("contact.contactEmailSub", "Rasmiy tijorat va hamkorlik murojaatlari")}
                      href="mailto:info@pravaonline.uz"
                      ariaLabel="Email orqali bog'lanish"
                    />

                    {/* Working Hours */}
                    <EnterpriseContactCard
                      icon={IconClock}
                      color="blue"
                      label={t("contact.contactHoursLabel", "Ish vaqti")}
                      value="24/7"
                      badge={t("contact.activeBadge", "Faol")}
                      sub={t("contact.contactHoursSub", "Sutka davomida murojaatlar qabul qilinadi")}
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
                      <Text size="xs" c="dimmed">
                        {t("contact.guarantee1", "Bepul konsultatsiya va demo namoyish")}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <IconCheck size={14} color="var(--primary)" />
                      <Text size="xs" c="dimmed">
                        {t("contact.guarantee2", "Tashkilot talablariga individual moslashuv")}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <IconCheck size={14} color="var(--primary)" />
                      <Text size="xs" c="dimmed">
                        {t("contact.guarantee3", "Rasmiy shartnoma va to'liq hujjatlar to'plami")}
                      </Text>
                    </Group>
                  </Stack>
                </Box>
              </div>
            </Grid.Col>
          </Grid>
        </div>

        {/* Quick FAQ - Full Width Section below the Grid */}
        <div style={{ marginTop: 64, marginBottom: 64 }}>
          <Box ta="center" mb="lg">
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c="var(--primary)"
              mb={6}
              style={{ letterSpacing: "1px" }}
            >
              {t("contact.faqSectionBadge", "Savol-Javoblar")}
            </Text>
            <Title order={2} size="h3" mb="xs">
              {t("contact.faqSectionTitle", "Ko'p beriladigan savollar")}
            </Title>
            <Text size="sm" c="dimmed" maw={600} mx="auto" lh={1.6}>
              {t(
                "contact.faqSectionSubtitle",
                "Prava Online platformasi va Desktop dasturiy ta'minotiga oid asosiy savollarga javoblar"
              )}
            </Text>
          </Box>

          <div
            className="saas-card"
            style={{
              maxWidth: 820,
              margin: "0 auto",
              padding: "24px 28px",
            }}
          >
            <Accordion variant="separated" radius="md">
              {quickResolutions.map((item) => (
                <Accordion.Item key={item.id} value={item.id}>
                  <Accordion.Control style={{ fontSize: 13, fontWeight: 600 }}>
                    {item.question}
                  </Accordion.Control>
                  <Accordion.Panel
                    style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}
                  >
                    {item.answer}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>

            <Group justify="center" mt="xl">
              <Anchor
                component={Link}
                to="/faq"
                size="sm"
                fw={600}
                c="var(--primary)"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span>{t("contact.viewAllFaq", "Barcha savol-javoblar (FAQ)")}</span>
                <IconArrowRight size={14} />
              </Anchor>
            </Group>
          </div>
        </div>
      </div>
    </>
  );
}
