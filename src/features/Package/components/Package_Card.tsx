import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Text,
  Button,
  Group,
  Badge,
  Divider,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconClock, IconQuestionMark, IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import api from "../../../api/api";
import { ExamModeModal, type ExamMode } from "../../../components/quiz/ExamModeModal";
import { TopicBadge } from "../../../components/common/TopicBadge";
import PaymentButtons from "../../../payment/PaymentButtons";
import type { Package } from "../types";
import classes from "./PackageCard.module.css";

interface Props {
  pkg: Package;
}

const Package_Card = ({ pkg }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [modeModalOpened, { open: openModeModal, close: closeModeModal }] =
    useDisclosure(false);
  const [payModalOpened, { open: openPayModal, close: closePayModal }] =
    useDisclosure(false);

  const handleStartExam = async (mode: ExamMode = "visible") => {
    setLoading(true);

    const endpoint =
      mode === "secure"
        ? "/api/v2/exams/start-secure"
        : "/api/v2/exams/start-visible";

    try {
      const response = await api.post(endpoint, {
        packageId: pkg.id,
      });

      if (response.data) {
        navigate(`/packages/${pkg.id}`, {
          state: {
            examData: response.data,
            packageInfo: pkg,
            examMode: mode,
          },
        });
      }
    } catch (error: unknown) {
      // 402 Payment Required → open payment modal
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 402) {
        setLoading(false);
        closeModeModal();
        openPayModal();
        return;
      }
      const errorMessage =
        (error as { response?: { data?: { message?: string; error?: string } } })
          ?.response?.data?.message ||
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t("package.startError");
      notifications.show({
        title: t("common.error"),
        message: errorMessage,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    // Free va pullik — ikkalasi ham ExamModeModal ni ochadi.
    // Agar pullik bo'lib foydalanuvchida ruxsat bo'lmasa, backend 402 qaytaradi
    // va handleStartExam ichida to'lov modali ochiladi.
    openModeModal();
  };

  return (
    <Card
      p={{ base: "sm", sm: "md", lg: "lg" }}
      radius="md"
      withBorder
      shadow="sm"
      className={classes.card}
    >
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Text fw={700} size="md" lineClamp={2} style={{ flex: 1 }}>
          {pkg.name}
        </Text>
        {pkg.isFree ? (
          <Badge size="sm" className={classes.freeBadge}>
            {t("package.free")}
          </Badge>
        ) : (
          <Badge size="sm" className={classes.paidBadge}>
            {pkg.price} {t("package.sum")}
          </Badge>
        )}
      </Group>

      {pkg.topicName && (
        <Group mb="xs">
          <TopicBadge name={pkg.topicName} />
        </Group>
      )}

      <div className={classes.metaGrid}>
        <Group gap={6}>
          <IconQuestionMark size={16} color="var(--mantine-color-blue-5)" />
          <Text size="sm" c="dimmed">
            <b>{pkg.actualQuestionCount}</b> {t("package.questions")}
          </Text>
        </Group>

        <Group gap={6}>
          <IconClock size={16} color="var(--mantine-color-orange-5)" />
          <Text size="sm" c="dimmed">
            <b>{pkg.durationMinutes}</b> min
          </Text>
        </Group>

        <Group gap={6}>
          <IconCheck size={16} color="var(--mantine-color-green-5)" />
          <Text size="sm" c="dimmed">
            <b>{pkg.passingScore}%</b>
          </Text>
        </Group>
      </div>

      <Divider my="sm" variant="dashed" />

      <Button
        fullWidth
        size="sm"
        radius="md"
        loading={loading}
        onClick={handleButtonClick}
        className={classes.startButton}
      >
        {pkg.isFree ? t("package.study") : t("package.buy")}
      </Button>

      <ExamModeModal
        opened={modeModalOpened}
        onClose={closeModeModal}
        onSelect={(mode) => handleStartExam(mode)}
      />

      <Modal
        opened={payModalOpened}
        onClose={closePayModal}
        title={t("package.buy") || "Paketni sotib olish"}
        centered
        size="md"
      >
        <PaymentButtons
          packageId={pkg.id}
          packageName={pkg.name}
          priceSum={Number(pkg.price ?? 0)}
        />
      </Modal>
    </Card>
  );
};

export { Package_Card };
