/**
 * PRAVA DESKTOP ONLINE — WEBCAM QR SCANNER COMPONENT
 * Implements Desktop Webcam Scanning Protocol:
 * permission -> scanner feed -> jsQR frame detection -> invalid QR handling -> retry -> success auth.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Stack,
  Text,
  Paper,
  Button,
  Badge,
  Loader,
  Group,
  Box,
  Alert,
  ThemeIcon,
} from "@mantine/core";
import {
  IconCamera,
  IconCameraOff,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconScan,
} from "@tabler/icons-react";
import jsQR from "jsqr";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";
import { useAuth } from "../../auth/AuthContext";
import { showToast } from "../../utils/notificationUtils";

export type WebcamScanStatus =
  | "idle"
  | "requesting"
  | "streaming"
  | "verifying"
  | "invalid_qr"
  | "permission_denied"
  | "error"
  | "success";

interface QrWebcamScannerProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function parseQrData(data: string): { token?: string; sessionId?: string } {
  const trimmed = data.trim();

  // 1. Check for URL parameters
  if (trimmed.includes("token=")) {
    try {
      const url = new URL(trimmed, "https://pravaonline.uz");
      const tok = url.searchParams.get("token");
      if (tok) return { token: tok };
    } catch {
      const m = trimmed.match(/token=([a-zA-Z0-9_\-\.]+)/);
      if (m) return { token: m[1] };
    }
  }

  if (trimmed.includes("sessionId=")) {
    try {
      const url = new URL(trimmed, "https://pravaonline.uz");
      const sid = url.searchParams.get("sessionId");
      if (sid) return { sessionId: sid };
    } catch {
      const m = trimmed.match(/sessionId=([a-zA-Z0-9_\-\.]+)/);
      if (m) return { sessionId: m[1] };
    }
  }

  // 2. Check for JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.token) return { token: parsed.token };
      if (parsed.sessionId) return { sessionId: parsed.sessionId };
    } catch {
      // not valid json
    }
  }

  // 3. Fallback: treat as raw token if length is reasonable (>= 16 chars)
  if (trimmed.length >= 16) {
    return { token: trimmed };
  }

  return {};
}

export function QrWebcamScanner({ onSuccess, onCancel: _onCancel }: QrWebcamScannerProps) {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/me";

  const [status, setStatus] = useState<WebcamScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Process detected QR code payload
  const handleQrDetected = useCallback(
    async (codeData: string) => {
      stopCamera();
      setStatus("verifying");
      setErrorMessage(null);

      const { token, sessionId } = parseQrData(codeData);

      if (!token && !sessionId) {
        setStatus("invalid_qr");
        setErrorMessage(
          t("qr.invalidQrCode", {
            defaultValue: "Yaroqsiz QR kod. Iltimos, Prava Online QR kodini ko'rsating.",
          })
        );
        return;
      }

      try {
        let authData: any = null;

        if (token) {
          // Verify via token login endpoint
          const res = await api.post("/api/v1/auth/telegram/token-login", { token });
          if (res.data?.success && res.data?.data) {
            authData = res.data.data;
          }
        } else if (sessionId) {
          // Verify via QR pairing endpoint
          const res = await api.get(`/api/v1/auth/qr/status?sessionId=${sessionId}`);
          if (res.data?.data?.accessToken) {
            authData = res.data.data;
          }
        }

        if (authData?.accessToken && authData?.user) {
          setStatus("success");
          if (authData.user.preferredLanguage) {
            i18n.changeLanguage(authData.user.preferredLanguage);
          }
          login({
            user: authData.user,
            accessToken: authData.accessToken,
            refreshToken: authData.refreshToken,
          });

          showToast({
            id: "webcam-qr-success",
            title: t("qr.loginSuccessTitle", { defaultValue: "Muvaffaqiyatli kirildi!" }),
            message: t("qr.loginSuccessDesc", { defaultValue: "Tizimga muvaffaqiyatli ulandingiz" }),
            color: "green",
          });

          if (onSuccess) {
            onSuccess();
          } else {
            navigate(from, { replace: true });
          }
          return;
        }

        throw new Error("Serverdan kirish ma'lumotlari olinmadi");
      } catch (err: any) {
        setStatus("invalid_qr");
        setErrorMessage(
          err?.response?.data?.message ||
            t("qr.invalidQrError", {
              defaultValue: "QR kod yaroqsiz yoki muddati o'tgan. Qayta urinib ko'ring.",
            })
        );
      }
    },
    [from, i18n, login, navigate, onSuccess, stopCamera, t]
  );

  // Scan frame loop
  const startScanningLoop = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        handleQrDetected(code.data);
      }
    }, 120);
  }, [handleQrDetected]);

  // Request camera and stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setStatus("requesting");
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("error");
      setErrorMessage(
        t("qr.cameraNotSupported", {
          defaultValue: "Qurilmangizda web-kamera funksiyasi qo'llab-quvvatlanmaydi.",
        })
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setStatus("streaming");
      startScanningLoop();
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("permission_denied");
        setErrorMessage(
          t("qr.cameraPermissionDenied", {
            defaultValue: "Kameradan foydalanish uchun ruxsat berilmadi.",
          })
        );
      } else {
        setStatus("error");
        setErrorMessage(
          t("qr.cameraError", {
            defaultValue: "Web-kamerani ishga tushirib bo'lmadi. Iltimos, kamerani tekshiring.",
          })
        );
      }
    }
  }, [startScanningLoop, stopCamera, t]);

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <Paper p="md" radius="md" withBorder style={{ background: "var(--surface)", width: "100%" }}>
      <Stack align="center" gap="sm">
        {/* Status Header Badge */}
        <Group justify="space-between" style={{ width: "100%" }}>
          <Group gap="xs">
            <ThemeIcon size="sm" color={status === "streaming" ? "green" : "blue"} variant="light">
              <IconScan size={14} />
            </ThemeIcon>
            <Text size="xs" fw={700} c="dimmed">
              WEB-KAMERA SKANER
            </Text>
          </Group>

          {status === "streaming" && (
            <Badge color="green" variant="dot" size="sm">
              {t("qr.cameraActive", { defaultValue: "Skaner faol" })}
            </Badge>
          )}
          {status === "requesting" && (
            <Badge color="blue" variant="light" size="sm">
              {t("qr.connectingCamera", { defaultValue: "Ulanmoqda..." })}
            </Badge>
          )}
          {status === "verifying" && (
            <Badge color="yellow" variant="filled" size="sm">
              {t("qr.verifying", { defaultValue: "Tekshirilmoqda..." })}
            </Badge>
          )}
          {status === "invalid_qr" && (
            <Badge color="red" variant="filled" size="sm">
              {t("qr.invalidBadge", { defaultValue: "Yaroqsiz QR" })}
            </Badge>
          )}
        </Group>

        {/* Live Camera Viewfinder Box */}
        <Box
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 320,
            height: 240,
            borderRadius: 14,
            overflow: "hidden",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Video Stream Element */}
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)", // Mirror effect for natural webcam feel
              display: status === "streaming" ? "block" : "none",
            }}
          />

          {/* Hidden Canvas for jsQR extraction */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Viewfinder Target Framing Overlay */}
          {status === "streaming" && (
            <Box
              style={{
                position: "absolute",
                top: "20px",
                bottom: "20px",
                left: "20px",
                right: "20px",
                border: "2px solid #228be6",
                borderRadius: "12px",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Animated scanning radar line */}
              <Box
                style={{
                  width: "90%",
                  height: "2px",
                  background: "#40c057",
                  boxShadow: "0 0 8px #40c057",
                  animation: "scanLine 2s infinite ease-in-out alternate",
                }}
              />
            </Box>
          )}

          {/* Requesting Loader */}
          {status === "requesting" && (
            <Stack align="center" gap="xs">
              <Loader color="blue" size="md" />
              <Text size="xs" c="white">
                {t("qr.startingCamera", { defaultValue: "Kamera ishga tushirilmoqda..." })}
              </Text>
            </Stack>
          )}

          {/* Verifying Loader */}
          {status === "verifying" && (
            <Stack align="center" gap="xs">
              <Loader color="yellow" size="md" />
              <Text size="xs" c="white" fw={600}>
                {t("qr.authorizing", { defaultValue: "QR kod tekshirilmoqda..." })}
              </Text>
            </Stack>
          )}

          {/* Permission Denied UI */}
          {status === "permission_denied" && (
            <Stack align="center" gap="xs" p="md" ta="center">
              <ThemeIcon color="red" size={38} radius="xl">
                <IconCameraOff size={20} />
              </ThemeIcon>
              <Text size="xs" c="white" fw={600}>
                {t("qr.permissionRequired", { defaultValue: "Kameraga ruxsat berilmadi" })}
              </Text>
            </Stack>
          )}

          {/* Invalid QR or Error UI */}
          {(status === "invalid_qr" || status === "error") && (
            <Stack align="center" gap="xs" p="md" ta="center">
              <ThemeIcon color="red" size={38} radius="xl">
                <IconAlertCircle size={20} />
              </ThemeIcon>
              <Text size="xs" c="white" fw={600}>
                {status === "invalid_qr"
                  ? t("qr.invalidQrTitle", { defaultValue: "Yaroqsiz QR kod" })
                  : t("qr.errorTitle", { defaultValue: "Xatolik yuz berdi" })}
              </Text>
            </Stack>
          )}

          {/* Success indicator */}
          {status === "success" && (
            <Stack align="center" gap="xs">
              <ThemeIcon color="green" size={48} radius="xl">
                <IconCheck size={28} />
              </ThemeIcon>
              <Text size="xs" c="white" fw={700}>
                {t("qr.authenticated", { defaultValue: "Tasdiqlandi!" })}
              </Text>
            </Stack>
          )}
        </Box>

        {/* Helper Instructions */}
        <Text size="xs" c="dimmed" ta="center" maw={300}>
          {status === "streaming"
            ? t("qr.scannerPrompt", {
                defaultValue: "Telefoningizdagi QR kodni yoki tasdiqlovchi kodni kameraga ko'rsating",
              })
            : errorMessage ||
              t("qr.cameraReadyPrompt", {
                defaultValue: "Web-kamera orqali tezkor kirish tizimi",
              })}
        </Text>

        {/* Error / Alert Message */}
        {errorMessage && status !== "streaming" && status !== "success" && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="light"
            radius="md"
            style={{ width: "100%" }}
          >
            <Text size="xs">{errorMessage}</Text>
          </Alert>
        )}

        {/* Retry / Action Controls */}
        {(status === "permission_denied" || status === "invalid_qr" || status === "error") && (
          <Button
            variant="light"
            color="blue"
            fullWidth
            leftSection={<IconRefresh size={16} />}
            onClick={startCamera}
          >
            {t("qr.retryScan", { defaultValue: "Qayta urinish" })}
          </Button>
        )}

        {status === "idle" && (
          <Button
            variant="filled"
            color="blue"
            fullWidth
            leftSection={<IconCamera size={16} />}
            onClick={startCamera}
          >
            {t("qr.turnOnCamera", { defaultValue: "Kamerani yoqish" })}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
