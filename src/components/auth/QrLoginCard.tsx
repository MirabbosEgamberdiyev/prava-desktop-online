/**
 * PRAVA DESKTOP ONLINE — QR LOGIN & DEVICE PAIRING COMPONENT
 * Renders dynamic QR code with 90s TTL countdown, radar animation,
 * and automatic session pairing callback.
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
} from "@mantine/core";
import { QRCodeSVG } from "qrcode.react";
import { IconRefresh, IconCheck, IconDeviceMobile, IconAlertCircle } from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { QrAuthService, type QrInitResponse, type QrSessionStatus } from "../../api/qrAuthService";
import { useAuth } from "../../auth/AuthContext";
import { showToast } from "../../utils/notificationUtils";

interface QrLoginCardProps {
  onCancel?: () => void;
}

export function QrLoginCard({ onCancel: _onCancel }: QrLoginCardProps = {}) {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/me";

  const [session, setSession] = useState<QrInitResponse | null>(null);
  const [status, setStatus] = useState<QrSessionStatus>("PENDING");
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  const startNewSession = async () => {
    setLoading(true);
    setError(null);
    setStatus("PENDING");

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    try {
      const newSession = await QrAuthService.initSession();
      setSession(newSession);
      setTimeLeft(newSession.expiresIn || 90);

      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            setStatus("EXPIRED");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling every 2 seconds
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await QrAuthService.checkStatus(newSession.sessionId);
          if (res.status === "APPROVED") {
            clearInterval(pollTimerRef.current);
            clearInterval(countdownTimerRef.current);
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
            clearInterval(pollTimerRef.current);
            clearInterval(countdownTimerRef.current);
            setStatus(res.status);
          } else if (res.status === "SCANNED") {
            setStatus("SCANNED");
          }
        } catch {
          // continue polling
        }
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "QR sessiyasini boshlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startNewSession();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const handleSimulateApproval = () => {
    if (session?.sessionId) {
      QrAuthService.simulateApprove(session.sessionId);
    }
  };

  return (
    <Stack gap="md" align="center" style={{ width: "100%" }}>
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" w="100%">
          {error}
        </Alert>
      )}

      {loading ? (
        <Center py={60}>
          <Stack align="center" gap="xs">
            <Loader size="md" />
            <Text size="sm" c="dimmed">
              QR kod tayyorlanmoqda...
            </Text>
          </Stack>
        </Center>
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
              sections={[{ value: (timeLeft / (session.expiresIn || 90)) * 100, color: timeLeft < 15 ? "red" : "blue" }]}
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

      {/* Instructions */}
      <Paper p="sm" radius="md" withBorder style={{ width: "100%", background: "var(--surface-muted)" }}>
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

      {/* Demo simulation helper for QA/dev testing */}
      {session && status === "PENDING" && (
        <Button
          variant="subtle"
          size="xs"
          color="gray"
          leftSection={<IconCheck size={14} />}
          onClick={handleSimulateApproval}
        >
          {t("auth.demoApprove", { defaultValue: "Mobil ilovadan tasdiqlashni sinash (Demo)" })}
        </Button>
      )}
    </Stack>
  );
}

export default QrLoginCard;
