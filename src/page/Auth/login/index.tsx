import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Link, useNavigate, useLocation, useSearchParams, Navigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import { useAuth } from "../../../auth/AuthContext";
import api from "../../../api/api";
import { showToast } from "../../../utils/notificationUtils";
import { useTranslation } from "react-i18next";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBrandTelegram,
  IconDeviceMobile,
  IconLock,
  IconMail,
  IconQrcode,
  IconUser,
} from "@tabler/icons-react";
import GoogleLoginButton from "../../../components/auth/GoogleLoginButton";
import TelegramLoginButton from "../../../components/auth/TelegramLoginButton";
import SEO from "../../../components/common/SEO";
import { getErrorMessage } from "../../../types/errors";
import { useCapsLock } from "../../../hooks/useCapsLock";
import CapsLockWarning from "../../../components/auth/CapsLockWarning";
import AuthSecurityBadge from "../../../components/auth/AuthSecurityBadge";
import { normalizeUzPhone } from "../../../utils/phoneUtils";
import QrLoginCard from "../../../components/auth/QrLoginCard";

const Login_Page = () => {
  const { t, i18n } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "qr" | "telegram">(
    currentTab === "qr" ? "qr" : currentTab === "telegram" ? "telegram" : "password"
  );
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return localStorage.getItem("prava_remember_me") !== "false";
    } catch {
      return true;
    }
  });
  const isCapsLock = useCapsLock();
  const lang = i18n.language;

  useEffect(() => {
    if (currentTab === "qr") {
      setLoginMethod("qr");
    } else if (currentTab === "telegram") {
      setLoginMethod("telegram");
    } else if (!currentTab) {
      setLoginMethod("password");
    }
  }, [currentTab]);

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/me";

  const form = useForm({
    initialValues: {
      // The full phone/email is never persisted (shared PCs) — see src/auth/accountManager.ts.
      identifier: "",
      password: "",
    },
    validate: {
      identifier: (value) =>
        value.trim().length < 3
          ? t("validation.minChars", { count: 3 })
          : null,
      password: (value) =>
        value.length < 6 ? t("validation.minChars", { count: 6 }) : null,
    },
  });

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (values: typeof form.values) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    let cleanIdentifier = values.identifier.trim();
    const digitsOnly = cleanIdentifier.replace(/\D/g, "");
    if (digitsOnly.length >= 9 && !cleanIdentifier.includes("@")) {
      cleanIdentifier = normalizeUzPhone(cleanIdentifier);
    }

    try {
      const response = await api.post("/api/v1/auth/login", {
        identifier: cleanIdentifier,
        password: values.password,
      });

      if (response.data.success) {
        const userLang = response.data.data.user?.preferredLanguage;
        if (userLang) {
          i18n.changeLanguage(userLang);
        }

        try {
          localStorage.setItem("prava_remember_me", rememberMe ? "true" : "false");
        } catch {
          // ignore
        }

        login({ ...response.data.data, rememberMe });
        navigate(from, { replace: true });

        showToast({
          id: "auth-login-success",
          dedupeKey: "auth-login-success",
          title: t("auth.not_title", { defaultValue: "Tizimga kirish" }),
          message: t("auth.not_massage", { defaultValue: "Xush kelibsiz!" }),
          color: "teal",
          withBorder: true,
        });
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t("auth.loginError", { defaultValue: "Login yoki parol xato!" }));
      setErrorMessage(msg);
      showToast({
        id: "auth-login-error",
        dedupeKey: "auth-login-error",
        color: "red",
        title: t("auth.errorTitle", { defaultValue: "Xatolik" }),
        message: msg,
        withBorder: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const getIdentifierIcon = () => {
    const val = form.values.identifier.trim();
    if (val.includes("@")) return <IconMail size={18} color="#0284c7" />;
    if (/^\+?\d+$/.test(val)) return <IconDeviceMobile size={18} color="#0284c7" />;
    return <IconUser size={18} color="#64748b" />;
  };

  return (
    <Box style={{ width: "100%", maxWidth: 440, margin: "0 auto" }}>
      <SEO
        title="Kirish - Prava Online platformasiga kirish"
        description="Prava Online platformasiga kiring va haydovchilik guvohnomasi imtihoniga tayyorlanishni davom eting. Google yoki Telegram orqali tez kirish."
        keywords="prava online kirish, login, haydovchilik guvohnomasi, вход prava online"
        canonical="/auth/login"
      />

      {/* Header section */}
      <Stack gap={6} align="center" mb={20} ta="center">
        <Title
          order={2}
          size="1.5rem"
          fw={800}
          style={{ letterSpacing: "-0.02em", color: "var(--text)" }}
        >
          {loginMethod === "qr"
            ? lang === "ru"
              ? "Вход по QR-коду"
              : lang === "uzc"
              ? "QR-код орқали кириш"
              : "QR-kod orqali kirish"
            : loginMethod === "telegram"
            ? lang === "ru"
              ? "Вход через Telegram"
              : lang === "uzc"
              ? "Telegram орқали кириш"
              : "Telegram orqali kirish"
            : t("auth.welcome", { defaultValue: "Xush kelibsiz!" })}
        </Title>

        <Text size="sm" c="dimmed" maw={360}>
          {loginMethod === "qr"
            ? lang === "ru"
              ? "Отсканируйте код через мобильное приложение Prava"
              : lang === "uzc"
              ? "Prava мобил иловаси орқали кодни сканерланг"
              : "Prava mobil ilovasi orqali kodni skanerlang"
            : loginMethod === "telegram"
            ? lang === "ru"
              ? "Официальный бот @pravaonlineuzbot поможет войти в один клик"
              : lang === "uzc"
              ? "Расмий @pravaonlineuzbot ботимиз орқали бир босишда киринг"
              : "Rasmiy @pravaonlineuzbot botimiz orqali bir bosishda kiring"
            : t("auth.loginSubtitle", {
                defaultValue: "Platformaga kirish uchun profilingiz ma'lumotlarini kiriting",
              })}
        </Text>
      </Stack>

      {/* Switch between views */}
      {loginMethod === "telegram" || currentTab === "telegram" ? (
        <Stack align="center" gap={16} py={8}>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => setLoginMethod("password")}
            style={{ alignSelf: "flex-start" }}
          >
            {lang === "ru" ? "Назад" : lang === "uzc" ? "Киришга қайтиш" : "Kirishga qaytish"}
          </Button>

          <Box w="100%" mt={4}>
            <TelegramLoginButton mode="login" />
          </Box>
        </Stack>
      ) : loginMethod === "qr" || currentTab === "qr" ? (
        <QrLoginCard
          onSwitchToPassword={() => setLoginMethod("password")}
          onCancel={() => setLoginMethod("password")}
        />
      ) : (
        /* Password Login Form */
        <Box>
          {errorMessage && (
            <Alert
              icon={<IconAlertCircle size={18} />}
              color="red"
              variant="light"
              radius="md"
              mb="md"
              withCloseButton
              onClose={() => setErrorMessage(null)}
              role="alert"
            >
              {errorMessage}
            </Alert>
          )}

          <form
            onSubmit={form.onSubmit(handleSubmit)}
            onChange={() => errorMessage && setErrorMessage(null)}
            noValidate
          >
            <Stack gap={14}>
              <TextInput
                label={t("auth.identifier", { defaultValue: "Email yoki Telefon raqam" })}
                placeholder={t("auth.identifierPlaceholder", {
                  defaultValue: "+998 90 123 45 67 yoki email@example.com",
                })}
                required
                size="sm"
                radius="md"
                autoComplete="username"
                leftSection={getIdentifierIcon()}
                styles={{
                  input: { height: 46, fontSize: "14.5px" },
                  label: { fontSize: "13px", fontWeight: 600, marginBottom: 4 },
                }}
                aria-required="true"
                aria-invalid={!!form.errors.identifier}
                {...form.getInputProps("identifier")}
              />

              <Box>
                <PasswordInput
                  label={t("auth.password", { defaultValue: "Parol" })}
                  placeholder={t("auth.passwordPlaceholder", { defaultValue: "Parolingizni kiriting" })}
                  required
                  size="sm"
                  radius="md"
                  autoComplete="current-password"
                  leftSection={<IconLock size={18} color="#64748b" />}
                  styles={{
                    input: { height: 46, fontSize: "14.5px" },
                    label: { fontSize: "13px", fontWeight: 600, marginBottom: 4 },
                  }}
                  aria-required="true"
                  aria-invalid={!!form.errors.password}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  {...form.getInputProps("password")}
                />
                <CapsLockWarning active={isCapsLock && passwordFocused} />
              </Box>

              <Group justify="space-between" mt={-2}>
                <Checkbox
                  label={t("auth.rememberMe", { defaultValue: "Eslab qolish" })}
                  size="xs"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.currentTarget.checked)}
                />
                <Anchor
                  component={Link}
                  to="/auth/forgot-password"
                  size="xs"
                  c="blue"
                  fw={600}
                >
                  {t("auth.forgotPassword", { defaultValue: "Parolni unutdingizmi?" })}
                </Anchor>
              </Group>

              <Button
                size="md"
                fullWidth
                radius="md"
                type="submit"
                loading={loading}
                h={48}
                color="blue"
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  boxShadow: "0 4px 14px rgba(2, 132, 199, 0.25)",
                  transition: "all 0.16s ease",
                }}
              >
                {t("auth.login", { defaultValue: "Tizimga kirish" })} →
              </Button>

              <Divider
                label={t("auth.orContinueWith", { defaultValue: "yoki" })}
                labelPosition="center"
                my={4}
              />

              <Stack gap={8}>
                <GoogleLoginButton mode="login" />

                <Button
                  variant="default"
                  fullWidth
                  radius="md"
                  h={46}
                  leftSection={<IconBrandTelegram size={19} color="#0088CC" />}
                  onClick={() => setLoginMethod("telegram")}
                  styles={{
                    inner: { justifyContent: "center" },
                    label: { fontWeight: 600, fontSize: "14px" },
                  }}
                >
                  {lang === "ru"
                    ? "Войти через Telegram"
                    : lang === "uzc"
                    ? "Telegram орқали кириш"
                    : "Telegram orqali kirish"}
                </Button>

                <Button
                  variant="default"
                  fullWidth
                  radius="md"
                  h={46}
                  leftSection={<IconQrcode size={19} color="#0284c7" />}
                  onClick={() => setLoginMethod("qr")}
                  styles={{
                    inner: { justifyContent: "center" },
                    label: { fontWeight: 600, fontSize: "14px" },
                  }}
                >
                  {lang === "ru"
                    ? "Войти по QR-коду"
                    : lang === "uzc"
                    ? "QR-код орқали кириш"
                    : "QR-kod orqali kirish"}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Box>
      )}

      {/* Footer Nav */}
      <Group justify="center" gap={6} mt={20}>
        <Text size="xs" c="dimmed">
          {t("auth.noAccount", { defaultValue: "Akkauntingiz yo'qmi?" })}
        </Text>
        <Anchor component={Link} to="/auth/register" size="xs" fw={700} c="blue">
          {t("auth.register", { defaultValue: "Ro'yxatdan o'tish" })}
        </Anchor>
      </Group>

      <Box mt={14}>
        <AuthSecurityBadge compact />
      </Box>
    </Box>
  );
};

export default Login_Page;
