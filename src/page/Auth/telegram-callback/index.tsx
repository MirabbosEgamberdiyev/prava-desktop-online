import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Anchor,
  Button,
  Center,
  Container,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAuth } from "../../../auth/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../../../api/api";
import { IconBrandTelegram } from "@tabler/icons-react";
import { ENV } from "../../../config/env";
import SEO from "../../../components/common/SEO";

const REDIRECT_DELAY = 5;

const TelegramCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const [error, setError] = useState<"expired" | "invalid" | null>(null);
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);
  const hasProcessed = useRef(false);

  // Countdown timer for redirect on error
  useEffect(() => {
    if (!error) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/auth/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [error, navigate]);

  // Process telegram token login
  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setError("invalid");
      return;
    }

    const loginWithToken = async () => {
      try {
        const response = await api.post("/api/v1/auth/telegram/token-login", {
          token,
        });

        if (response.data.success) {
          const userLang = response.data.data.user?.preferredLanguage;
          if (userLang) {
            i18n.changeLanguage(userLang);
          }

          login(response.data.data);

          notifications.show({
            title: t("auth.telegram.successTitle"),
            message: t("auth.telegram.successMessage"),
            color: "green",
            withBorder: true,
          });

          navigate("/me");
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401 || status === 410) {
          setError("expired");
        } else {
          setError("invalid");
        }
        notifications.show({
          color: "red",
          title: t("common.error"),
          message:
            status === 401 || status === 410
              ? t("auth.telegramCallbackExpired")
              : t("auth.telegramCallbackInvalid"),
          withBorder: true,
        });
      }
    };

    loginWithToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
    <SEO
      title="Telegram orqali kirish"
      description="Telegram orqali avtorizatsiya — Prava Online haydovchilik guvohnomasi imtihoniga tayyorgarlik platformasi."
      canonical="/auth/telegram-callback"
      noIndex
    />
    <Container size={440} my={{ base: 40, sm: 80 }}>
      <Center>
        <Paper
          withBorder
          shadow="md"
          p="xl"
          radius="md"
          w="100%"
          ta="center"
        >
          <Stack align="center" gap="md">
            {error ? (
              <>
                <Title order={3} c="red">
                  {t("common.error")}
                </Title>
                <Text c="dimmed" maw={350}>
                  {error === "expired"
                    ? t("auth.telegramCallbackExpired")
                    : t("auth.telegramCallbackInvalid")}
                </Text>
                {error === "expired" && (
                  <Anchor
                    href={`https://t.me/${ENV.TELEGRAM_BOT_USERNAME}`}
                    target="_blank"
                  >
                    <Button
                      leftSection={<IconBrandTelegram size={20} />}
                      variant="filled"
                      color="#229ED9"
                      radius="md"
                      size="md"
                    >
                      {t("auth.telegramCallbackRetry")}
                    </Button>
                  </Anchor>
                )}
                <Text size="sm" c="dimmed">
                  {t("forgotPassword.backToLogin")}... {countdown}s
                </Text>
              </>
            ) : (
              <>
                <IconBrandTelegram size={48} color="#229ED9" />
                <Loader size="md" color="#229ED9" />
                <Text c="dimmed">
                  {t("auth.telegramCallbackProcessing")}
                </Text>
              </>
            )}
          </Stack>
        </Paper>
      </Center>
    </Container>
    </>
  );
};

export default TelegramCallback;
