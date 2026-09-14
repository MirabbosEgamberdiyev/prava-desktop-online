import {
  Badge,
  Container,
  Divider,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import SEO from "../../components/common/SEO";

export default function Privacy_Page() {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title="Maxfiylik siyosati - Prava Online"
        description="Prava Online platformasida shaxsiy ma'lumotlarning xavfsizligi va maxfiylik siyosati. Biz sizning ma'lumotlaringizni qanday himoya qilamiz."
        keywords="prava online maxfiylik siyosati, privacy policy prava, shaxsiy ma'lumotlar xavfsizligi"
        canonical="/privacy"
      />

      <Container size="md" py={{ base: 40, sm: 60 }}>
        <Paper withBorder radius="lg" p={{ base: "lg", sm: "xl" }} style={{ background: "var(--card-bg)" }}>
          <Stack gap="md">
            <Badge size="lg" radius="xl" variant="light" color="teal">
              {t("legal.privacyBadge", "Xavfsizlik Kafolati")}
            </Badge>
            <Title order={1} style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
              {t("legal.privacyTitle", "Maxfiylik Siyosati")}
            </Title>
            <Text size="xs" c="dimmed">
              {t("legal.lastUpdated", "Oxirgi yangilanish: 2026-yil 1-yanvar")}
            </Text>

            <Divider my="sm" />

            <Title order={3} size="h4" mt="xs">
              {t("legal.privacy.sec1Title", "1. Qanday ma'lumotlarni to'playmiz?")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.privacy.sec1Text", "Platformada ro'yxatdan o'tganingizda siz taqdim etgan ism, familiya, telefon raqami, elektron pochta manzili hamda test natijalari, imtihon tarixi va o'rganish statistikasi kabi ma'lumotlar saqlanadi.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.privacy.sec2Title", "2. Ma'lumotlardan foydalanish maqsadi")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.privacy.sec2Text", "Yig'ilgan ma'lumotlar faqatgina sizga sifatli ta'lim xizmatini taqdim etish, profilingizni himoya qilish, shaxsiy imtihon statistikangizni ko'rsatish va platforma xizmatlarini yaxshilash maqsadida ishlatiladi.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.privacy.sec3Title", "3. Bank kartalari va to'lov ma'lumotlari")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.privacy.sec3Text", "Prava Online sizning bank kartangiz raqami, PIN-kodi yoki boshqa maxfiy to'lov rekvizitlarini o'z serverlarida SAQLAMAYDI. Barcha to'lovlar O'zbekiston Respublikasi Markaziy Banki litsenziyasiga ega Click, Payme yoki Uzum to'lov shlyuzlari orqali xavfsiz shifrlangan kanal (PCI-DSS) orqali amalga oshiriladi.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.privacy.sec4Title", "4. Ma'lumotlarning uchinchi shaxslarga berilmasligi")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.privacy.sec4Text", "Biz foydalanuvchilarning shaxsiy ma'lumotlarini uchinchi shaxslarga sotmaymiz, ijaraga bermaymiz va qonunchilikda belgilangan hollar (sud va huquqni muhofaza qiluvchi organlar rasmiy talabi) bundan mustasno.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.privacy.sec5Title", "5. Foydalanuvchi huquqlari")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.privacy.sec5Text", "Siz istalgan vaqtda shaxsiy ma'lumotlaringizni ko'rish, tahrirlash yoki o'chirishni talab qilish huquqiga egasiz. Bu bo'yicha bizning qo'llab-quvvatlash xizmatimizga murojaat qilishingiz mumkin.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.privacy.sec6Title", "6. Xavfsizlik choralari")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.privacy.sec6Text", "Biz ma'lumotlaringizni ruxsatsiz kirish, o'zgartirish yoki yo'qotishdan himoya qilish uchun zamonaviy SSL/TLS shifrlash protokollari va xavfsiz server infratuzilmasidan foydalanamiz.")}
            </Text>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
