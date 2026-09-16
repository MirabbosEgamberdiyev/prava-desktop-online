import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  PasswordInput,
  Title,
  Alert,
} from "@mantine/core";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconDeviceLaptop,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconLock,
  IconUser,
} from "@tabler/icons-react";
import api from "../../../api/api";
import { useAuth } from "../../../auth/AuthContext";
import { showToast } from "../../../utils/notificationUtils";
import { normalizeUzPhone } from "../../../utils/phoneUtils";
import GoogleLoginButton from "../../../components/auth/GoogleLoginButton";

interface SessionInfo {
  sessionId: string;
  deviceName?: string;
  clientType?: string;
  clientVersion?: string;
  status?: string;
  isExpired?: boolean;
}

export default function QrPairingPage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get("sessionId") || "";
  const challenge = searchParams.get("challenge") || "";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states if not authenticated
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !challenge) {
      setError(
        i18n.language === "ru"
          ? "Неверная ссылка для подключения (отсутствует sessionId или challenge)"
          : i18n.language === "uzc"
          ? "Уланиш ҳаволаси нотўғри (sessionId ёки challenge мавжуд эмас)"
          : "Ulanish havolasi noto'g'ri (sessionId yoki challenge mavjud emas)"
      );
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/api/v1/auth/qr/session-info", {
          params: { sessionId, challenge },
        });
        if (res.data?.success && res.data?.data) {
          setSessionInfo(res.data.data);
        } else {
          setError(
            i18n.language === "ru"
              ? "Сессия не найдена или срок ее действия истек"
              : i18n.language === "uzc"
              ? "Сайт сессияси топилмади ёки муддати тугаган"
              : "Sessiya topilmadi yoki muddati o'tgan"
          );
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            (i18n.language === "ru"
              ? "Сессия недействительна или истекла"
              : i18n.language === "uzc"
              ? "Сайт сессияси нотўғри ёки муддати тугаган"
              : "QR sessiya muddati o'tgan yoki yaroqsiz")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, challenge, i18n.language]);

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/v1/auth/qr/approve", {
        sessionId,
        challenge,
      });

      if (res.data?.success) {
        setSuccess(true);
        showToast({
          id: "qr-paired-success",
          title: i18n.language === "ru" ? "Успешно" : i18n.language === "uzc" ? "Муваффақиятли" : "Muvaffaqiyatli",
          message:
            i18n.language === "ru"
              ? "Компьютер успешно подключен!"
              : i18n.language === "uzc"
              ? "Компьютер муваффақиятли уланди!"
              : "Kompyuter muvaffaqiyatli ulandi!",
          color: "teal",
        });
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (i18n.language === "ru"
            ? "Ошибка подтверждения подключения"
            : i18n.language === "uzc"
            ? "Уланишни тасдиқлашда хатолик юз берди"
            : "Ulanishni tasdiqlashda xatolik yuz berdi")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await api.post("/api/v1/auth/qr/reject", { sessionId, challenge });
    } catch {
      // ignore
    }
    navigate("/me", { replace: true });
  };

  const handleLoginAndApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setAuthError(
        i18n.language === "ru"
          ? "Заполните логин и пароль"
          : i18n.language === "uzc"
          ? "Логин ва паролни киритинг"
          : "Login va parolni kiriting"
      );
      return;
    }

    setActionLoading(true);
    setAuthError(null);

    let cleanId = identifier.trim();
    const digitsOnly = cleanId.replace(/\D/g, "");
    if (digitsOnly.length >= 9 && !cleanId.includes("@")) {
      cleanId = normalizeUzPhone(cleanId);
    }

    try {
      const loginRes = await api.post("/api/v1/auth/login", {
        identifier: cleanId,
        password,
      });

      if (loginRes.data?.success) {
        login(loginRes.data.data);

        // Approve after successful login
        const approveRes = await api.post(
          "/api/v1/auth/qr/approve",
          { sessionId, challenge },
          { headers: { Authorization: `Bearer ${loginRes.data.data.accessToken}` } }
        );

        if (approveRes.data?.success) {
          setSuccess(true);
        }
      }
    } catch (err: any) {
      setAuthError(
        err?.response?.data?.message ||
          (i18n.language === "ru"
            ? "Неверный логин или пароль"
            : i18n.language === "uzc"
            ? "Нотўғри логин ёки парол"
            : "Noto'g'ri login yoki parol")
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size={440} py={60}>
        <Card withBorder radius={20} p={32} style={{ textAlign: "center" }}>
          <Stack align="center" gap={16}>
            <Loader size="md" color="#0284c7" />
            <Text fz={14} c="dimmed">
              {i18n.language === "ru"
                ? "Загрузка данных сессии..."
                : i18n.language === "uzc"
                ? "Уланиш маълумотлари юкланмоқда..."
                : "Ulanish ma'lumotlari yuklanmoqda..."}
            </Text>
          </Stack>
        </Card>
      </Container>
    );
  }

  if (success) {
    return (
      <Container size={440} py={60}>
        <Card
          withBorder
          radius={24}
          p={36}
          style={{
            textAlign: "center",
            boxShadow: "0 12px 36px rgba(10, 37, 64, 0.08)",
          }}
        >
          <Stack align="center" gap={18}>
            <Box
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                backgroundColor: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconCheck size={38} color="#16a34a" />
            </Box>

            <Title order={2} fw={800} fz={22}>
              {i18n.language === "ru"
                ? "Компьютер успешно подключен!"
                : i18n.language === "uzc"
                ? "Компьютер муваффақиятли уланди!"
                : "Kompyuter muvaffaqiyatli ulandi!"}
            </Title>

            <Text c="dimmed" fz={14} maw={340}>
              {i18n.language === "ru"
                ? "Теперь вы вошли в систему на компьютере."
                : i18n.language === "uzc"
                ? "Энди сиз компьютерда тизимга кирдингиз."
                : "Endi siz kompyuterda tizimga kirdingiz."}
            </Text>

            <Button
              fullWidth
              size="md"
              radius={14}
              color="#0284c7"
              h={46}
              onClick={() => navigate("/me", { replace: true })}
            >
              {i18n.language === "ru" ? "Перейти в профиль" : i18n.language === "uzc" ? "Профилга ўтиш" : "Profilga o'tish"}
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  if (error && !sessionInfo) {
    return (
      <Container size={440} py={60}>
        <Card withBorder radius={24} p={32} style={{ textAlign: "center" }}>
          <Stack align="center" gap={16}>
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconAlertCircle size={32} color="#dc2626" />
            </Box>

            <Title order={3} fw={700} fz={20}>
              {i18n.language === "ru" ? "Ошибка подключения" : i18n.language === "uzc" ? "Уланишда хатолик" : "Ulanishda xatolik"}
            </Title>

            <Text c="dimmed" fz={13.5}>
              {error}
            </Text>

            <Button
              variant="default"
              radius={12}
              onClick={() => navigate("/auth/login")}
            >
              {i18n.language === "ru" ? "На главную" : i18n.language === "uzc" ? "Кириш саҳифасига қайтиш" : "Kirish sahifasiga qaytish"}
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size={460} py={40}>
      <Card
        withBorder
        shadow="md"
        radius={24}
        p={32}
        style={{
          backgroundColor: "var(--card-bg, #ffffff)",
          boxShadow: "0 12px 36px rgba(10, 37, 64, 0.08)",
        }}
      >
        <Stack align="center" gap={18} style={{ textAlign: "center" }}>
          {/* Laptop Icon Header */}
          <Box
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: "rgba(2, 132, 199, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconDeviceLaptop size={40} color="#0284c7" />
          </Box>

          <Box>
            <Title order={2} fw={800} fz={22}>
              {i18n.language === "ru"
                ? "Запрос на подключение"
                : i18n.language === "uzc"
                ? "Янги қурилма уланиш сўрови"
                : "Yangi qurilma ulanish so'rovi"}
            </Title>
            <Text c="dimmed" fz={13.5} mt={4}>
              {isAuthenticated
                ? i18n.language === "ru"
                  ? "Устройство запрашивает доступ к вашему аккаунту. Подтвердить?"
                  : i18n.language === "uzc"
                  ? "Қурилма сизнинг ҳисобингизга уланишни сўрамоқда. Тасдиқлайсизми?"
                  : "Qurilma sizning hisobingizga ulanishni so'ramoqda. Tasdiqlaysizmi?"
                : i18n.language === "ru"
                ? "Войдите в аккаунт для подтверждения подключения компьютера."
                : i18n.language === "uzc"
                ? "Компьютерни улаш учун ҳисобингизга киринг."
                : "Kompyuterni ulash uchun hisobingizga kiring."}
            </Text>
          </Box>

          {/* Device Details Card */}
          <Card
            withBorder
            p={18}
            radius={16}
            style={{
              width: "100%",
              backgroundColor: "var(--surface, #f8fafc)",
              textAlign: "left",
            }}
          >
            <Stack gap={10}>
              <Group justify="space-between">
                <Text fz={13} c="dimmed" fw={600}>
                  💻 {i18n.language === "ru" ? "Устройство:" : i18n.language === "uzc" ? "Қурилма:" : "Qurilma:"}
                </Text>
                <Text fz={13.5} fw={700}>
                  {sessionInfo?.deviceName || "PRAVA Desktop (Windows)"}
                </Text>
              </Group>

              <Group justify="space-between">
                <Text fz={13} c="dimmed" fw={600}>
                  📍 {i18n.language === "ru" ? "Город:" : i18n.language === "uzc" ? "Манзил:" : "Manzil:"}
                </Text>
                <Text fz={13.5} fw={700}>
                  Toshkent, O'zbekiston
                </Text>
              </Group>

              <Group justify="space-between">
                <Text fz={13} c="dimmed" fw={600}>
                  🕒 {i18n.language === "ru" ? "Время:" : i18n.language === "uzc" ? "Вақт:" : "Vaqt:"}
                </Text>
                <Text fz={13.5} fw={700}>
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Group>
            </Stack>
          </Card>

          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              radius="md"
              style={{ width: "100%", textAlign: "left" }}
            >
              {error}
            </Alert>
          )}

          {/* If Authenticated: Approve & Reject Buttons */}
          {isAuthenticated ? (
            <Group gap={12} style={{ width: "100%" }} mt={8}>
              <Button
                flex={1}
                variant="outline"
                color="red"
                radius={14}
                h={48}
                onClick={handleReject}
                disabled={actionLoading}
                leftSection={<IconX size={18} />}
                style={{ fontWeight: 700 }}
              >
                {i18n.language === "ru" ? "Отклонить" : i18n.language === "uzc" ? "Рад этиш" : "Rad etish"}
              </Button>

              <Button
                flex={1}
                color="#0284c7"
                radius={14}
                h={48}
                onClick={handleApprove}
                loading={actionLoading}
                leftSection={<IconCheck size={18} />}
                style={{ fontWeight: 700 }}
              >
                {i18n.language === "ru" ? "Подтвердить" : i18n.language === "uzc" ? "Тасдиқлаш" : "Tasdiqlash"}
              </Button>
            </Group>
          ) : (
            /* If Not Authenticated: Quick Login Form */
            <Box
              component="form"
              onSubmit={handleLoginAndApprove}
              style={{ width: "100%", textAlign: "left" }}
            >
              <Stack gap={12}>
                {authError && (
                  <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">
                    {authError}
                  </Alert>
                )}

                <TextInput
                  label={t("auth.identifier", { defaultValue: "Telefon yoki Email" })}
                  placeholder="90 123 45 67 / name@example.com"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.currentTarget.value)}
                  leftSection={<IconUser size={16} />}
                  radius="md"
                />

                <PasswordInput
                  label={t("auth.password", { defaultValue: "Parol" })}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  leftSection={<IconLock size={16} />}
                  radius="md"
                />

                <Button
                  type="submit"
                  fullWidth
                  color="#0284c7"
                  radius={14}
                  h={46}
                  loading={actionLoading}
                  mt={4}
                  style={{ fontWeight: 700 }}
                >
                  {i18n.language === "ru"
                    ? "Войти и подтвердить"
                    : i18n.language === "uzc"
                    ? "Кириш ва тасдиқлаш"
                    : "Kirish va tasdiqlash"}
                </Button>

                <GoogleLoginButton compact />

                <Button
                  variant="subtle"
                  color="gray"
                  fullWidth
                  radius={12}
                  onClick={() => navigate("/auth/login")}
                >
                  {i18n.language === "ru" ? "Отмена" : i18n.language === "uzc" ? "Бекор қилиш" : "Bekor qilish"}
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </Card>
    </Container>
  );
}
