/**
 * PRAVA DESKTOP ONLINE — QR LOGIN & DEVICE PAIRING COMPONENT
 * Renders dynamic QR code with 90s TTL countdown, radar animation,
 * and automatic session pairing callback.
 *
 * Production Hardened: Zero fake/demo code, graceful backend availability handling.
 */

import { useState, useEffect, useRef } from "react";
import {
  Stack,
  Text,
  Paper,
  Center,
  Button,
  RingProgress,
  Badge,
  Loader,
  Group,
  Box,
  Alert,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import { QRCodeSVG } from "qrcode.react";
import {
  IconRefresh,
  IconDeviceMobile,
  IconAlertCircle,
  IconLock,
  IconQrcode,
} from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  QrAuthService,
  QrServiceUnavailableError,
  type QrInitResponse,
  type QrSessionStatus,
} from "../../api/qrAuthService";
import { useAuth } from "../../auth/AuthContext";
import { showToast } from "../../utils/notificationUtils";
import TelegramLoginButton from "./TelegramLoginButton";

interface QrLoginCardProps {
  onSwitchToPassword?: () => void;
  onCancel?: () => void;
}

export function QrLoginCard({ onSwitchToPassword, onCancel: _onCancel }: QrLoginCardProps = {}) {
  const { i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/me";

  const [session, setSession] = useState<QrInitResponse | null>(null);
  const [status, setStatus] = useState<QrSessionStatus>("PENDING");
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [loading, setLoading] = useState<boolean>(true);
  const [serviceUnavailable, setServiceUnavailable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const startNewSession = async () => {
    setLoading(true);
    setErrorMessage(null);
    setServiceUnavailable(false);
    setStatus("PENDING");
    clearTimers();

    try {
      const newSession = await QrAuthService.initSession();
      setSession(newSession);
      setTimeLeft(newSession.expiresIn || 90);

      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearTimers();
            setStatus("EXPIRED");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling every 2.5 seconds
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await QrAuthService.checkStatus(newSession.sessionId);
          if (res.status === "APPROVED") {
            clearTimers();
            setStatus("APPROVED");

            if (res.accessToken && res.user) {
              const userLang = res.user.preferredLanguage;
              if (userLang) {
                i18n.changeLanguage(userLang);
              }

              login({
                user: res.user,
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
              });

              showToast({
                id: "qr-login-success",
                dedupeKey: "qr-login-success",
                title: "Muvaffaqiyatli bog'landi!",
                message: "Qurilmangiz orqali tizimga muvaffaqiyatli kirdingiz.",
                color: "teal",
                withBorder: true,
              });

              navigate(from, { replace: true });
            }
          } else if (res.status === "EXPIRED" || res.status === "REJECTED") {
            clearTimers();
            setStatus(res.status);
          } else if (res.status === "SCANNED") {
            setStatus("SCANNED");
          }
        } catch {
          // Continue polling on transient network glitches
        }
      }, 2500);
    } catch (err: any) {
      if (err instanceof QrServiceUnavailableError) {
        setServiceUnavailable(true);
      } else {
        setErrorMessage(err?.message || "QR sessiyasini boshlashda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startNewSession();

    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack gap="md" align="center" style={{ width: "100%" }}>
      {errorMessage && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          w="100%"
          withCloseButton
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {loading ? (
        <Center py={50}>
          <Stack align="center" gap="xs">
            <Loader size="md" />
            <Text size="sm" c="dimmed">
              QR kod tayyorlanmoqda...
            </Text>
          </Stack>
        </Center>
      ) : serviceUnavailable ? (
        /* Service Unavailable / Work in Progress State */
        <Paper
          p="lg"
          radius="md"
          withBorder
          style={{ width: "100%", background: "var(--surface)" }}
        >
          <Stack align="center" gap="sm" ta="center">
            <ThemeIcon size={48} radius="xl" color="blue" variant="light">
              <IconQrcode size={26} />
            </ThemeIcon>

            <Text fw={700} fz="md">
              QR orqali kirish tez kunda ishga tushiriladi
            </Text>

            <Text size="xs" c="dimmed" maw={360}>
              Server tomonida mobil QR autentifikatsiya xizmati yangilanmoqda.
              Hozirda desktop ilovaga kirish uchun quyidagi qulay usullardan foydalanishingiz mumkin:
            </Text>

            <Divider my="xs" style={{ width: "100%" }} />

            <Stack gap="xs" style={{ width: "100%" }}>
              <TelegramLoginButton mode="login" />

              {onSwitchToPassword && (
                <Button
                  variant="light"
                  color="blue"
                  fullWidth
                  leftSection={<IconLock size={16} />}
                  onClick={onSwitchToPassword}
                >
                  Parol orqali kirish
                </Button>
              )}

              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconRefresh size={14} />}
                onClick={startNewSession}
              >
                Qayta tekshirish
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : session && status !== "EXPIRED" ? (
        <Stack align="center" gap="sm">
          {/* QR Code Canvas with Scanning Frame */}
          <Box
            style={{
              position: "relative",
              padding: "16px",
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
              border: "2px solid var(--mantine-color-blue-1)",
              overflow: "hidden",
            }}
          >
            <QRCodeSVG
              value={session.qrPayload}
              size={210}
              level="M"
              includeMargin={false}
            />

            {/* Radar scanner line animation */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, transparent, #228be6, transparent)",
                boxShadow: "0 0 8px #228be6",
                animation: "qrScanPulse 2.5s infinite ease-in-out",
              }}
            />
          </Box>

          <style>
            {`
              @keyframes qrScanPulse {
                0% { top: 12px; opacity: 0.2; }
                50% { top: calc(100% - 16px); opacity: 1; }
                100% { top: 12px; opacity: 0.2; }
              }
            `}
          </style>

          {/* Countdown & Status */}
          <Group gap="sm" align="center">
            <RingProgress
              size={36}
              thickness={3}
              roundCaps
              sections={[
                {
                  value: (timeLeft / (session.expiresIn || 90)) * 100,
                  color: timeLeft < 15 ? "red" : "blue",
                },
              ]}
              label={
                <Center>
                  <Text fz={11} fw={700}>
                    {timeLeft}
                  </Text>
                </Center>
              }
            />
            <div>
              <Badge
                variant="light"
                color={
                  status === "SCANNED" ? "violet" : status === "APPROVED" ? "teal" : "blue"
                }
              >
                {status === "SCANNED"
                  ? "Skanerlandi! Mobil ilovada tasdiqlang..."
                  : status === "APPROVED"
                  ? "Tasdiqlandi!"
                  : `Muddati: ${timeLeft}s`}
              </Badge>
            </div>
          </Group>

          {/* Instructions */}
          <Paper
            p="sm"
            radius="md"
            withBorder
            style={{ width: "100%", background: "var(--surface-muted)" }}
          >
            <Stack gap={6}>
              <Group gap="xs">
                <IconDeviceMobile size={18} color="var(--mantine-color-blue-6)" />
                <Text fw={600} fz="xs">
                  Mobil ilova orqali tezkor kirish:
                </Text>
              </Group>
              <Text fz="xs" c="dimmed">
                1. <strong>Prava Online</strong> mobil ilovangizni oching.
              </Text>
              <Text fz="xs" c="dimmed">
                2. <strong>Profil</strong> → <strong>Sozlamalar</strong> bo‘limiga o‘ting.
              </Text>
              <Text fz="xs" c="dimmed">
                3. <strong>QR kod orqali ulanish</strong> tugmasini bosing va ushbu kodni skanerlang.
              </Text>
            </Stack>
          </Paper>
        </Stack>
      ) : (
        /* Expired Session View */
        <Center py={40}>
          <Stack align="center" gap="sm">
            <Text c="dimmed" fz="sm">
              QR kod muddati tugadi
            </Text>
            <Button
              variant="filled"
              leftSection={<IconRefresh size={16} />}
              onClick={startNewSession}
              radius="md"
            >
              Kodni yangilash
            </Button>
          </Stack>
        </Center>
      )}
    </Stack>
  );
}

export default QrLoginCard;
