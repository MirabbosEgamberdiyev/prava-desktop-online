import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Center,
  Loader,
  Text,
  Title,
  Button,
  Group,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import api from "../../../api/api";
import { QuizNav, type QuizNavHandle } from "../../../components/quiz/QuizNav";
import { QuizContent } from "../../../components/quiz/QuizContent";
import { useAutoSave, restoreAnswers } from "../../../hooks/useAutoSave";
import { OfflineBanner } from "../../../components/common/OfflineBanner";
import type { MarathonExamData, AnswersMap } from "../../../types";
import type { ExamMode } from "../../../components/quiz/ExamModeModal";

interface MarathonExamPageProps {
  questionCount?: number;
  durationMinutes?: number;
  topicId?: number | null;
  examMode?: ExamMode;
}

const Marathon_ExamPage = ({
  questionCount = 20,
  durationMinutes = 30,
  topicId = null,
  examMode = "visible",
}: MarathonExamPageProps) => {
  const isSecureMode = examMode === "secure";
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [examData, setExamData] = useState<MarathonExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswersMap>({});

  const hasFetched = useRef(false);
  const submittedRef = useRef(false);
  const sessionIdRef = useRef<number | null>(null);
  const quizNavRef = useRef<QuizNavHandle>(null);

  const startMarathon = useCallback(async (isRetry = false) => {
    if (hasFetched.current && !isRetry) return;
    hasFetched.current = true;

    setLoading(true);
    setError(null);

    try {
      const endpoint = isSecureMode
        ? "/api/v2/exams/marathon/start-secure"
        : "/api/v2/exams/marathon/start-visible";
      const body: Record<string, unknown> = {
        questionCount,
        durationMinutes,
      };
      if (topicId) body.topicId = topicId;
      const response = await api.post<MarathonExamData>(endpoint, body);

      if (response.data) {
        setExamData(response.data);
        sessionIdRef.current = response.data.data.sessionId;
        // Uzilib qolgan sessiya javoblarini tiklash
        const restored = restoreAnswers(response.data.data.sessionId);
        if (restored) setAnswers(restored);
      }
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || t("marathon.startError");

      setError(errorMessage);
      notifications.show({
        title: t("common.error"),
        message: errorMessage,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [isSecureMode, questionCount, durationMinutes, topicId, t]);

  useEffect(() => {
    startMarathon();
  }, [startMarathon]);

  /*
   * OLIB TASHLANDI — unmount'dagi `navigator.sendBeacon(.../abandon)`.
   * sendBeacon doim POST yuboradi (endpoint DELETE) va Authorization header
   * qo'sha olmaydi — hech qachon ishlamagan. Ishlaganda ham tasodifiy
   * "orqaga" bosish imtihonni bekor qilardi.
   */

  // Javoblarni avtomatik saqlash (localStorage + server).
  useAutoSave({
    sessionId: examData?.data.sessionId ?? null,
    answers,
    questions: examData?.data.questions ?? [],
    enabled: !!examData && !submittedRef.current,
  });

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

  const handleSubmitSuccess = () => {
    submittedRef.current = true;
  };

  const handleFinish = () => {
    quizNavRef.current?.openFinishModal();
  };

  if (loading) {
    return (
      <Center h="100vh">
        <Box ta="center">
          <Loader size="lg" mb="md" />
          <Text c="dimmed">{t("marathon.loading")}</Text>
        </Box>
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100vh">
        <Box ta="center">
          <Title order={3} c="red" mb="md">
            {t("common.errorOccurred")}
          </Title>
          <Text c="dimmed" mb="lg">
            {error}
          </Text>
          <Group justify="center">
            <Button variant="outline" onClick={() => navigate("/me")}>
              {t("common.back")}
            </Button>
            <Button onClick={() => startMarathon(true)}>
              {t("common.retry")}
            </Button>
          </Group>
        </Box>
      </Center>
    );
  }

  if (!examData) {
    return (
      <Center h="100vh">
        <Box ta="center">
          <Title order={3} mb="md">
            {t("marathon.notFound")}
          </Title>
          <Text c="dimmed" mb="lg">
            {t("marathon.notFoundDesc")}
          </Text>
          <Button onClick={() => navigate("/me")}>{t("common.back")}</Button>
        </Box>
      </Center>
    );
  }

  return (
    <>
      <QuizNav
        ref={quizNavRef}
        sessionId={examData.data.sessionId}
        questions={examData.data.questions}
        totalQuestions={examData.data.totalQuestions}
        durationMinutes={examData.data.durationMinutes}
        answers={answers}
        onReset={handleReset}
        backUrl="/me"
        isSecureMode={isSecureMode}
        onSubmitSuccess={handleSubmitSuccess}
      />
      <OfflineBanner />
      <QuizContent
        questions={examData.data.questions}
        onAnswerSelect={handleAnswerSelect}
        onFinish={handleFinish}
        selectedAnswers={answers}
        showExplanation
        showProgressBar
        isSecureMode={isSecureMode}
      />
    </>
  );
};

export default Marathon_ExamPage;
