import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { mutate } from "swr";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Flex,
  Group,
  Modal,
  Text,
  Stack,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconX,
  IconCheck,
  IconRefresh,
  IconArrowLeft,
  IconAlertTriangle,
  IconChartBar,
  IconClock,
} from "@tabler/icons-react";
import LanguagePicker from "../language/LanguagePicker";
import ColorMode from "../other/ColorMode";
import api from "../../api/api";
import { backupAnswers, clearBackup } from "../../hooks/useAutoSave";
import type { AnswersMap } from "../../types";

export interface QuizNavHandle {
  openFinishModal: () => void;
}

interface QuizNavProps {
  sessionId?: number;
  questions?: Array<{
    id: number;
    order: number;
    correctOptionIndex: number;
  }>;
  totalQuestions?: number;
  durationMinutes?: number;
  answers: AnswersMap;
  onReset?: () => void;
  backUrl?: string;
  onTimeUp?: () => void;
  isSecureMode?: boolean;
  onGuestFinish?: () => void;
  onGuestViewResults?: () => void;
  onSubmitSuccess?: () => void;
  // `forceEnableSubmit` OLIB TASHLANDI: props interfeysida e'lon qilingan va
  // Exam sahifasidan uzatilgan, ammo komponent ichida hech qachon
  // destrukturizatsiya qilinmagan/ishlatilmagan edi — jim o'lik prop.
}

export const QuizNav = forwardRef<QuizNavHandle, QuizNavProps>(function QuizNav({
  sessionId,
  questions = [],
  totalQuestions = 0,
  durationMinutes = 30,
  answers,
  onReset,
  backUrl = "/packages",
  onTimeUp,
  isSecureMode = false,
  onGuestFinish,
  onGuestViewResults,
  onSubmitSuccess,
}: QuizNavProps, ref) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [opened, { open, close }] = useDisclosure(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [abandoning, setAbandoning] = useState(false);
  // Oxirgi urinishdagi manzil — "Qayta urinish" tugmasi uchun
  const lastNavigateToRef = useRef<string>("");

  useImperativeHandle(ref, () => ({ openFinishModal: open }), [open]);

  /**
   * TAYMER — deadline asosida (avvalgi `prev - 1` dekrement emas).
   *
   * Avvalgi implementatsiyadagi ikki jiddiy nuqson:
   *  1) `useEffect` dep-larida `onTimeUp` bor edi. Ota-komponentlar uni inline
   *     arrow sifatida uzatadi (masalan `onTimeUp={() => setIsTimeUp(true)}`),
   *     ya'ni har renderда yangi identity. Har javob tanlanganda effekt qayta
   *     ishga tushib `setInterval` nolga qaytardi — taymer sekinlashardi va
   *     foydalanuvchi imtihonda belgilangandan ko'proq vaqt olardi.
   *  2) `setInterval` + dekrement fon tabda brauzer tomonidan sekinlashtiriladi
   *     (throttling). Telefonda boshqa ilovaga o'tib qaytgan foydalanuvchi
   *     yo'qotilgan vaqtni "sovg'a" qilib olardi.
   *
   * Endi qolgan vaqt har tickda `deadline - Date.now()` dan hisoblanadi, shuning
   * uchun tick kechiksa ham ko'rsatkich to'g'ri qiymatga sakraydi.
   */
  const deadlineRef = useRef<number>(Date.now() + durationMinutes * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const isTimeUp = timeLeft <= 0;

  // Deadline faqat davomiylik o'zgarganda qayta hisoblanadi (masalan examData
  // kechroq yuklansa), har renderда emas.
  useEffect(() => {
    deadlineRef.current = Date.now() + durationMinutes * 60 * 1000;
    setTimeLeft(durationMinutes * 60);
  }, [durationMinutes]);

  // `onTimeUp` ni ref orqali ushlaymiz — dep bo'lmagani uchun taymer
  // ota-komponent renderlaridan mustaqil ishlaydi.
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;
  const timeUpFiredRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining <= 0 && !timeUpFiredRef.current) {
        timeUpFiredRef.current = true;
        onTimeUpRef.current?.();
        open();
      }
    };

    tick(); // darhol sinxronlash (tabga qaytganda kutmasdan)
    const timer = setInterval(tick, 1000);

    // Fon tabdan qaytganda darhol qayta hisoblash
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [open]);

  const handleSubmit = async (navigateTo: string) => {
    if (submitting) return;

    if (!sessionId) {
      // Guest mode: no API call needed
      close();
      if (navigateTo === backUrl) {
        onGuestFinish?.();
      } else {
        onGuestViewResults?.();
      }
      return;
    }

    lastNavigateToRef.current = navigateTo;
    setSubmitting(true);
    setSubmitError(null);

    const formattedAnswers = questions.map((question, index) => {
      const answer = answers[index];
      return {
        questionId: question.id,
        selectedOptionIndex: answer?.optionIndex ?? null,
        timeSpentSeconds: answer?.timeSpentSeconds ?? 0,
      };
    });

    // Tarmoq uzilib qolsa ham javoblar yo'qolmasin: submit'dan OLDIN
    // localStorage'ga zaxira nusxa yozamiz. Muvaffaqiyatli submitdan keyin
    // o'chiriladi. Shu tufayli sahifa yangilansa/brauzer yopilsa ham javoblar
    // tiklanadi (useAutoSave.restoreAnswers).
    backupAnswers(sessionId, answers);

    try {
      await api.post("/api/v2/exams/submit", {
        sessionId,
        answers: formattedAnswers,
      });

      clearBackup(sessionId);

      notifications.show({
        title: t("common.success"),
        message: t("notification.examFinished"),
        color: "green",
      });

      // Active exam SWR cache ni tozalaymiz — /me da banner qayta chiqmasin
      mutate("/api/v2/exams/active", { data: null }, false);
      onSubmitSuccess?.();
      setSubmitting(false);
      close();
      navigate(navigateTo, { replace: true });
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || t("notification.submitError");

      notifications.show({
        title: t("common.error"),
        message: errorMessage,
        color: "red",
      });

      // MUHIM: xatolikda modalni YOPMAYMIZ. Avval `finally { close() }` bor edi —
      // internet uzilganda modal yopilib ketardi, foydalanuvchi imtihon
      // topshirilgan deb o'ylardi va javoblari yo'qolardi. Endi modal ochiq
      // qoladi va "Qayta urinish" tugmasi ko'rinadi.
      setSubmitError(errorMessage);
      setSubmitting(false);
    }
  };

  /**
   * Tasodifiy yopish/yangilashdan himoya.
   * Avval hech qanday to'siq yo'q edi: Ctrl+R yoki tabni yopish imtihonni
   * butunlay yo'qotardi. Endi brauzer tasdiqlash so'raydi (javoblar bo'lsa).
   */
  const answersCountRef = useRef(0);
  answersCountRef.current = Object.keys(answers).length;
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (answersCountRef.current === 0) return;
      e.preventDefault();
      // Legacy brauzerlar uchun
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 60) return "red";
    if (timeLeft <= 300) return "yellow";
    return "blue";
  };

  const answeredCount = Object.keys(answers).length;

  const correctCount =
    questions.reduce((count, question, index) => {
      const answer = answers[index];
      if (answer && answer.optionIndex === question.correctOptionIndex) {
        return count + 1;
      }
      return count;
    }, 0) || 0;

  const incorrectCount = answeredCount - correctCount;
  const unansweredCount = totalQuestions - answeredCount;
  const allAnswered = answeredCount === totalQuestions;

  const handleReset = () => {
    onReset?.();
    // Javoblar tozalandi — zaxira ham tozalanishi kerak, aks holda
    // sahifa yangilanganda o'chirilgan javoblar qayta tiklanardi.
    clearBackup(sessionId);
    setSubmitError(null);
    close();
  };

  return (
    <>
      <Flex p={{ base: "xs", sm: "sm" }} py="xs" justify="space-between" align="center" wrap="wrap" gap="xs">
        <Group gap="xs" wrap="nowrap">
          <Button
            rightSection={<IconX size={16} />}
            variant="light"
            color="red"
            size="sm"
            onClick={open}
            data-finish-button
          >
            {t("exam.finish")}
          </Button>
          {/*
            A11Y: avval `aria-label={t("exam.finish")}` edi — ekran o'quvchi
            taymer o'rniga "Yakunlash" deb o'qirdi. Endi `role="timer"` va
            qolgan vaqt to'g'ri e'lon qilinadi. Shuningdek vaqt tugayotgani
            faqat RANG bilan emas, ogohlantirish ikonkasi bilan ham bildiriladi
            (rang ko'rmaydigan foydalanuvchilar uchun).
          */}
          <Badge
            variant="light"
            size="lg"
            radius="xs"
            color={getTimerColor()}
            role="timer"
            aria-live={timeLeft <= 60 ? "assertive" : "off"}
            aria-label={`${t("exam.timeLeft", { defaultValue: "Qolgan vaqt" })}: ${formatTime(timeLeft)}`}
            leftSection={
              timeLeft <= 300 ? <IconAlertTriangle size={14} /> : <IconClock size={14} />
            }
          >
            {formatTime(timeLeft)}
          </Badge>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <ColorMode />
          <LanguagePicker />
        </Group>
      </Flex>
      <Divider />

      {/* Finish Modal */}
      <Modal
        opened={opened}
        onClose={isTimeUp || submitting ? () => {} : close}
        title={
          <Text fw={700} size="lg">
            {t("exam.finishModal.title")}
          </Text>
        }
        centered
        size="md"
        radius="lg"
        closeOnClickOutside={!isTimeUp && !submitting}
        closeOnEscape={!isTimeUp && !submitting}
        withCloseButton={!isTimeUp && !submitting}
        padding="md"
      >
        <Stack gap="lg">
          {/* Stats */}
          {isSecureMode ? (
            <SimpleGrid cols={2} spacing="sm">
              <Stack
                align="center"
                gap={6}
                p="sm"
                style={{ borderRadius: 12, border: "1px solid var(--mantine-color-blue-5)" }}
              >
                <ThemeIcon size={44} radius="xl" color="blue" variant="light">
                  <IconCheck size={22} />
                </ThemeIcon>
                <Text size="xl" fw={800} c="blue">
                  {answeredCount}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  {t("exam.answered")}
                </Text>
              </Stack>
              <Stack
                align="center"
                gap={6}
                p="sm"
                style={{ borderRadius: 12, border: "1px solid var(--mantine-color-yellow-5)" }}
              >
                <ThemeIcon size={44} radius="xl" color="yellow" variant="light">
                  <IconClock size={22} />
                </ThemeIcon>
                <Text size="xl" fw={800} c="yellow.6">
                  {unansweredCount}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  {t("exam.unanswered")}
                </Text>
              </Stack>
            </SimpleGrid>
          ) : (
            <SimpleGrid cols={3} spacing="sm">
              <Stack
                align="center"
                gap={6}
                p="sm"
                style={{ borderRadius: 12, border: "1px solid var(--mantine-color-green-5)" }}
              >
                <ThemeIcon size={44} radius="xl" color="green" variant="light">
                  <IconCheck size={22} />
                </ThemeIcon>
                <Text size="xl" fw={800} c="green">
                  {correctCount}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  {t("exam.correct")}
                </Text>
              </Stack>
              <Stack
                align="center"
                gap={6}
                p="sm"
                style={{ borderRadius: 12, border: "1px solid var(--mantine-color-red-5)" }}
              >
                <ThemeIcon size={44} radius="xl" color="red" variant="light">
                  <IconX size={22} />
                </ThemeIcon>
                <Text size="xl" fw={800} c="red">
                  {incorrectCount}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  {t("exam.incorrect")}
                </Text>
              </Stack>
              <Stack
                align="center"
                gap={6}
                p="sm"
                style={{ borderRadius: 12, border: "1px solid var(--mantine-color-default-border)" }}
              >
                <ThemeIcon size={44} radius="xl" color="gray" variant="light">
                  <IconClock size={22} />
                </ThemeIcon>
                <Text size="xl" fw={800} c="dimmed">
                  {unansweredCount}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  {t("exam.unanswered")}
                </Text>
              </Stack>
            </SimpleGrid>
          )}

          {!allAnswered && !submitError && (
            <Alert
              color="yellow"
              variant="light"
              icon={<IconAlertTriangle size={18} />}
            >
              {t("exam.finishModal.warning", { count: unansweredCount })}
            </Alert>
          )}

          {/*
            Submit muvaffaqiyatsiz bo'lganda: modal ochiq qoladi, xato
            ko'rsatiladi va javoblar localStorage'da zaxiralanganligi
            aytiladi. Foydalanuvchi "imtihon topshirildi" deb adashmaydi.
          */}
          {submitError && (
            <Alert
              color="red"
              variant="light"
              icon={<IconAlertTriangle size={18} />}
              title={t("notification.submitError")}
            >
              <Stack gap={6}>
                <Text size="sm">{submitError}</Text>
                <Text size="xs" c="dimmed">
                  {t("exam.answersBackedUp", {
                    defaultValue:
                      "Javoblaringiz qurilmangizda saqlandi — qayta urinib ko'ring.",
                  })}
                </Text>
              </Stack>
            </Alert>
          )}

          <Divider />

          {/* Actions */}
          <Stack gap="xs">
            {submitError ? (
              <Button
                onClick={() => handleSubmit(lastNavigateToRef.current || backUrl)}
                loading={submitting}
                disabled={submitting}
                leftSection={<IconRefresh size={18} />}
                fullWidth
                size="md"
                radius="md"
              >
                {t("common.retry")}
              </Button>
            ) : null}

            {/* Primary: Submit & view results */}
            <Button
              onClick={() => handleSubmit(backUrl)}
              loading={submitting}
              rightSection={<IconCheck size={18} />}
              disabled={submitting}
              variant={submitError ? "light" : "filled"}
              fullWidth
              size="md"
              radius="md"
            >
              {t("exam.finish")}
            </Button>

            <Button
              variant="light"
              color="blue"
              onClick={() => handleSubmit(`/exam/result/${sessionId}`)}
              loading={submitting}
              rightSection={<IconChartBar size={18} />}
              disabled={submitting}
              fullWidth
              size="md"
              radius="md"
            >
              {t("exam.viewResults")}
            </Button>

            {/* Secondary: Exit / Restart */}
            <Flex gap="xs">
              <Button
                color="gray"
                variant="light"
                leftSection={<IconArrowLeft size={16} />}
                fullWidth
                radius="md"
                // `submitting` qo'shildi: submit ketayotganda chiqib ketish
                // sessiyani abandon qilib, topshirilayotgan imtihonni buzardi.
                disabled={isTimeUp || submitting || abandoning}
                loading={abandoning}
                onClick={async () => {
                  if (abandoning || submitting) return;
                  setAbandoning(true);
                  if (sessionId) {
                    try {
                      await api.delete(`/api/v2/exams/${sessionId}/abandon`);
                    } catch {
                      // Ignore abandon errors
                    }
                    // Foydalanuvchi ataylab chiqdi — zaxirani ham tozalaymiz,
                    // aks holda keyingi sessiyada eski javoblar "tiklanardi".
                    clearBackup(sessionId);
                  }
                  setAbandoning(false);
                  close();
                  navigate(backUrl, { replace: true });
                }}
              >
                {t("exam.exit")}
              </Button>
              <Button
                color="gray"
                variant="light"
                onClick={handleReset}
                disabled={submitting || isTimeUp}
                leftSection={<IconRefresh size={16} />}
                fullWidth
                radius="md"
              >
                {t("exam.restart")}
              </Button>
            </Flex>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
});
