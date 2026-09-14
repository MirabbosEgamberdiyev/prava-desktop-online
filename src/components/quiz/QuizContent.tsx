import { useState, useEffect, useRef, useCallback } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Collapse,
  Container,
  Flex,
  Grid,
  Image,
  Paper,
  Text,
  Modal,
  Progress,
  Badge,
  Tooltip,
  Stack,
  Group,
  ScrollArea,
  useComputedColorScheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  IconCheck,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconTarget,
  IconTrophy,
  IconChartBar,
  IconBookmark,
  IconBookmarkFilled,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../auth/AuthContext";
import type { Question, Option, AnswersMap } from "../../types";
import { ImagePlaceholder } from "../common/ImagePlaceholder";
import { getImageUrl } from "../../utils/imageUtils";
import api from "../../api/api";
import classes from "./QuizContent.module.css";

interface QuizContentProps {
  questions: Question[];
  onAnswerSelect: (
    questionIndex: number,
    optionIndex: number,
    timeSpentSeconds: number,
  ) => void;
  onFinish: () => void;
  selectedAnswers: AnswersMap;
  showExplanation?: boolean;
  showProgressBar?: boolean;
  errorLimitMode?: boolean;
  maxErrorPercentage?: number;
  isTimeUp?: boolean;
  isSecureMode?: boolean;
  onFinishExam?: (navigateTo: string) => Promise<void>;
  examSessionId?: number;
  onErrorLimitReached?: () => void;
}

export function QuizContent({
  questions,
  onAnswerSelect,
  onFinish,
  selectedAnswers: parentAnswers,
  showExplanation = false,
  showProgressBar = false,
  errorLimitMode = false,
  maxErrorPercentage = 0.1,
  isTimeUp = false,
  isSecureMode = false,
  onFinishExam,
  examSessionId,
  onErrorLimitReached,
}: QuizContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { localize } = useLanguage();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const [imageModalOpened, setImageModalOpened] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [resultModalOpened, setResultModalOpened] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<number>>(new Set());

  const [timeUpTriggered, setTimeUpTriggered] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(0);

  /*
   * `isAuthenticated` gate — QuizContent mehmon uchun `/try-exam` sahifasida
   * ham ishlatiladi. Avval bu so'rovlar shartsiz yuborilardi va 401 qaytarardi.
   * (Root-cause api.ts interceptorida ham tuzatildi, bu esa ikkinchi qatlam:
   * mehmonga hech qachon kerak bo'lmagan so'rovni umuman yubormaymiz.)
   */
  const { isAuthenticated } = useAuth();

  // Load saved question IDs on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get("/api/v1/app/saved-questions")
      .then((res) => {
        const list = res.data?.data;
        if (Array.isArray(list)) {
          setSavedQuestionIds(new Set(list.map((q: { questionId: number }) => q.questionId)));
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Toggle saved question
  const handleToggleSaved = (questionId: number) => {
    if (!isAuthenticated) return;

    const wasSaved = savedQuestionIds.has(questionId);
    const newSet = new Set(savedQuestionIds);
    if (wasSaved) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    setSavedQuestionIds(newSet);

    // Optimistik yangilanish ROLLBACK bilan. Avval `.catch(() => {})` edi —
    // so'rov muvaffaqiyatsiz bo'lsa ham ikonka "saqlandi" holatida qolib,
    // interfeys yolg'on ma'lumot ko'rsatardi.
    api.post(`/api/v1/app/saved-questions/${questionId}`).catch(() => {
      setSavedQuestionIds((prev) => {
        const reverted = new Set(prev);
        if (wasSaved) {
          reverted.add(questionId);
        } else {
          reverted.delete(questionId);
        }
        return reverted;
      });
      notifications.show({
        color: "red",
        message: t("common.errorOccurred"),
      });
    });
  };

  // Send wrong answer to backend
  const sendWrongAnswer = (questionId: number) => {
    if (!isAuthenticated) return;
    api.post(`/api/v1/app/wrong-answers/${questionId}`).catch(() => {});
  };

  // Convert parent answers to simple index map
  const selectedAnswers: Record<number, number> = Object.entries(
    parentAnswers,
  ).reduce(
    (acc, [key, value]) => {
      acc[Number(key)] = value.optionIndex;
      return acc;
    },
    {} as Record<number, number>,
  );

  // Reset active quiz when answers are cleared
  useEffect(() => {
    if (Object.keys(parentAnswers).length === 0) {
      setActiveQuiz(0);
    }
  }, [parentAnswers]);

  // Time-up handling for error limit mode
  useEffect(() => {
    if (isTimeUp && !timeUpTriggered && errorLimitMode) {
      setTimeUpTriggered(true);
      setResultModalOpened(true);
    }
  }, [isTimeUp, timeUpTriggered, errorLimitMode]);

  // Auto-advance timer ref (for cleanup)
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to always have latest goToNextQuestion (avoid stale closure)
  const goToNextQuestionRef = useRef<() => void>(() => {});

  // Question timing
  const questionStartTime = useRef<number>(Date.now());
  const timeSpentPerQuestion = useRef<Record<number, number>>({});

  useEffect(() => {
    // Clear any pending auto-advance timer when question changes
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    questionStartTime.current = Date.now();
    setExplanationOpen(false);
  }, [activeQuiz]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  const currentQuestion = questions[activeQuiz];
  const isAnswered = selectedAnswers[activeQuiz] !== undefined;
  const selectedOptionIndex = selectedAnswers[activeQuiz];
  const isFirstQuestion = activeQuiz === 0;
  const isLastQuestion = activeQuiz === questions.length - 1;
  // Stats
  const correctCount = Object.entries(selectedAnswers).filter(
    ([index, optionIndex]) => {
      const question = questions[Number(index)];
      return question && optionIndex === question.correctOptionIndex;
    },
  ).length;
  const incorrectCount = Object.keys(selectedAnswers).length - correctCount;
  const totalQuestions = questions.length;
  const maxAllowedErrors = Math.floor(totalQuestions * maxErrorPercentage);
  const isPassed = !isTimeUp && incorrectCount <= maxAllowedErrors;
  const correctPercentage =
    totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const progressPercentage =
    (Object.keys(selectedAnswers).length / questions.length) * 100;

  const goToNextQuestion = useCallback(() => {
    if (activeQuiz < questions.length - 1) {
      setActiveQuiz((prev) => prev + 1);
    }
  }, [activeQuiz, questions.length]);

  // Keep ref in sync so timers always call the latest version
  goToNextQuestionRef.current = goToNextQuestion;

  const goToPrevQuestion = useCallback(() => {
    if (activeQuiz > 0) {
      setActiveQuiz((prev) => prev - 1);
    }
  }, [activeQuiz]);

  const goToFirstUnanswered = () => {
    const idx = questions.findIndex(
      (_, index) => selectedAnswers[index] === undefined,
    );
    if (idx !== -1) setActiveQuiz(idx);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["F1", "F2", "F3", "F4", "F5"].includes(e.key)) {
        e.preventDefault();
        const optionIndex = parseInt(e.key.replace("F", "")) - 1;
        const options = currentQuestion?.options || [];
        if (optionIndex < options.length) {
          handleSelectAnswer(activeQuiz, optionIndex);
        }
      }
      if (e.key === "ArrowLeft" && !isFirstQuestion) goToPrevQuestion();
      if (e.key === "ArrowRight" && !isLastQuestion) goToNextQuestion();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeQuiz,
    currentQuestion,
    selectedAnswers,
    isFirstQuestion,
    isLastQuestion,
    goToNextQuestion,
    goToPrevQuestion,
  ]);

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (selectedAnswers[questionIndex] !== undefined) return;

    // Clear any pending auto-advance timer
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }

    const timeSpent = Math.floor(
      (Date.now() - questionStartTime.current) / 1000,
    );
    timeSpentPerQuestion.current[questionIndex] = timeSpent;
    onAnswerSelect(questionIndex, optionIndex, timeSpent);

    // Send wrong answer to backend if incorrect
    const currentQ = questions[questionIndex];
    if (currentQ && optionIndex !== currentQ.correctOptionIndex) {
      sendWrongAnswer(currentQ.id);
    }

    // Error limit check
    if (errorLimitMode) {
      const question = questions[questionIndex];
      const isCorrect = question && optionIndex === question.correctOptionIndex;
      const newIncorrectCount = incorrectCount + (isCorrect ? 0 : 1);
      if (newIncorrectCount > maxAllowedErrors) {
        onErrorLimitReached?.();
        setTimeout(() => setResultModalOpened(true), 500);
        return;
      }
    }

    // No auto-advance on last question
    if (questionIndex >= questions.length - 1) return;

    // Always auto-advance after 700ms (if user opens explanation, timer will be cancelled there)
    autoAdvanceTimer.current = setTimeout(
      () => goToNextQuestionRef.current(),
      700,
    );
  };

  const handleFinishExam = () => {
    if (errorLimitMode) {
      setResultModalOpened(true);
    } else {
      onFinish();
    }
  };

  if (questions.length === 0) {
    return (
      <Box
        bg={computedColorScheme === "light" ? "gray.1" : "dark.8"}
        mih="92vh"
        p="xl"
      >
        <Container>
          <Text ta="center" size="lg" c="dimmed">
            {t("exam.noQuestions")}
          </Text>
        </Container>
      </Box>
    );
  }

  const getOptionStyle = (option: Option) => {
    if (!isAnswered) {
      return {
        cursor: "pointer",
        borderColor: undefined,
        backgroundColor: undefined,
      };
    }

    const isThisSelected = selectedOptionIndex === option.index;
    const isThisCorrect = option.index === currentQuestion.correctOptionIndex;

    // Secure mode: only show blue "selected" border, no correct/incorrect
    if (isSecureMode) {
      if (isThisSelected) {
        return {
          cursor: "default",
          borderColor: "var(--mantine-color-blue-6)",
          backgroundColor:
            computedColorScheme === "light"
              ? "var(--mantine-color-blue-0)"
              : "var(--mantine-color-dark-5)",
        };
      }
      return {
        cursor: "default",
        borderColor: undefined,
        backgroundColor: undefined,
      };
    }

    if (isThisCorrect) {
      return {
        cursor: "default",
        borderColor: "var(--mantine-color-green-6)",
        backgroundColor:
          computedColorScheme === "light"
            ? "var(--mantine-color-green-0)"
            : "var(--mantine-color-dark-5)",
      };
    }

    if (isThisSelected && !isThisCorrect) {
      return {
        cursor: "default",
        borderColor: "var(--mantine-color-red-6)",
        backgroundColor:
          computedColorScheme === "light"
            ? "var(--mantine-color-red-0)"
            : "var(--mantine-color-dark-5)",
      };
    }

    return {
      cursor: "default",
      borderColor: undefined,
      backgroundColor: undefined,
    };
  };

  const getActionIconProps = (option: Option) => {
    if (!isAnswered) {
      return { variant: "default" as const, color: undefined };
    }

    const isThisSelected = selectedOptionIndex === option.index;
    const isThisCorrect = option.index === currentQuestion.correctOptionIndex;

    // Secure mode: only blue for selected
    if (isSecureMode) {
      if (isThisSelected) return { variant: "filled" as const, color: "blue" };
      return { variant: "default" as const, color: undefined };
    }

    if (isThisCorrect) return { variant: "filled" as const, color: "green" };
    if (isThisSelected && !isThisCorrect)
      return { variant: "filled" as const, color: "red" };
    return { variant: "default" as const, color: undefined };
  };

  return (
    <Box bg={computedColorScheme === "light" ? "gray.1" : "dark.8"} mih="92vh">
      {/* Progress bar for marathon mode */}
      {showProgressBar && (
        <Box
          p="sm"
          style={{
            borderBottom: `1px solid ${computedColorScheme === "light" ? "var(--mantine-color-gray-3)" : "var(--mantine-color-dark-4)"}`,
          }}
        >
          <Container fluid>
            <Flex justify="space-between" align="center" wrap="wrap" gap="sm">
              <Flex align="center" gap="md" style={{ flex: 1, minWidth: 200 }}>
                <Progress
                  value={progressPercentage}
                  size="lg"
                  radius="xl"
                  style={{ flex: 1 }}
                  color={progressPercentage === 100 ? "green" : "blue"}
                />
                <Text size="sm" fw={500}>
                  {Object.keys(selectedAnswers).length}/{questions.length}
                </Text>
              </Flex>
              <Flex gap="xs" wrap="wrap">
                <Tooltip label={t("exam.correct")}>
                  <Badge
                    size="lg"
                    color="green"
                    variant="light"
                    leftSection={<IconCheck size={14} />}
                  >
                    {correctCount}
                  </Badge>
                </Tooltip>
                <Tooltip label={t("exam.incorrect")}>
                  <Badge
                    size="lg"
                    color="red"
                    variant="light"
                    leftSection={<IconX size={14} />}
                  >
                    {incorrectCount}
                  </Badge>
                </Tooltip>
                <Tooltip label={t("exam.unanswered")}>
                  <Badge
                    size="lg"
                    color="gray"
                    variant="light"
                    leftSection={<IconTarget size={14} />}
                    style={{ cursor: "pointer" }}
                    onClick={goToFirstUnanswered}
                  >
                    {questions.length - Object.keys(selectedAnswers).length}
                  </Badge>
                </Tooltip>
              </Flex>
            </Flex>
          </Container>
        </Box>
      )}

      {/* Question number badge for marathon */}
      {showProgressBar && (
        <Box p="lg" pb={0}>
          <Flex justify="center" align="center" gap="sm" mb="xs">
            <Badge size="lg" variant="filled" color="blue">
              {activeQuiz + 1} / {questions.length}
            </Badge>
          </Flex>
        </Box>
      )}

      {/* Question text + Bookmark */}
      <Box p={{ base: "xs", sm: "md", md: "lg" }}>
        <Flex justify="center" align="center" gap="sm">
          {/*
            O'QILUVCHANLIK: savol matni `size="lg"` (18px) markazga tekislangan
            va cheksiz kenglikda edi. Foydalanuvchi ketma-ket 20-50 ta savol
            o'qiydi — keng ekranda satr 150+ belgiga cho'zilib, ko'z satrni
            yo'qotardi. Endi: `maw` bilan optimal satr uzunligi (~70 belgi),
            `lh` bilan havodorroq interval.
            `aria-live` — savol almashganda ekran o'quvchi yangi matnni o'qiydi.
          */}
          <Text
            ta="center"
            size="lg"
            fw={500}
            lh={1.55}
            maw="65ch"
            mx="auto"
            style={{ flex: 1 }}
            aria-live="polite"
          >
            {localize(currentQuestion?.text)}
          </Text>
          {isAuthenticated && (
            <Tooltip label={savedQuestionIds.has(currentQuestion?.id) ? t("saved.remove", { defaultValue: "Belgini olib tashlash" }) : t("exam.saveQuestion", { defaultValue: "Savolni saqlash" })}>
              <ActionIcon
                variant={savedQuestionIds.has(currentQuestion?.id) ? "filled" : "light"}
                color="blue"
                size="lg"
                radius="xl"
                aria-pressed={savedQuestionIds.has(currentQuestion?.id)}
                aria-label={t("exam.saveQuestion", { defaultValue: "Savolni saqlash" })}
                onClick={() => currentQuestion && handleToggleSaved(currentQuestion.id)}
              >
                {savedQuestionIds.has(currentQuestion?.id)
                  ? <IconBookmarkFilled size={18} />
                  : <IconBookmark size={18} />
                }
              </ActionIcon>
            </Tooltip>
          )}
        </Flex>
      </Box>

      <Container fluid px={{ base: "xs", sm: "md", md: "lg" }}>
        <Grid gutter={{ base: "sm", md: "xl" }}>
          {/* Options - left side */}
          <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 2, md: 1 }}>
            {currentQuestion?.options?.map((option: Option) => {
              const style = getOptionStyle(option);
              const iconProps = getActionIconProps(option);
              const isThisSelected = selectedOptionIndex === option.index;
              const isThisCorrect =
                option.index === currentQuestion.correctOptionIndex;

              /*
               * A11Y TUZATISHLARI:
               *  1. Avval `aria-label={`${t("exam.prev")} F${index+1}`}` edi —
               *     ekran o'quvchi variant matnini emas, "Oldingi F1" deb
               *     o'qirdi (noto'g'ri kalit). Endi haqiqiy variant matni +
               *     javob berilgan bo'lsa to'g'ri/noto'g'ri holati o'qiladi.
               *  2. `role="button"` bor edi, lekin `tabIndex` va klaviatura
               *     ishlov beruvchisi YO'Q edi — variantlarni Tab bilan
               *     tanlab bo'lmasdi (WCAG 2.1.1 buzilishi).
               *  3. `aria-disabled` javob berilgandan keyin holatni bildiradi.
               */
              const optionLabel = localize(option.text);
              const stateLabel =
                !isAnswered || isSecureMode
                  ? ""
                  : isThisCorrect
                    ? `, ${t("exam.correct")}`
                    : isThisSelected
                      ? `, ${t("exam.incorrect")}`
                      : "";

              return (
                <Paper
                  withBorder
                  p="xs"
                  mb="xs"
                  key={option.id}
                  role="button"
                  tabIndex={isAnswered ? -1 : 0}
                  aria-disabled={isAnswered}
                  aria-label={`F${option.index + 1}: ${optionLabel}${stateLabel}`}
                  className={classes.optionPaper}
                  data-clickable={!isAnswered}
                  style={{
                    cursor: style.cursor,
                    borderColor: style.borderColor,
                    backgroundColor: style.backgroundColor,
                  }}
                  onClick={() => handleSelectAnswer(activeQuiz, option.index)}
                  onKeyDown={(e) => {
                    if (isAnswered) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectAnswer(activeQuiz, option.index);
                    }
                  }}
                >
                  <Flex gap="sm" align="center">
                    <ActionIcon
                      radius="xs"
                      variant={iconProps.variant}
                      color={iconProps.color}
                    >
                      {isSecureMode ? (
                        "F" + (option.index + 1)
                      ) : isAnswered && isThisCorrect ? (
                        <IconCheck size={16} />
                      ) : isAnswered && isThisSelected && !isThisCorrect ? (
                        <IconX size={16} />
                      ) : (
                        "F" + (option.index + 1)
                      )}
                    </ActionIcon>
                    <Text>{localize(option.text)}</Text>
                  </Flex>
                </Paper>
              );
            })}

            {/* Inline explanation (hidden in secure mode) */}
            {showExplanation &&
              !isSecureMode &&
              isAnswered &&
              currentQuestion?.explanation && (
                <>
                  <Button
                    variant="light"
                    color="blue"
                    fullWidth
                    mt="md"
                    onClick={() => {
                      const wasOpen = explanationOpen;
                      setExplanationOpen((o) => !o);

                      if (!wasOpen) {
                        // Izoh ochilmoqda → auto-advance timerni bekor qil
                        if (autoAdvanceTimer.current) {
                          clearTimeout(autoAdvanceTimer.current);
                          autoAdvanceTimer.current = null;
                        }
                      }

                      // Izoh yopilmoqda → 500ms keyin keyingi savolga o'tsin
                      if (wasOpen && !isLastQuestion) {
                        if (autoAdvanceTimer.current) {
                          clearTimeout(autoAdvanceTimer.current);
                        }
                        autoAdvanceTimer.current = setTimeout(
                          () => goToNextQuestionRef.current(),
                          500,
                        );
                      }
                    }}
                  >
                    {explanationOpen
                      ? t("marathon.hideExplanation")
                      : t("marathon.showExplanation")}
                  </Button>
                  <Collapse in={explanationOpen} transitionDuration={300}>
                    <Paper
                      withBorder
                      p="md"
                      mt="xs"
                      style={{
                        borderColor: "var(--mantine-color-blue-3)",
                      }}
                    >
                      <Text size="sm">
                        {localize(currentQuestion?.explanation)}
                      </Text>
                    </Paper>
                  </Collapse>
                </>
              )}
          </Grid.Col>

          {/* Image - right side */}
          <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 1, md: 2 }}>
            <ImagePlaceholder
              src={getImageUrl(currentQuestion?.imageUrl)}
              onClick={() => setImageModalOpened(true)}
            />
          </Grid.Col>
        </Grid>
      </Container>

      {/* Image zoom modal */}
      {currentQuestion?.imageUrl && (
        <Modal
          opened={imageModalOpened}
          onClose={() => setImageModalOpened(false)}
          size="xl"
          centered
          withCloseButton
          padding={0}
        >
          <Image src={getImageUrl(currentQuestion.imageUrl)} fit="contain" />
        </Modal>
      )}

      {/* Result modal for error limit mode */}
      {errorLimitMode && (
        <Modal
          opened={resultModalOpened}
          onClose={() => {}}
          size="md"
          centered
          withCloseButton={false}
          closeOnClickOutside={false}
          closeOnEscape={false}
        >
          <Stack align="center" gap="lg" py="md">
            <Text size="xl" fw={700} c={isPassed ? "green" : "red"}>
              {isPassed
                ? t("exam.result.passed")
                : isTimeUp
                  ? t("exam.result.timeUp")
                  : t("exam.result.failed")}
            </Text>

            <Box w="100%">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  {t("exam.result.score")}
                </Text>
                <Text size="sm" fw={500}>
                  {correctCount} / {totalQuestions}
                </Text>
              </Group>
              <Progress
                value={correctPercentage}
                color={isPassed ? "green" : "red"}
                size="lg"
                radius="xl"
              />
            </Box>

            <Group grow w="100%">
              <Paper withBorder p="md" radius="md" ta="center">
                <Text size="xl" fw={700} c="green">
                  {correctCount}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("exam.correct")}
                </Text>
              </Paper>
              <Paper withBorder p="md" radius="md" ta="center">
                <Text size="xl" fw={700} c="red">
                  {incorrectCount}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("exam.incorrect")}
                </Text>
              </Paper>
              <Paper withBorder p="md" radius="md" ta="center">
                <Text size="xl" fw={700} c="gray">
                  {maxAllowedErrors}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("exam.result.maxErrors")}
                </Text>
              </Paper>
            </Group>

            <Button
              fullWidth
              loading={submittingResult}
              onClick={async () => {
                if (onFinishExam) {
                  setSubmittingResult(true);
                  try {
                    await onFinishExam("/me");
                  } finally {
                    setSubmittingResult(false);
                  }
                } else {
                  navigate("/me");
                }
              }}
            >
              {t("exam.finish")}
            </Button>
            {examSessionId && onFinishExam && (
              <Button
                fullWidth
                variant="light"
                color="blue"
                loading={submittingResult}
                leftSection={<IconChartBar size={18} />}
                onClick={async () => {
                  setSubmittingResult(true);
                  try {
                    await onFinishExam(`/exam/result/${examSessionId}`);
                  } finally {
                    setSubmittingResult(false);
                  }
                }}
              >
                {t("exam.viewResults")}
              </Button>
            )}
          </Stack>
        </Modal>
      )}

      {/* Question navigation - bottom */}
      <Container fluid mt={{ base: "md", sm: "xl" }} pb={{ base: "md", sm: "xl" }} px={{ base: "xs", sm: "md" }}>
        {/* Savol raqamlari - tepada */}
        <ScrollArea type="auto" offsetScrollbars scrollbarSize={4} mx={"-md"}>
          <Flex gap={4} justify="center" wrap="wrap" py={6} px={4}>
            {questions.map((question: Question, i: number) => {
              const wasAnswered = selectedAnswers[i] !== undefined;
              const wasCorrect =
                wasAnswered &&
                selectedAnswers[i] === question.correctOptionIndex;
              const isActive = activeQuiz === i;

              // Rang logikasi
              let bg: string;
              let color: string;
              let border: string;

              if (isActive) {
                bg = "var(--mantine-color-blue-6)";
                color = "#fff";
                border = "var(--mantine-color-blue-6)";
              } else if (wasAnswered) {
                if (isSecureMode) {
                  bg = "var(--mantine-color-blue-1)";
                  color = "var(--mantine-color-blue-7)";
                  border = "var(--mantine-color-blue-4)";
                } else if (wasCorrect) {
                  bg = "var(--mantine-color-green-1)";
                  color = "var(--mantine-color-green-7)";
                  border = "var(--mantine-color-green-4)";
                } else {
                  bg = "var(--mantine-color-red-1)";
                  color = "var(--mantine-color-red-7)";
                  border = "var(--mantine-color-red-4)";
                }
              } else {
                bg =
                  computedColorScheme === "dark"
                    ? "var(--mantine-color-dark-5)"
                    : "var(--mantine-color-gray-0)";
                color =
                  computedColorScheme === "dark"
                    ? "var(--mantine-color-dark-0)"
                    : "var(--mantine-color-dark-4)";
                border =
                  computedColorScheme === "dark"
                    ? "var(--mantine-color-dark-3)"
                    : "var(--mantine-color-gray-4)";
              }

              /*
               * RANG KO'RLIGI TUZATISHI (kritik).
               * Avval savol raqami tugmasi to'g'ri/noto'g'ri holatini FAQAT
               * yashil/qizil fon bilan bildirardi. Deuteranopiya/protanopiya
               * (erkaklarning ~8%) da yashil va qizil deyarli bir xil
               * ko'rinadi — foydalanuvchi qaysi savolda xato qilganini
               * umuman ajrata olmasdi.
               * Endi rangdan tashqari GLIF (✓ / ✕) qo'shildi + `aria-label`
               * holatni so'z bilan aytadi.
               */
              let marker = "";
              let stateText = t("exam.unanswered");
              if (wasAnswered) {
                if (isSecureMode) {
                  marker = "•";
                  stateText = t("exam.answered");
                } else if (wasCorrect) {
                  marker = "✓";
                  stateText = t("exam.correct");
                } else {
                  marker = "✕";
                  stateText = t("exam.incorrect");
                }
              }

              return (
                <button
                  key={question.id}
                  className={classes.questionBtn}
                  data-active={isActive}
                  onClick={() => setActiveQuiz(i)}
                  aria-label={`${t("exam.question")} ${i + 1}, ${stateText}`}
                  aria-current={isActive ? "true" : undefined}
                  style={{ background: bg, color, borderColor: border }}
                >
                  <span>{i + 1}</span>
                  {marker && (
                    <span aria-hidden="true" className={classes.questionBtnMark}>
                      {marker}
                    </span>
                  )}
                </button>
              );
            })}
          </Flex>
        </ScrollArea>

        {/* Avvalgi / Keyingi tugmalari - pastda */}
        <Flex gap="md" justify="center" align="center" mt="md">
          <Button
            variant="filled"
            color="gray"
            leftSection={<IconChevronLeft size={18} />}
            onClick={goToPrevQuestion}
            disabled={isFirstQuestion}
          >
            {t("exam.prev")}
          </Button>

          {isLastQuestion ? (
            <Button
              variant="filled"
              rightSection={
                showProgressBar ? (
                  <IconTrophy size={18} />
                ) : (
                  <IconCheck size={18} />
                )
              }
              onClick={handleFinishExam}
            >
              {t("exam.finish")}
            </Button>
          ) : (
            <Button
              variant="filled"
              color="gray"
              rightSection={<IconChevronRight size={18} />}
              onClick={goToNextQuestion}
            >
              {t("exam.next")}
            </Button>
          )}
        </Flex>
      </Container>
    </Box>
  );
}
