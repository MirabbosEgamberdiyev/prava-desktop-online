import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Center,
  Loader,
  Text,
  Title,
  Button,
  Group,
  Paper,
  Stack,
  ThemeIcon,
  Container,
  Alert,
  Modal,
  SimpleGrid,
  RingProgress,
  Divider,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconSparkles,
  IconUserPlus,
  IconChartBar,
  IconHome,
  IconCheck,
  IconX,
  IconClock,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import SEO from "../../components/common/SEO";
import { QuizContent } from "../../components/quiz/QuizContent";
import { QuizNav } from "../../components/quiz/QuizNav";
import api from "../../api/api";
import type { Question, AnswersMap } from "../../types";

const GUEST_EXAM_KEY = "guestExamCount";

const GuestExamPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [guestResultOpened, setGuestResultOpened] = useState(false);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const count = parseInt(localStorage.getItem(GUEST_EXAM_KEY) || "0", 10);
    if (count >= 1) {
      setLimitReached(true);
      setLoading(false);
      return;
    }

    /*
     * BUG FIX: avval xom `fetch("/api/v1/public/guest-exam")` ishlatilardi va
     * `ENV.API_BASE_URL` ni butunlay chetlab o'tardi. API boshqa originda
     * joylashtirilsa (masalan staging yoki alohida API domeni), bepul sinov
     * imtihoni — asosiy jalb qilish sahifasi — ishlamay qolardi.
     * Endi umumiy `api` instansi ishlatiladi (baseURL + Accept-Language +
     * yagona xato ishlov berish).
     */
    api
      .get("/api/v1/public/guest-exam")
      .then((res) => {
        const exam = res.data?.data;
        if (!exam?.questions?.length) throw new Error("No questions");
        setQuestions(exam.questions);
        setDurationMinutes(exam.durationMinutes ?? 20);
        // Limit hisoblagichi FAQAT imtihon muvaffaqiyatli yuklangandan keyin
        // oshiriladi (avval ham shunday edi) — tarmoq xatosi foydalanuvchining
        // yagona bepul urinishini yeb qo'ymasin.
        localStorage.setItem(GUEST_EXAM_KEY, String(count + 1));
      })
      .catch(() => {
        setError(t("exam.loadError"));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRetryGuestExam = () => {
    localStorage.removeItem(GUEST_EXAM_KEY);
    setLimitReached(false);
    setLoading(true);
    api
      .get("/api/v1/public/guest-exam")
      .then((res) => {
        const exam = res.data?.data;
        if (!exam?.questions?.length) throw new Error("No questions");
        setQuestions(exam.questions);
        setDurationMinutes(exam.durationMinutes ?? 20);
        setAnswers({});
        setGuestResultOpened(false);
        localStorage.setItem(GUEST_EXAM_KEY, "1");
      })
      .catch(() => {
        setError(t("exam.loadError"));
      })
      .finally(() => setLoading(false));
  };

  const handleAnswerSelect = (
    questionIndex: number,
    optionIndex: number,
    timeSpentSeconds: number,
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: { optionIndex, timeSpentSeconds },
    }));
  };

  const handleReset = () => setAnswers({});
  const handleFinish = () => setGuestResultOpened(true);

  const { correctCount, incorrectCount, unansweredCount } = useMemo(() => {
    const correct = questions.reduce((count, q, i) => {
      return count + (answers[i]?.optionIndex === q.correctOptionIndex ? 1 : 0);
    }, 0);
    const answered = Object.keys(answers).length;
    return {
      correctCount: correct,
      incorrectCount: answered - correct,
      unansweredCount: questions.length - answered,
    };
  }, [questions, answers]);

  const correctPercentage =
    questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

  const scoreColor =
    correctPercentage >= 90 ? "green" : correctPercentage >= 60 ? "yellow" : "red";

  if (loading) {
    return (
      <Center h="100vh" style={{ background: "var(--bg)" }}>
        <Box ta="center">
          <Loader size="lg" mb="md" />
          <Text c="dimmed">{t("common.loading", "Savollar yuklanmoqda...")}</Text>
        </Box>
      </Center>
    );
  }

  if (limitReached) {
    return (
      <Center h="100vh" style={{ background: "var(--bg)", padding: 16 }}>
        <Container size="xs">
          <Paper p="xl" radius="lg" withBorder shadow="sm" ta="center" style={{ background: "var(--surface)" }}>
            <ThemeIcon size={56} radius="xl" color="blue" variant="light" mb="md" mx="auto">
              <IconSparkles size={28} />
            </ThemeIcon>
            <Title order={2} size="h3" mb="xs">
              {t("guestExam.completedTitle", "Sinov imtihoni yakunlandi")}
            </Title>
            <Text size="sm" c="dimmed" mb="lg" lh={1.6}>
              {t(
                "guestExam.registerPromptFull",
                "Siz bepul sinov imtihonidan foydalandingiz. Barcha 70 ta rasmiy bilet, xatolar ustida ishlash, cheksiz marafon va natijalaringizni doimiy saqlab borish uchun bepul ro'yxatdan o'ting."
              )}
            </Text>
            <Stack gap="sm">
              <Button
                size="md"
                radius="md"
                h={44}
                leftSection={<IconUserPlus size={18} />}
                onClick={() => navigate("/auth/register")}
              >
                {t("register.register", "Bepul ro'yxatdan o'tish")}
              </Button>
              <Button
                variant="light"
                size="md"
                radius="md"
                h={44}
                onClick={() => navigate("/partners")}
              >
                {t("nav.corporate", "Avtomaktablar va Hamkorlik")}
              </Button>
              <Group justify="center" gap="md" mt="xs">
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  onClick={handleRetryGuestExam}
                >
                  {t("guestExam.tryAgain", "Sinovni qayta yechish")}
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  onClick={() => navigate("/")}
                >
                  {t("notFound.backHome", "Bosh sahifa")}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Container>
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100vh">
        <Box ta="center">
          <Title order={3} mb="md" c="red">
            {error}
          </Title>
          <Button onClick={() => navigate("/")}>
            {t("notFound.backHome")}
          </Button>
        </Box>
      </Center>
    );
  }

  if (questions.length === 0) {
    return (
      <Center h="100vh">
        <Box ta="center">
          <Title order={3} mb="md">
            {t("exam.notFound")}
          </Title>
          <Button onClick={() => navigate("/")}>
            {t("notFound.backHome")}
          </Button>
        </Box>
      </Center>
    );
  }

  return (
    <>
      <SEO
        title={t("guestExam.seoTitle")}
        description={t("guestExam.seoDescription")}
        keywords="prava test bepul, haydovchilik imtihoni sinash, YHXBB test online, prava sinov, бесплатный тест ПДД"
        canonical="/try-exam"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Quiz",
          name: "Haydovchilik guvohnomasi sinov imtihoni",
          description: "YHXBB imtihonini bepul sinab ko'ring - real imtihon formati",
          educationalLevel: "Beginner",
          inLanguage: ["uz", "ru", "en"],
          isAccessibleForFree: true,
          provider: { "@type": "Organization", name: "Prava Online", url: "https://pravaonline.uz" },
        }}
      />
      <QuizNav
        questions={questions}
        totalQuestions={questions.length}
        durationMinutes={durationMinutes}
        answers={answers}
        onReset={handleReset}
        backUrl="/"
        isSecureMode={false}
        onGuestFinish={() => setGuestResultOpened(true)}
        onGuestViewResults={() => setGuestResultOpened(true)}
      />
      <Alert
        icon={<IconAlertCircle size={16} />}
        color="yellow"
        mx="md"
        mt="xs"
        mb={0}
        radius="md"
      >
        {t("guestExam.resultNotSaved")}
      </Alert>
      <QuizContent
        questions={questions}
        onAnswerSelect={handleAnswerSelect}
        onFinish={handleFinish}
        selectedAnswers={answers}
        showExplanation={true}
        isSecureMode={false}
      />

      {/* Guest Result Modal */}
      <Modal
        opened={guestResultOpened}
        onClose={() => setGuestResultOpened(false)}
        centered
        size="420px"
        radius="lg"
        withCloseButton={true}
        padding="xl"
        title={
          <Text fw={700} size="lg">
            {t("exam.finishModal.title")}
          </Text>
        }
      >
        <Stack gap="lg">
          {/* Score ring */}
          <Stack align="center" gap="xs">
            <RingProgress
              size={120}
              thickness={10}
              roundCaps
              sections={[{ value: correctPercentage, color: scoreColor }]}
              label={
                <Box ta="center">
                  <Text size="xl" fw={900} lh={1} c={scoreColor}>
                    {correctCount}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    / {questions.length}
                  </Text>
                </Box>
              }
            />
            <Text fw={600} size="md" c={scoreColor} ta="center">
              {correctPercentage >= 90
                ? t("exam.result.passed", "Imtihondan o'tdingiz!")
                : t("exam.result.failed", "Imtihondan o'ta olmadingiz")}
            </Text>
            <Text size="xs" c="dimmed" ta="center" maw={320}>
              {correctPercentage >= 90
                ? t("guestExam.passedEncourage", "Ajoyib natija! Haqiqiy davlat imtihonida ham 18+ to'g'ri javob talab etiladi. Barcha 70 ta biletni to'liq o'zlashtirishni tavsiya etamiz.")
                : t("guestExam.failedEncourage", "Davlat imtihonidan o'tish uchun kamida 18 ta to'g'ri javob kerak. Xatolar ustida ishlab, bilimingizni 100% ga chiqaring.")}
            </Text>
          </Stack>

          {/* Stats */}
          <SimpleGrid cols={3} spacing="sm">
            <Stack
              align="center"
              gap={6}
              p="sm"
              style={{ borderRadius: 12, border: "1px solid var(--mantine-color-green-5)", background: "var(--surface)" }}
            >
              <ThemeIcon size={40} radius="xl" color="green" variant="light">
                <IconCheck size={20} />
              </ThemeIcon>
              <Text size="lg" fw={800} c="green">
                {correctCount}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {t("exam.correct", "To'g'ri")}
              </Text>
            </Stack>

            <Stack
              align="center"
              gap={6}
              p="sm"
              style={{ borderRadius: 12, border: "1px solid var(--mantine-color-red-5)", background: "var(--surface)" }}
            >
              <ThemeIcon size={40} radius="xl" color="red" variant="light">
                <IconX size={20} />
              </ThemeIcon>
              <Text size="lg" fw={800} c="red">
                {incorrectCount}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {t("exam.incorrect", "Noto'g'ri")}
              </Text>
            </Stack>

            <Stack
              align="center"
              gap={6}
              p="sm"
              style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <ThemeIcon size={40} radius="xl" color="gray" variant="light">
                <IconClock size={20} />
              </ThemeIcon>
              <Text size="lg" fw={800} c="dimmed">
                {unansweredCount}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {t("exam.unanswered", "Qoldirilgan")}
              </Text>
            </Stack>
          </SimpleGrid>

          <Divider />

          {/* Actions */}
          <Stack gap="xs">
            <Button
              fullWidth
              size="md"
              radius="md"
              h={44}
              color="blue"
              onClick={() => navigate("/auth/register")}
            >
              {t("guestExam.unlockAll", "Barcha 70 ta biletni ochish")}
            </Button>
            <Button
              fullWidth
              size="md"
              radius="md"
              h={44}
              variant="light"
              leftSection={<IconChartBar size={18} />}
              onClick={() => setGuestResultOpened(false)}
            >
              {t("exam.reviewAnswers", "Javoblarni ko'rish va tahlil qilish")}
            </Button>
            <Button
              fullWidth
              size="sm"
              radius="md"
              h={36}
              variant="subtle"
              color="gray"
              leftSection={<IconHome size={16} />}
              onClick={() => navigate("/")}
            >
              {t("notFound.backHome", "Bosh sahifa")}
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
};

export default GuestExamPage;
