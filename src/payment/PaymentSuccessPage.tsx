import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconX,
  IconSparkles,
} from '@tabler/icons-react';
import { paymentApi } from './paymentApi';
import type { PaymentStatusResponse } from './paymentApi';

/**
 * Polls /payment/{id}/status until state is terminal (PERFORMED / CANCELLED / REFUNDED / FAILED).
 * Attach this component to the route /payment/success
 * — Click return_url and Payme c= param both redirect here with ?payment=<id>
 */
export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idStr = params.get('payment');
    if (!idStr) {
      setError(t("payment.failedDesc", "To'lov identifikatori topilmadi"));
      setPolling(false);
      return;
    }
    const id = Number(idStr);

    let attempts = 0;
    const maxAttempts = 30; // ~90 seconds
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const r = await paymentApi.status(id);
        setStatus(r);
        if (
          r.state === 'PERFORMED' ||
          r.state === 'CANCELLED' ||
          r.state === 'REFUNDED' ||
          r.state === 'FAILED'
        ) {
          setPolling(false);
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
          setPolling(false);
          return;
        }
        timer = setTimeout(tick, 3000);
      } catch (e: any) {
        setError(e?.response?.data?.error ?? t("common.unknownError", "Xatolik yuz berdi"));
        setPolling(false);
      }
    };
    tick();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [t]);

  const isSuccess = status?.state === 'PERFORMED';
  const isFailed =
    status?.state === 'CANCELLED' ||
    status?.state === 'REFUNDED' ||
    status?.state === 'FAILED';

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'PERFORMED':
        return t("payment.statePerformed", "Muvaffaqiyatli");
      case 'CANCELLED':
        return t("payment.stateCancelled", "Bekor qilingan");
      case 'REFUNDED':
        return t("payment.stateRefunded", "Qaytarilgan");
      case 'FAILED':
        return t("payment.stateFailed", "Xatolik");
      default:
        return t("payment.statePending", "Kutilmoqda");
    }
  };

  return (
    <div className="review-screen">
      <header className="review-header">
        <button
          className="review-back-btn"
          type="button"
          onClick={() => navigate('/me')}
        >
          <IconArrowLeft size={16} />
          <span>{t("common.back", "Bosh sahifaga")}</span>
        </button>
        <span className="review-header-title">{t("payment.statusTitle", "To'lov holati")}</span>
      </header>

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}
      >
        <Card
          shadow="md"
          padding="xl"
          radius="lg"
          withBorder
          maw={480}
          w="100%"
          style={{ background: "var(--card-bg)" }}
        >
          <Stack gap="lg" align="center">
            {polling && (
              <Stack align="center" gap="sm" py="xl">
                <Loader size="lg" color="blue" />
                <Title order={3} ta="center" size="h4">
                  {t("payment.verifying", "To'lov tasdiqlanmoqda...")}
                </Title>
                <Text size="sm" c="dimmed" ta="center">
                  {t("payment.verifyingDesc", "Iltimos kuting, to'lov tizimi bilan sinxronlanmoqda.")}
                </Text>
              </Stack>
            )}

            {error && (
              <Alert color="red" w="100%" radius="md">
                {error}
              </Alert>
            )}

            {status && !polling && (
              <>
                {/* Visual Status Icon */}
                {isSuccess && (
                  <ThemeIcon size={72} radius="xl" color="green" variant="light">
                    <IconCheck size={38} stroke={2.5} />
                  </ThemeIcon>
                )}
                {isFailed && (
                  <ThemeIcon size={72} radius="xl" color="red" variant="light">
                    <IconX size={38} stroke={2.5} />
                  </ThemeIcon>
                )}
                {!isSuccess && !isFailed && (
                  <ThemeIcon size={72} radius="xl" color="orange" variant="light">
                    <IconClock size={38} stroke={2.5} />
                  </ThemeIcon>
                )}

                {/* Status Title */}
                <Stack gap={4} align="center">
                  <Title order={2} size="h3" ta="center">
                    {isSuccess
                      ? t("payment.successTitle", "To'lov muvaffaqiyatli amalga oshirildi!")
                      : isFailed
                      ? t("payment.failedTitle", "To'lov amalga oshmadi")
                      : t("payment.statusTitle", "To'lov holati")}
                  </Title>
                  <Text size="sm" c="dimmed" ta="center">
                    {isSuccess
                      ? t("payment.successDesc", "To'lov muvaffaqiyatli! Paketga kirish ochildi.")
                      : isFailed
                      ? t("payment.failedDesc", "To'lov amalga oshmadi yoki bekor qilindi.")
                      : t("payment.verifying", "To'lov tasdiqlanmoqda...")}
                  </Text>
                </Stack>

                {/* Amount Hero */}
                <Box
                  w="100%"
                  py="md"
                  px="lg"
                  ta="center"
                  style={{
                    borderRadius: "var(--radius)",
                    background: isSuccess
                      ? "rgba(47, 158, 68, 0.08)"
                      : isFailed
                      ? "rgba(224, 49, 49, 0.08)"
                      : "rgba(25, 113, 194, 0.08)",
                  }}
                >
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                    {t("payment.amount", "To'langan summa")}
                  </Text>
                  <Text size="28px" fw={800} c={isSuccess ? "green.6" : isFailed ? "red.6" : "blue.6"}>
                    {Number(status.amount).toLocaleString('uz-UZ')}{" "}
                    <span style={{ fontSize: "16px", fontWeight: 600 }}>
                      {t("payment.currency", "so'm")}
                    </span>
                  </Text>
                </Box>

                {/* Key-Value Breakdown */}
                <Paper withBorder p="sm" radius="md" w="100%" style={{ background: "transparent" }}>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        {t("payment.paymentId", "To'lov ID")}:
                      </Text>
                      <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>
                        #{status.paymentId}
                      </Text>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        {t("payment.provider", "To'lov tizimi")}:
                      </Text>
                      <Badge variant="light" color="blue" size="sm">
                        {status.provider}
                      </Badge>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        {t("payment.status", "Holat")}:
                      </Text>
                      <Badge
                        variant="filled"
                        color={isSuccess ? "green" : isFailed ? "red" : "orange"}
                        size="sm"
                      >
                        {getStateLabel(status.state)}
                      </Badge>
                    </Group>
                  </Stack>
                </Paper>

                {/* CTAs */}
                <Stack gap="xs" w="100%" mt="xs">
                  {isSuccess ? (
                    <>
                      <Button
                        size="md"
                        radius="md"
                        color="blue"
                        fullWidth
                        rightSection={<IconSparkles size={16} />}
                        onClick={() => navigate('/packages')}
                      >
                        {t("payment.startLearning", "O'rganishni boshlash")}
                      </Button>
                      <Button
                        size="md"
                        radius="md"
                        variant="subtle"
                        fullWidth
                        onClick={() => navigate('/me')}
                      >
                        {t("nav.dashboard", "Boshqaruv paneli")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="md"
                        radius="md"
                        color="blue"
                        fullWidth
                        leftSection={<IconCreditCard size={16} />}
                        onClick={() => navigate('/me')}
                      >
                        {t("payment.retry", "Qayta urinib ko'rish")}
                      </Button>
                      <Button
                        size="md"
                        radius="md"
                        variant="subtle"
                        fullWidth
                        onClick={() => navigate('/me')}
                      >
                        {t("common.backToHome", "Bosh sahifaga")}
                      </Button>
                    </>
                  )}
                </Stack>
              </>
            )}

            {error && !status && (
              <Button size="md" radius="md" fullWidth onClick={() => navigate('/me')}>
                {t("common.backToHome", "Bosh sahifaga")}
              </Button>
            )}
          </Stack>
        </Card>
      </main>
    </div>
  );
}
