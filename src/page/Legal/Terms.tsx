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

export default function Terms_Page() {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title="Foydalanish shartlari - Prava Online"
        description="Prava Online platformasidan foydalanish shartlari va qoidalari. Foydalanuvchi huquqlari, majburiyatlari va to'lov shartlari."
        keywords="prava online foydalanish shartlari, terms of service prava online, ommaviy oferta prava"
        canonical="/terms"
      />

      <Container size="md" py={{ base: 40, sm: 60 }}>
        <Paper withBorder radius="lg" p={{ base: "lg", sm: "xl" }} style={{ background: "var(--card-bg)" }}>
          <Stack gap="md">
            <Badge size="lg" radius="xl" variant="light" color="blue">
              {t("legal.termsBadge", "Ommaviy Oferta")}
            </Badge>
            <Title order={1} style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
              {t("legal.termsTitle", "Foydalanish Shartlari va Qoidalari")}
            </Title>
            <Text size="xs" c="dimmed">
              {t("legal.lastUpdated", "Oxirgi yangilanish: 2026-yil 1-yanvar")}
            </Text>

            <Divider my="sm" />

            <Title order={3} size="h4" mt="xs">
              {t("legal.terms.sec1Title", "1. Umumiy qoidalar")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.terms.sec1Text", "Ushbu shartnoma Prava Online (keyingi o'rinlarda 'Platforma') va undan foydalanuvchi shaxs (keyingi o'rinlarda 'Foydalanuvchi') o'rtasidagi huquqiy munosabatlarni tartibga soladi. Platformada ro'yxatdan o'tish yoki xizmatlardan foydalanish orqali siz mazkur shartlarga to'liq va so'zsiz rozilik bildirasiz.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.terms.sec2Title", "2. Xizmat ko'rsatish predmeti")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.terms.sec2Text", "Platforma foydalanuvchilarga O'zbekiston Respublikasi Yo'l harakati qoidalariga oid nazariy savollar, test biletlari, statistik tahlillar va simulyatsiya imtihonlari orqali haydovchilik guvohnomasi nazariy imtihoniga tayyorgarlik ko'rish bo'yicha axborot-ta'lim xizmatlarini taqdim etadi.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.terms.sec3Title", "3. Foydalanuvchi hisob qaydnomasi (Akkaunt)")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.terms.sec3Text", "Foydalanuvchi o'z login ma'lumotlarining maxfiyligini saqlashga shaxsan javobgardir. Bitta hisob qaydnomasidan faqat bitta foydalanuvchi shaxsiy ta'lim olish maqsadida foydalanishi mumkin. Akkauntni uchinchi shaxslarga berish yoki tijorat maqsadlarida qayta sotish qat'iyan taqiqlanadi.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.terms.sec4Title", "4. To'lovlar va xizmat tariflari")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.terms.sec4Text", "Pullik xizmatlar (premium paketlar) to'liq oldindan to'lov asosida amalga oshiriladi. To'lovlar Click, Payme, Uzum Bank yoki boshqa ruxsat etilgan elektron to'lov tizimlari orqali qabul qilinadi. To'lov tasdiqlangandan so'ng tegishli tarif bo'yicha kirish huquqi zudlik bilan taqdim etiladi.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.terms.sec5Title", "5. Intellektual mulk huquqlari")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.terms.sec5Text", "Platformadagi barcha matnlar, illyustratsiyalar, interfeys dizayni, dasturiy kodlar va savollar tizimlashtirilishi intellektual mulk obyekti hisoblanadi va qonun bilan himoyalangan. Ularni platforma ma'muriyatining yozma ruxsatisiz ko'chirish, nusxalash yoki tarqatish taqiqlanadi.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.terms.sec6Title", "6. Javobgarlikni cheklash")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.terms.sec6Text", "Platforma o'quvchilarga imtihon talablariga mos yuqori sifatli tayyorgarlik vositasini taqdim etadi, biroq davlat YHXX markazlarida o'tkaziladigan yakuniy imtihon natijalari uchun bevosita huquqiy kafolat bermaydi. Yakuniy natija foydalanuvchining shaxsiy mehnati va bilimiga bog'liq.")}
            </Text>

            <Title order={3} size="h4" mt="xs">
              {t("legal.terms.sec7Title", "7. Bog'lanish")}
            </Title>
            <Text size="sm" c="dimmed" lh={1.8}>
              {t("legal.terms.sec7Text", "Shartlar yuzasidan har qanday savol yoki takliflar bo'yicha bizga +998 99 391 25 05 telefon raqami yoki @pravaonlineuz Telegram rasmiy manzili orqali murojaat qilishingiz mumkin.")}
            </Text>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
