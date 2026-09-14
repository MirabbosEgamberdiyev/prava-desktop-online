import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Grid,
  Group,
  Loader,
  Paper,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Image,
  useComputedColorScheme,
} from "@mantine/core";
import { IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import useSWR from "swr";
import { useLanguage } from "../../../hooks/useLanguage";
import { getImageUrl } from "../../../utils/imageUtils";
import type { LocalizedText } from "../../../types";
import type { ExamResultResponse, AnswerDetail } from "../types";

export function ExamResultPage() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { localize } = useLanguage();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const {
    data: resultResponse,
    isLoading,
    error,
    mutate,
  } = useSWR<ExamResultResponse>(
    sessionId ? `/api/v2/exams/${sessionId}/result` : null,
  );

  const result = resultResponse?.data;

  if (isLoading) {
    return (
      <Center h="80vh">
        <Stack align="center">
          <Loader size="lg" />
          <Text c="dimmed">{t("common.loading")}</Text>
        </Stack>
      </Center>
    );
  }

  /*
   * BUG FIX: avval tarmoq/server xatosi ham "natija topilmadi" deb
   * ko'rsatilardi va qayta urinish tugmasi yo'q edi — foydalanuvchi
   * endigina yakunlagan imtihoni natijasini butunlay yo'qotgandek his
   * qilardi. Endi xato alohida holat va uni qayta yuklash mumkin.
   */
  if (error) {
    return (
      <Center h="80vh">
        <Stack align="center">
          <Title order={3} c="red">
            {t("common.errorOccurred")}
          </Title>
          <Text c="dimmed" size="sm">
            {t("common.loadError")}
          </Text>
          <Group>
            <Button
              variant="outline"
              leftSection={<IconArrowLeft size={18} />}
              onClick={() => navigate("/me")}
            >
              {t("examResult.backToDashboard")}
            </Button>
            <Button onClick={() => mutate()}>{t("common.retry")}</Button>
          </Group>
        </Stack>
      </Center>
    );
  }

  if (!result) {
    return (
      <Center h="80vh">
        <Stack align="center">
          <Title order={3}>{t("examResult.notFound")}</Title>
          <Button
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate("/me")}
          >
            {t("examResult.backToDashboard")}
          </Button>
        </Stack>
      </Center>
    );
  }

  const durationSeconds = result.durationSeconds ?? 0;
  const avgTimePerQuestion = result.averageTimePerQuestion
    ? Math.round(result.averageTimePerQuestion)
    : result.totalQuestions > 0
      ? Math.round(durationSeconds / result.totalQuestions)
      : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} ${t("examResult.minutes")} ${secs} ${t("examResult.seconds")}`;
    }
    return `${secs} ${t("examResult.seconds")}`;
  };

  return (
    <Box bg="var(--bg)" mih="100vh" style={{ color: "var(--text)" }}>
      {/*
        Mobil ko'rinishda pastdagi "Orqaga" tugmasi `position: fixed` —
        avval kontent tagida qo'shimcha joy yo'q edi va tugma oxirgi
        javob kartasini yopib qo'yardi.
      */}
      <Container size="xl" p={0} pb={{ base: 70, sm: 0 }}>
        {/* Header: Score Ring + Pass/Fail */}
        <Paper
          p="xl"
          radius="md"
          withBorder
          shadow="sm"
          mb="xl"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <Flex
            direction={{ base: "column", sm: "row" }}
            align="center"
            justify="center"
            gap="xl"
          >
            <RingProgress
              size={160}
              thickness={14}
              roundCaps
              sections={[
                {
                  value: result.percentage ?? 0,
                  color: result.isPassed ? "green" : "red",
                },
              ]}
              label={
                <Text ta="center" size="xl" fw={700}>
                  {(result.percentage ?? 0).toFixed(0)}%
                </Text>
              }
            />
            <Stack gap="xs" align="flex-start">
              <Badge
                size="xl"
                color={result.isPassed ? "green" : "red"}
                variant="filled"
              >
                {result.isPassed
                  ? t("examResult.passed")
                  : t("examResult.failed")}
              </Badge>
              <Text size="sm" c="dimmed">
                {t("examResult.passingScore")}: {result.passingScore}%
              </Text>
              <Text size="sm" c="dimmed">
                {t("examResult.timeSpent")}: {formatDuration(durationSeconds)}
              </Text>
              <Text size="sm" c="dimmed">
                {t("examResult.avgTimePerQuestion")}: {avgTimePerQuestion}{" "}
                {t("examResult.seconds")}
              </Text>
            </Stack>
          </Flex>
        </Paper>

        {/* Stat Cards */}
        <SimpleGrid cols={{ base: 3 }} spacing="md" mb="xl">
          <Paper
            p="md"
            ta="center"
            radius="md"
            style={{
              backgroundColor:
                computedColorScheme === "light"
                  ? "var(--mantine-color-green-0)"
                  : "var(--mantine-color-green-9)",
              border: "1px solid var(--mantine-color-green-3)",
            }}
          >
            <Text size="xl" fw={700} c="green">
              {result.correctCount ?? 0}
            </Text>
            <Text size="sm" c="dimmed">
              {t("examResult.correct")}
            </Text>
          </Paper>
          <Paper
            p="md"
            ta="center"
            radius="md"
            style={{
              backgroundColor:
                computedColorScheme === "light"
                  ? "var(--mantine-color-red-0)"
                  : "var(--mantine-color-red-9)",
              border: "1px solid var(--mantine-color-red-3)",
            }}
          >
            <Text size="xl" fw={700} c="red">
              {result.incorrectCount ?? 0}
            </Text>
            <Text size="sm" c="dimmed">
              {t("examResult.incorrect")}
            </Text>
          </Paper>
          <Paper
            p="md"
            ta="center"
            radius="md"
            style={{
              backgroundColor:
                computedColorScheme === "light"
                  ? "var(--mantine-color-yellow-0)"
                  : "var(--mantine-color-yellow-9)",
              border: "1px solid var(--mantine-color-yellow-3)",
            }}
          >
            <Text size="xl" fw={700} c="yellow.8">
              {result.unansweredCount ?? 0}
            </Text>
            <Text size="sm" c="dimmed">
              {t("examResult.unanswered")}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Answer Review */}
        <Title order={3} mb="md">
          {t("examResult.answerReview")}
        </Title>

        <Stack gap="md" mb="xl">
          {(result.answerDetails ?? []).map(
            (answer: AnswerDetail, index: number) => (
              <AnswerReviewCard
                key={answer.questionId}
                answer={answer}
                index={index}
                localize={localize}
                t={t}
                computedColorScheme={computedColorScheme}
              />
            ),
          )}
        </Stack>

        {/* Back Button */}
        <Flex justify="center" mb="xl">
          <Button
            visibleFrom="sm"
            size="md"
            radius="md"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate("/me")}
          >
            {t("examResult.backToDashboard")}
          </Button>
        </Flex>
        <Button
          hiddenFrom="sm"
          size="md"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => navigate("/me")}
          style={{
            position: "fixed",
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          {t("examResult.backToDashboard")}
        </Button>
      </Container>
    </Box>
  );
}

function AnswerReviewCard({
  answer,
  index,
  localize,
  t,
  computedColorScheme,
}: {
  answer: AnswerDetail;
  index: number;
  localize: (text: LocalizedText | string | undefined) => string;
  t: (key: string) => string;
  computedColorScheme: string;
}) {
  const isNotAnswered =
    answer.selectedOptionIndex === null ||
    answer.selectedOptionIndex === undefined ||
    answer.selectedOptionIndex === -1;

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <Flex justify="space-between" align="center" mb="sm">
        <Text fw={600}>
          {t("examResult.question")} {index + 1}
        </Text>
        {isNotAnswered ? (
          <Badge color="gray" variant="light">
            {t("examResult.notAnswered")}
          </Badge>
        ) : answer.isCorrect ? (
          <Badge
            color="green"
            variant="light"
            leftSection={<IconCheck size={14} />}
          >
            {t("examResult.correct")}
          </Badge>
        ) : (
          <Badge color="red" variant="light" leftSection={<IconX size={14} />}>
            {t("examResult.incorrect")}
          </Badge>
        )}
      </Flex>

      <Text mb="sm" fw={500}>{localize(answer.questionText)}</Text>

      {/* Savol rasmi (yo'l belgilari, chorraha holatlari) */}
      {answer.imageUrl && (
        <Box
          mb="md"
          style={{
            maxHeight: 240,
            display: "flex",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.04)",
            borderRadius: "var(--radius)",
            padding: 8,
          }}
        >
          <Image
            src={getImageUrl(answer.imageUrl)}
            alt={localize(answer.questionText)}
            fit="contain"
            mah={220}
            radius="sm"
          />
        </Box>
      )}

      <Grid gutter="xs">
        {answer.options.map((option) => {
          const isCorrect = option.index === answer.correctOptionIndex;
          const isSelected = option.index === answer.selectedOptionIndex;

          let borderColor: string | undefined;
          let bgColor: string | undefined;

          if (isCorrect) {
            borderColor = "var(--mantine-color-green-6)";
            bgColor =
              computedColorScheme === "light"
                ? "var(--mantine-color-green-0)"
                : "var(--mantine-color-green-9)";
          } else if (isSelected && !isCorrect) {
            borderColor = "var(--mantine-color-red-6)";
            bgColor =
              computedColorScheme === "light"
                ? "var(--mantine-color-red-0)"
                : "var(--mantine-color-red-9)";
          }

          return (
            <Grid.Col span={{ base: 12, sm: 6 }} key={option.index}>
              <Paper
                p="xs"
                withBorder
                style={{
                  borderColor,
                  backgroundColor: bgColor,
                }}
              >
                <Flex gap="xs" align="center">
                  {isCorrect && <IconCheck size={16} color="green" />}
                  {isSelected && !isCorrect && <IconX size={16} color="red" />}
                  <Text size="sm">{localize(option.text)}</Text>
                </Flex>
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>

      {answer.explanation && localize(answer.explanation) && (
        <Paper
          p="xs"
          mt="sm"
          radius="sm"
          style={{
            background:
              computedColorScheme === "light"
                ? "rgba(25, 113, 194, 0.08)"
                : "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--border)",
          }}
        >
          <Text size="sm" c="dimmed">
            <strong>{t("examResult.explanation")}:</strong>{" "}
            {localize(answer.explanation)}
          </Text>
        </Paper>
      )}
    </Paper>
  );
}
