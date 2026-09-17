import { useState, useEffect, useRef } from "react";
import {
  Stack,
  Text,
  Center,
  Button,
  Loader,
  Group,
  Box,
  Title,
  ThemeIcon,
} from "@mantine/core";
import { QRCodeSVG } from "qrcode.react";
import { IconRefresh } from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  QrAuthService,
  type QrInitResponse,
  type QrSessionStatus,
} from "../../api/qrAuthService";
import { useAuth } from "../../auth/AuthContext";
import { showToast } from "../../utils/notificationUtils";

interface QrLoginCardProps {
  onSwitchToPassword?: () => void;
  onCancel?: () => void;
}

// Phone vector outline
function PhoneVectorIcon() {
  return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x={5} y={2} width={14} height={20} rx={3} />
      <path d="M12 18h.01" />
    </svg>
  );
}

// Confetti Celebratory Checkmark
function SuccessBadge() {
  return (
    <Box style={{ position: "relative", width: 100, height: 100, margin: "0 auto" }}>
      <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
        {/* Confetti dots */}
        <circle cx={14} cy={24} r={3} fill="#3b82f6" />
        <circle cx={86} cy={20} r={3.5} fill="#f59e0b" />
        <circle cx={10} cy={70} r={2.5} fill="#ec4899" />
        <circle cx={90} cy={72} r={3} fill="#10b981" />
        <circle cx={24} cy={90} r={3} fill="#8b5cf6" />
        <circle cx={76} cy={92} r={2.5} fill="#06b6d4" />
        <circle cx={30} cy={10} r={2.5} fill="#f97316" />
        <circle cx={70} cy={10} r={3} fill="#10b981" />

        {/* Soft background halo */}
        <circle cx={50} cy={50} r={34} fill="#dcfce7" />
        {/* Solid Green Circle */}
        <circle cx={50} cy={50} r={26} fill="#10b981" />
        {/* Checkmark */}
        <path d="M42 50L48 56L58 44" stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

export function QrLoginCard({ onSwitchToPassword: _onSwitchToPassword, onCancel }: QrLoginCardProps = {}) {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/me";

  const [session, setSession] = useState<QrInitResponse | null>(null);
  const [status, setStatus] = useState<QrSessionStatus>("PENDING");
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [loading, setLoading] = useState<boolean>(true);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

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
    if (!isMountedRef.current) return;
    setLoading(true);
    setStatus("PENDING");
    clearTimers();

    try {
      const newSession = await QrAuthService.initSession();
      if (!isMountedRef.current) return;
      setSession(newSession);
      setTimeLeft(newSession.expiresIn || 90);

      // Countdown
      countdownTimerRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          clearTimers();
          return;
        }
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearTimers();
            setStatus("EXPIRED");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Polling
      pollTimerRef.current = setInterval(async () => {
        if (!isMountedRef.current) {
          clearTimers();
          return;
        }
        try {
          const res = await QrAuthService.checkStatus(newSession.sessionId);
          if (!isMountedRef.current) return;
          if (res.status === "SCANNED") {
            setStatus("SCANNED");
          } else if (res.status === "APPROVED" && res.accessToken && res.user) {
            clearTimers();
            setStatus("APPROVED");
            const userLang = res.user.preferredLanguage;
            if (userLang) {
              i18n.changeLanguage(userLang);
            }
            login({
              accessToken: res.accessToken,
              refreshToken: res.refreshToken || "",
              user: res.user,
            });
          } else if (res.status === "EXPIRED" || res.status === "REJECTED") {
            clearTimers();
            setStatus(res.status);
          }
        } catch {
          // keep polling
        }
      }, 1500);
    } catch (err: any) {
      clearTimers();
      if (!isMountedRef.current) return;
      showToast({
        id: "qr-session-init-error",
        color: "red",
        title: t("common.error"),
        message: err?.message || "QR xizmati serverda mavjud emas",
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    startNewSession();
    return () => {
      isMountedRef.current = false;
      clearTimers();
    };
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleDone = () => {
    navigate(from, { replace: true });
  };

  // Screen 5: Muvaffaqiyatli ulandi!
  if (status === "APPROVED") {
    return (
      <Stack align="center" gap={18} py={30} style={{ textAlign: "center", width: "100%", maxWidth: 420, margin: "0 auto" }}>
        <SuccessBadge />

        <Box>
          <Title order={2} fw={800} fz={22} style={{ letterSpacing: "-0.02em" }}>
            {i18n.language === "ru"
              ? "Успешно подключено!"
              : i18n.language === "uzc"
              ? "Муваффақиятли уланди!"
              : "Muvaffaqiyatli ulandi!"}
          </Title>
          <Text c="dimmed" fz={14} mt={6} maw={340}>
            {i18n.language === "ru"
              ? "Теперь вы можете использовать свой аккаунт на этом компьютере."
              : i18n.language === "uzc"
              ? "Энди ушбу компьютерда ҳам ҳисобингиздан фойдаланишингиз мумкин."
              : "Endi ushbu kompyuterda ham hisobingizdan foydalanishingiz mumkin."}
          </Text>
        </Box>

        <Button
          fullWidth
          size="md"
          radius={14}
          color="#0284c7"
          h={48}
          mt={12}
          onClick={handleDone}
          style={{ fontWeight: 700, fontSize: 15 }}
        >
          {i18n.language === "ru" ? "Продолжить" : i18n.language === "uzc" ? "Давом этиш" : "Davom etish"}
        </Button>
      </Stack>
    );
  }

  // Screen 4: Tasdiqlash kutilmoqda
  if (status === "SCANNED") {
    return (
      <Stack align="center" gap={18} py={30} style={{ textAlign: "center", width: "100%", maxWidth: 420, margin: "0 auto" }}>
        {/* Smartphone Icon Circle */}
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: "rgba(2, 132, 199, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PhoneVectorIcon />
        </Box>

        <Box>
          <Title order={2} fw={800} fz={21} style={{ letterSpacing: "-0.02em" }}>
            {i18n.language === "ru"
              ? "Подтвердите на телефоне"
              : i18n.language === "uzc"
              ? "Мобил иловада тасдиқлашни кутинг"
              : "Mobil ilovada tasdiqlashni kuting"}
          </Title>
          <Text c="dimmed" fz={13.5} mt={6} maw={320}>
            {i18n.language === "ru"
              ? "Запрос отправлен на ваш телефон. Пожалуйста, подтвердите вход в мобильном приложении."
              : i18n.language === "uzc"
              ? "Сўров мобил иловангизга юборилди. Илтимос, мобил иловада тасдиқланг."
              : "So'rov mobil ilovangizga yuborildi. Iltimos, mobil ilovada tasdiqlang."}
          </Text>
        </Box>

        {/* Pulsing Spinner & Status */}
        <Group gap={10} mt={10}>
          <Loader size="sm" color="#0284c7" />
          <Text fz={14} fw={600} c="#0284c7">
            {i18n.language === "ru" ? "Ожидание..." : i18n.language === "uzc" ? "Кутилмоқда..." : "Kutilmoqda..."}
          </Text>
        </Group>

        {/* Cancel Button */}
        <Button
          variant="default"
          radius={14}
          h={44}
          fullWidth
          mt={14}
          onClick={() => {
            clearTimers();
            if (onCancel) onCancel();
            else startNewSession();
          }}
          style={{ borderColor: "var(--border, #e2e8f0)", fontWeight: 600 }}
        >
          {i18n.language === "ru" ? "Отмена" : i18n.language === "uzc" ? "Бекор қилиш" : "Bekor qilish"}
        </Button>
      </Stack>
    );
  }

  // Screen 3: QR kod ko'rsatish (Pending)
  return (
    <Stack align="center" gap={14} py={10} style={{ textAlign: "center", width: "100%", maxWidth: 420, margin: "0 auto" }}>
      <Box>
        <Title order={2} fw={800} fz={22} style={{ letterSpacing: "-0.02em" }}>
          {i18n.language === "ru"
            ? "Войти через приложение"
            : i18n.language === "uzc"
            ? "Мобил илова орқали киринг"
            : "Mobil ilova orqali kiring"}
        </Title>
        <Text c="dimmed" fz={13} mt={4} maw={340}>
          {i18n.language === "ru"
            ? "Отсканируйте QR-код через камеру приложения PRAVA ONLINE"
            : i18n.language === "uzc"
            ? "Ҳисобингизни мобил илова билан боғлаш учун QR кодни сканер қилинг"
            : "Hisobingizni mobil ilova bilan bog'lash uchun QR kodni skaner qiling"}
        </Text>
      </Box>

      {/* QR Code Canvas */}
      <Box
        style={{
          position: "relative",
          padding: "16px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(10, 37, 64, 0.08)",
          border: "2px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Center w={210} h={210}>
            <Loader size="md" color="#0284c7" />
          </Center>
        ) : session && status !== "EXPIRED" ? (
          <>
            <QRCodeSVG value={session.qrPayload} size={210} level="M" />
            {/* Animated Radar Scanning Line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, transparent, #0284c7, transparent)",
                boxShadow: "0 0 10px #0284c7",
                animation: "qrRadar 2.5s infinite ease-in-out",
              }}
            />
            <style>
              {`
                @keyframes qrRadar {
                  0% { top: 12px; opacity: 0.2; }
                  50% { top: calc(100% - 16px); opacity: 1; }
                  100% { top: 12px; opacity: 0.2; }
                }
              `}
            </style>
          </>
        ) : (
          <Center w={210} h={210}>
            <Stack align="center" gap={8}>
              <Text fz={13} c="dimmed">
                {i18n.language === "ru" ? "Срок действия истек" : i18n.language === "uzc" ? "Муддати тугади" : "Muddati tugadi"}
              </Text>
              <Button size="xs" radius="md" color="#0284c7" onClick={startNewSession}>
                {i18n.language === "ru" ? "Обновить" : i18n.language === "uzc" ? "Янгилаш" : "Yangilash"}
              </Button>
            </Stack>
          </Center>
        )}
      </Box>

      {/* Timer & Refresh Row */}
      {status !== "EXPIRED" && !loading && (
        <Group gap={8} justify="center" mt={4}>
          <Text fz={13.5} fw={600} c="dimmed">
            ⏱ {formatTimer(timeLeft)}
          </Text>
          <ThemeIcon
            size={26}
            radius="xl"
            variant="light"
            color="gray"
            style={{ cursor: "pointer" }}
            onClick={startNewSession}
          >
            <IconRefresh size={14} />
          </ThemeIcon>
        </Group>
      )}

      {/* Yoki kodni ko'rsatish */}
      {session && (
        <Button
          variant="subtle"
          color="blue"
          size="compact-sm"
          mt={2}
          onClick={() => {
            navigator.clipboard?.writeText(session.qrPayload);
            showToast({
              id: "qr-copy-toast",
              title: "Nusxalandi",
              message: "Ulanish havolasi xotiraga nusxalandi",
              color: "teal",
            });
          }}
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          {i18n.language === "ru"
            ? "Или скопировать ссылку"
            : i18n.language === "uzc"
            ? "Ёки кодни кўрсатиш"
            : "Yoki kodni ko'rsatish"}
        </Button>
      )}
    </Stack>
  );
}

export default QrLoginCard;
