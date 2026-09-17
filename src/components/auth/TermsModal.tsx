import { Modal, Stack, Title, Text, Button, ScrollArea, Group, ThemeIcon } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconFileText, IconShieldCheck } from "@tabler/icons-react";

interface TermsModalProps {
  opened: boolean;
  onClose: () => void;
  type: "terms" | "privacy";
}

export default function TermsModal({ opened, onClose, type }: TermsModalProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const isTerms = type === "terms";

  const getTitle = () => {
    if (isTerms) {
      return lang === "ru"
        ? "Условия использования"
        : lang === "uzc"
        ? "Фойдаланиш шартлари"
        : "Foydalanish shartlari";
    }
    return lang === "ru"
      ? "Политика конфиденциальности"
      : lang === "uzc"
      ? "Махфийлик сиёсати"
      : "Maxfiylik siyosati";
  };

  const getContent = () => {
    if (isTerms) {
      if (lang === "ru") {
        return (
          <Stack gap="sm">
            <Text fw={700} fz={15}>1. Общие положения</Text>
            <Text fz={13.5} c="dimmed">
              Платформа Prava Online предназначена для подготовки к теоретическому экзамену по правилам дорожного движения в Республике Узбекистан. Все тестовые задания и материалы соответствуют действующим стандартам.
            </Text>
            <Text fw={700} fz={15}>2. Использование аккаунта</Text>
            <Text fz={13.5} c="dimmed">
              Пользователь обязуется предоставлять достоверные данные при регистрации. Доступ к аккаунту является персональным и не подлежит передаче третьим лицам.
            </Text>
            <Text fw={700} fz={15}>3. Интеллектуальная собственность</Text>
            <Text fz={13.5} c="dimmed">
              Все графические иллюстрации дорожных ситуаций, алгоритмы симуляции экзамена и обучающие материалы защищены авторским правом платформы Prava Online.
            </Text>
          </Stack>
        );
      }
      if (lang === "uzc") {
        return (
          <Stack gap="sm">
            <Text fw={700} fz={15}>1. Умумий қоидалар</Text>
            <Text fz={13.5} c="dimmed">
              Prava Online таълим платформаси Ўзбекистон Республикасида йўл ҳаракати қоидалари бўйича назарий имтиҳонларга сифатли тайёргарлик кўриш учун мўлжалланган. Барча тест саволлари амалдаги давлат стандартларига тўлиқ мос келади.
            </Text>
            <Text fw={700} fz={15}>2. Фойдаланувчи ҳисоби</Text>
            <Text fz={13.5} c="dimmed">
              Рўйхатдан ўтишда тўғри маълумотларни киритиш талаб этилади. Ҳисоб қайдномасидан шахсий мақсадларда фойдаланилади ва учинчи шахсларга берилиши тақиқланади.
            </Text>
            <Text fw={700} fz={15}>3. Муаллифлик ҳуқуқлари</Text>
            <Text fz={13.5} c="dimmed">
              Платформадаги барча график иллюстрациялар, имтиҳон симулятори алгоритмлари ва методик тушунтиришлар муаллифлик ҳуқуқи билан ҳимояланган.
            </Text>
          </Stack>
        );
      }
      return (
        <Stack gap="sm">
          <Text fw={700} fz={15}>1. Umumiy qoidalar</Text>
          <Text fz={13.5} c="dimmed">
            Prava Online ta'lim platformasi O'zbekiston Respublikasida yo'l harakati qoidalari bo'yicha nazariy imtihonlarga sifatli tayyorgarlik ko'rish uchun mo'ljallangan. Barcha test savollari amaldagi davlat standartlariga to'liq mos keladi.
          </Text>
          <Text fw={700} fz={15}>2. Foydalanuvchi hisobi</Text>
          <Text fz={13.5} c="dimmed">
            Ro'yxatdan o'tishda to'g'ri ma'lumotlarni kiritish talab etiladi. Hisob qaydnomasidan shaxsiy maqsadlarda foydalaniladi va u uchinchi shaxslarga berilishi taqiqlanadi.
          </Text>
          <Text fw={700} fz={15}>3. Mualliflik huquqlari</Text>
          <Text fz={13.5} c="dimmed">
            Platformadagi barcha grafik illyustratsiyalar, imtihon simulyatori algoritmlari va metodik tushuntirishlar mualliflik huquqi bilan himoyalangan.
          </Text>
        </Stack>
      );
    }

    // Privacy Policy
    if (lang === "ru") {
      return (
        <Stack gap="sm">
          <Text fw={700} fz={15}>1. Сбор и защита данных</Text>
          <Text fz={13.5} c="dimmed">
            Мы собираем только необходимые данные (номер телефона или email, имя) исключительно для аутентификации, сохранения прогресса обучения и персонализации тестов.
          </Text>
          <Text fw={700} fz={15}>2. Безопасность</Text>
          <Text fz={13.5} c="dimmed">
            Все соединения защищены 256-битным SSL-шифрованием. Пароли хранятся в зашифрованном виде (BCrypt), а сессии защищены безопасными токенами.
          </Text>
          <Text fw={700} fz={15}>3. Конфиденциальность</Text>
          <Text fz={13.5} c="dimmed">
            Ваши персональные данные никогда не передаются и не продаются третьим лицам или рекламным сетям.
          </Text>
        </Stack>
      );
    }
    if (lang === "uzc") {
      return (
        <Stack gap="sm">
          <Text fw={700} fz={15}>1. Маълумотларни йиғиш ва ҳимоя қилиш</Text>
          <Text fz={13.5} c="dimmed">
            Биз фақатгина шахсийлаштириш, аутентификация ва тест натижаларини сақлаш учун зарур бўлган маълумотларни (телефон рақами ёки email, исм) йиғамиз.
          </Text>
          <Text fw={700} fz={15}>2. Хавфсизлик</Text>
          <Text fz={13.5} c="dimmed">
            Барча алоқалар 256-битли SSL шифрлаш орқали ҳимояланган. Пароллар хавфсиз алгоритмлар (BCrypt) билан сақланади ва сессиялар токенлар орқали бошқарилади.
          </Text>
          <Text fw={700} fz={15}>3. Махфийлик кафолати</Text>
          <Text fz={13.5} c="dimmed">
            Сизнинг шахсий маълумотларингиз ҳеч қачон учинчи томонларга ёки реклама компанияларига берилмайди.
          </Text>
        </Stack>
      );
    }
    return (
      <Stack gap="sm">
        <Text fw={700} fz={15}>1. Ma'lumotlarni yig'ish va himoya qilish</Text>
        <Text fz={13.5} c="dimmed">
          Biz faqatgina shaxsiylashtirish, autentifikatsiya va test natijalarini saqlash uchun zarur bo'lgan ma'lumotlarni (telefon raqami yoki email, ism) yig'amiz.
        </Text>
        <Text fw={700} fz={15}>2. Xavfsizlik</Text>
        <Text fz={13.5} c="dimmed">
          Barcha aloqalar 256-bitli SSL shifrlash orqali himoyalangan. Parollar xavfsiz algoritmlar (BCrypt) bilan saqlanadi va sessiyalar tokenlar orqali boshqariladi.
        </Text>
        <Text fw={700} fz={15}>3. Maxfiylik kafolati</Text>
        <Text fz={13.5} c="dimmed">
          Sizning shaxsiy ma'lumotlaringiz hech qachon uchinchi tomonlarga yoki reklama kompaniyalariga berilmaydi.
        </Text>
      </Stack>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="md" color="blue" variant="light" radius="md">
            {isTerms ? <IconFileText size={18} /> : <IconShieldCheck size={18} />}
          </ThemeIcon>
          <Title order={4} fw={700} fz={16}>
            {getTitle()}
          </Title>
        </Group>
      }
      centered
      radius="lg"
      size="md"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <ScrollArea.Autosize mah={360} type="auto" offsetScrollbars>
        {getContent()}
      </ScrollArea.Autosize>

      <Button fullWidth mt="md" radius="md" color="blue" onClick={onClose}>
        {lang === "ru" ? "Понятно" : lang === "uzc" ? "Тушунарли" : "Tushundim"}
      </Button>
    </Modal>
  );
}
