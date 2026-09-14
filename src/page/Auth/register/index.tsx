import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Flex,
  Group,
  Image,
  Paper,
  PasswordInput,
  PinInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import api from "../../../api/api";
import { useAuth } from "../../../auth/AuthContext";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconDeviceMobile,
  IconExternalLink,
  IconLock,
  IconMail,
  IconMailShare,
  IconMessageShare,
  IconUser,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import GoogleLoginButton from "../../../components/auth/GoogleLoginButton";
import TelegramLoginButton from "../../../components/auth/TelegramLoginButton";
import SEO from "../../../components/common/SEO";
import { getErrorMessage } from "../../../types/errors";
import { useCapsLock } from "../../../hooks/useCapsLock";
import CapsLockWarning from "../../../components/auth/CapsLockWarning";
import AuthSecurityBadge from "../../../components/auth/AuthSecurityBadge";
import PasswordStrengthMeter, {
  checkPasswordRules,
} from "../../../components/auth/PasswordStrengthMeter";
import {
  formatUzPhone,
  isValidUzPhone,
  normalizeUzPhone,
} from "../../../utils/phoneUtils";

const Register_Page = () => {
  const { register: authRegister, isAuthenticated } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [verificationType, setVerificationType] = useState<"EMAIL" | "SMS">("EMAIL");
  const isCapsLock = useCapsLock();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Countdown timer for OTP resend
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step === 2 && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, countdown]);

  const form = useForm({
    initialValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      password: "",
      verificationType: "EMAIL",
      preferredLanguage: "uzl",
    },

    validate: {
      firstName: (value) =>
        value.trim().length < 2 ? t("validation.nameTooShort") : null,
      lastName: (value) =>
        value.trim().length < 2 ? t("validation.nameTooShort") : null,
      email: (value, values) => {
        if (values.verificationType === "SMS") return null;
        if (!value || value.trim().length === 0)
          return t("validation.invalidEmail");
        return /^\S+@\S+\.\S+$/.test(value.trim())
          ? null
          : t("validation.invalidEmail");
      },
      phoneNumber: (value, values) => {
        if (values.verificationType === "EMAIL") return null;
        if (!value || value.trim().length === 0)
          return t("validation.invalidPhone");
        return isValidUzPhone(value) ? null : t("validation.phoneLength");
      },
      password: (value) => {
        const rules = checkPasswordRules(value);
        if (!rules.allValid) {
          return t("validation.passwordComplexity");
        }
        return null;
      },
    },
  });

  // Agar foydalanuvchi allaqachon tizimga kirgan bo'lsa — /me ga redirect
  if (isAuthenticated) {
    return <Navigate to="/me" replace />;
  }

  // Step 1: Init registration — send form data + get OTP
  const handleInit = async (values: typeof form.values) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const isEmail = values.verificationType === "EMAIL";
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        password: values.password,
        verificationType: values.verificationType,
        preferredLanguage: i18n.language || "uzl",
        email: isEmail ? values.email.trim() : null,
        phoneNumber: !isEmail ? normalizeUzPhone(values.phoneNumber) : null,
      };

      await api.post("/api/v1/auth/register/init", payload);
      setStep(2);
      setCountdown(60);
      setCode("");
    } catch (error: unknown) {
      const msg = getErrorMessage(error, t("register.errorMessage"));
      setErrorMessage(msg);
      notifications.show({
        title: t("register.errorTitle"),
        message: msg,
        color: "red",
        withBorder: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendCode = async () => {
    if (countdown > 0) return;
    setResending(true);
    setErrorMessage(null);
    try {
      const isEmail = form.values.verificationType === "EMAIL";
      const payload = {
        firstName: form.values.firstName.trim(),
        lastName: form.values.lastName.trim(),
        password: form.values.password,
        verificationType: form.values.verificationType,
        preferredLanguage: i18n.language || "uzl",
        email: isEmail ? form.values.email.trim() : null,
        phoneNumber: !isEmail ? normalizeUzPhone(form.values.phoneNumber) : null,
      };

      await api.post("/api/v1/auth/register/init", payload);
      setCountdown(60);
      notifications.show({
        title: t("common.success"),
        message: t("register.otpSentTo"),
        color: "teal",
        withBorder: true,
      });
    } catch (error: unknown) {
      const msg = getErrorMessage(error, t("register.errorMessage"));
      setErrorMessage(msg);
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP and complete registration
  const handleComplete = async () => {
    if (code.length < 6) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const isEmail = form.values.verificationType === "EMAIL";
      const payload = {
        firstName: form.values.firstName.trim(),
        lastName: form.values.lastName.trim(),
        password: form.values.password,
        verificationType: form.values.verificationType,
        preferredLanguage: i18n.language || "uzl",
        email: isEmail ? form.values.email.trim() : null,
        phoneNumber: !isEmail ? normalizeUzPhone(form.values.phoneNumber) : null,
      };

      const res = await api.post(
        `/api/v1/auth/register/complete?code=${code.trim()}`,
        payload
      );

      if (res.data) {
        authRegister(res.data.data);
        notifications.show({
          title: t("register.successTitle"),
          message: t("register.successMessage"),
          color: "teal",
          withBorder: true,
        });
        navigate("/me");
      }
    } catch (error: unknown) {
      const msg = getErrorMessage(error, t("register.codeError"));
      setErrorMessage(msg);
      notifications.show({
        title: t("register.errorTitle"),
        message: msg,
        color: "red",
        withBorder: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const getInboxLink = (email: string) => {
    if (!email || !email.includes("@")) return "#";
    const domain = email.split("@")[1].toLowerCase();

    if (domain === "gmail.com") return "https://mail.google.com";
    if (domain === "mail.ru" || domain === "inbox.ru" || domain === "bk.ru")
      return "https://e.mail.ru/inbox";
    if (domain === "outlook.com" || domain === "hotmail.com")
      return "https://outlook.live.com/mail/0/inbox";
    if (domain === "yandex.ru" || domain === "yandex.com" || domain === "ya.ru")
      return "https://mail.yandex.ru";

    return `https://${domain}`;
  };

  const handleVerificationTypeChange = (value: string) => {
    const type = value as "EMAIL" | "SMS";
    setVerificationType(type);
    form.setFieldValue("verificationType", type);

    if (type === "SMS" && !form.values.phoneNumber) {
      form.setFieldValue("phoneNumber", "+998 ");
    }

    form.clearFieldError("email");
    form.clearFieldError("phoneNumber");
    setErrorMessage(null);
  };

  const isEmailMode = verificationType === "EMAIL";

  return (
    <Box className="auth-page-container">
      <Container size={480} maw={480} p={{ base: "xs", sm: 0 }} className="auth-page-inner">
        <SEO
          title="Ro'yxatdan o'tish - Bepul boshlang"
          description="Prava Online platformasida bepul ro'yxatdan o'ting va haydovchilik guvohnomasi imtihoniga tayyorlanishni boshlang. 1200+ savol bazasi, real imtihon formati. Email yoki telefon orqali ro'yxatdan o'ting."
          keywords="prava online ro'yxat, haydovchilik imtihoni, bepul tayyorlanish, prava online registratsiya, регистрация prava online, YHXBB ro'yxat"
          canonical="/auth/register"
        />

        {/* Header section with brand mark */}
        <Stack gap={4} align="center" mb={{ base: 10, sm: 14 }}>
          <Center
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-sm, 10px)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--card-shadow-sm)",
            }}
          >
            <Image
              src="/favicon.svg"
              fallbackSrc="/logo.svg"
              alt="Prava Online Logo"
              w={22}
              h={22}
              fit="contain"
            />
          </Center>

          <Title order={2} ta="center" size="1.35rem" fw={800} style={{ letterSpacing: "-0.02em", lineHeight: 1.25 }}>
            {step === 1 ? t("register.title") : t("register.otpTitle")}
          </Title>

          <Text size="xs" c="dimmed" ta="center" maw={380} style={{ lineHeight: 1.4 }}>
            {step === 1
              ? t("register.registerSubtitle")
              : t("register.enterCodeSubtitle")}
          </Text>

          {step === 1 && (
            <Group gap={6} justify="center">
              <Text size="xs" c="dimmed">
                {t("register.alreadyHaveAccount")}
              </Text>
              <Anchor component={Link} to="/auth/login" size="xs" fw={700} c="brand">
                {t("register.login")}
              </Anchor>
            </Group>
          )}
        </Stack>

        <Paper
          withBorder
          shadow="sm"
          p={{ base: 18, sm: 24 }}
          radius="lg"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--card-shadow-md)",
          }}
        >
          {errorMessage && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              radius="md"
              mb="md"
              withCloseButton
              onClose={() => setErrorMessage(null)}
            >
              {errorMessage}
            </Alert>
          )}

          {step === 1 ? (
            <form
              onSubmit={form.onSubmit(handleInit)}
              onChange={() => errorMessage && setErrorMessage(null)}
              aria-label={t("register.title")}
            >
              <Stack gap="sm">
                {/* Names row - 1 col on mobile, 2 cols on tablet+ */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <TextInput
                    label={t("register.firstName")}
                    placeholder="Ali"
                    required
                    size="md"
                    radius="md"
                    leftSection={<IconUser size={18} />}
                    styles={{
                      input: {
                        height: 46,
                        fontSize: "14px",
                        backgroundColor: "var(--bg-input, var(--surface))",
                        borderColor: "var(--border)",
                      },
                      label: {
                        fontWeight: 600,
                        fontSize: "12px",
                        marginBottom: 4,
                      },
                    }}
                    {...form.getInputProps("firstName")}
                  />
                  <TextInput
                    label={t("register.lastName")}
                    placeholder="Valiyev"
                    required
                    size="md"
                    radius="md"
                    styles={{
                      input: {
                        height: 46,
                        fontSize: "14px",
                        backgroundColor: "var(--bg-input, var(--surface))",
                        borderColor: "var(--border)",
                      },
                      label: {
                        fontWeight: 600,
                        fontSize: "12px",
                        marginBottom: 4,
                      },
                    }}
                    {...form.getInputProps("lastName")}
                  />
                </SimpleGrid>

                {/* Verification channel switcher */}
                <Box>
                  <Text size="xs" fw={600} mb={4} c="dimmed">
                    {t("register.verificationChannel", "Tasdiqlash usuli")}
                  </Text>
                  <SegmentedControl
                    value={verificationType}
                    onChange={handleVerificationTypeChange}
                    fullWidth
                    size="xs"
                    radius="md"
                    styles={{
                      root: {
                        backgroundColor: "var(--bg-input, var(--mantine-color-gray-1))",
                        padding: 3,
                      },
                      label: {
                        padding: "6px 10px",
                        fontWeight: 600,
                        fontSize: "12px",
                      },
                    }}
                    data={[
                      {
                        label: (
                          <Flex align="center" gap={6} justify="center">
                            <IconMail size={15} />
                            <span>{t("register.verifyByEmail")}</span>
                          </Flex>
                        ),
                        value: "EMAIL",
                      },
                      {
                        label: (
                          <Flex align="center" gap={6} justify="center">
                            <IconDeviceMobile size={15} />
                            <span>{t("register.verifyBySms")}</span>
                          </Flex>
                        ),
                        value: "SMS",
                      },
                    ]}
                  />
                </Box>

                {/* Contact field based on mode */}
                {isEmailMode ? (
                  <TextInput
                    label={t("register.email")}
                    placeholder="example@mail.com"
                    required
                    size="md"
                    radius="md"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    leftSection={<IconMail size={18} />}
                    styles={{
                      input: {
                        height: 46,
                        fontSize: "14px",
                        backgroundColor: "var(--bg-input, var(--surface))",
                        borderColor: "var(--border)",
                      },
                      label: {
                        fontWeight: 600,
                        fontSize: "12px",
                        marginBottom: 4,
                      },
                    }}
                    {...form.getInputProps("email")}
                  />
                ) : (
                  <TextInput
                    label={t("register.phoneNumber")}
                    placeholder="+998 90 123 45 67"
                    required
                    size="md"
                    radius="md"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={17}
                    leftSection={<IconDeviceMobile size={18} />}
                    styles={{
                      input: {
                        height: 46,
                        fontSize: "14px",
                        backgroundColor: "var(--bg-input, var(--surface))",
                        borderColor: "var(--border)",
                      },
                      label: {
                        fontWeight: 600,
                        fontSize: "12px",
                        marginBottom: 4,
                      },
                    }}
                    value={form.values.phoneNumber}
                    onChange={(e) => {
                      const formatted = formatUzPhone(e.currentTarget.value);
                      form.setFieldValue("phoneNumber", formatted);
                    }}
                    error={form.errors.phoneNumber}
                  />
                )}

                {/* Password field with Caps Lock & Strength meter */}
                <Box>
                  <PasswordInput
                    label={t("register.password")}
                    placeholder={t("auth.passwordPlaceholder")}
                    required
                    size="md"
                    radius="md"
                    autoComplete="new-password"
                    leftSection={<IconLock size={18} />}
                    styles={{
                      input: {
                        height: 46,
                        fontSize: "14px",
                        backgroundColor: "var(--bg-input, var(--surface))",
                        borderColor: "var(--border)",
                      },
                      label: {
                        fontWeight: 600,
                        fontSize: "12px",
                        marginBottom: 4,
                      },
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    {...form.getInputProps("password")}
                  />
                  <CapsLockWarning active={isCapsLock && passwordFocused} />
                  <PasswordStrengthMeter password={form.values.password} />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  radius="md"
                  size="md"
                  loading={loading}
                  h={48}
                  fw={700}
                  fz="sm"
                  mt={2}
                  className="saas-interactive-btn"
                >
                  {t("register.register")}
                </Button>

                <Divider
                  label={t("auth.orContinueWith")}
                  labelPosition="center"
                  my="xs"
                />

                <SimpleGrid cols={2} spacing="sm">
                  <GoogleLoginButton mode="register" compact />
                  <TelegramLoginButton mode="register" compact />
                </SimpleGrid>
              </Stack>
            </form>
          ) : (
            /* Step 2: OTP Verification */
            <Box>
              <Stack align="center" gap="xs">
                <Center
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: isEmailMode
                      ? "var(--mantine-color-blue-light)"
                      : "var(--mantine-color-teal-light)",
                    color: isEmailMode
                      ? "var(--mantine-color-blue-7)"
                      : "var(--mantine-color-teal-7)",
                  }}
                >
                  {isEmailMode ? (
                    <IconMailShare size={20} />
                  ) : (
                    <IconMessageShare size={20} />
                  )}
                </Center>

                <Text size="xs" c="dimmed" ta="center">
                  {isEmailMode
                    ? t("register.otpSentTo")
                    : t("register.codeSentToPhone")}
                </Text>

                <Text fw={600} size="sm" ta="center">
                  {isEmailMode ? form.values.email : form.values.phoneNumber}
                </Text>

                {isEmailMode && (
                  <Button
                    component="a"
                    href={getInboxLink(form.values.email)}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="light"
                    size="xs"
                    radius="md"
                    rightSection={<IconExternalLink size={14} />}
                  >
                    {t("register.openEmailInbox")}
                  </Button>
                )}
              </Stack>

              <Center mt="md" mb="xs" style={{ maxWidth: "100%", overflowX: "hidden" }}>
                <PinInput
                  length={6}
                  size="sm"
                  gap={6}
                  value={code}
                  onChange={setCode}
                  type="number"
                  autoFocus
                  placeholder="○"
                  styles={{
                    input: {
                      width: "clamp(28px, 9vw, 44px)",
                      height: "clamp(34px, 10vw, 48px)",
                      fontSize: "clamp(13px, 3.5vw, 18px)",
                      padding: 0,
                    },
                  }}
                />
              </Center>

              <Group justify="center" mt="xs" mb="sm">
                {countdown > 0 ? (
                  <Text size="xs" c="dimmed">
                    {t("register.resendCodeIn", { seconds: countdown })}
                  </Text>
                ) : (
                  <Anchor
                    component="button"
                    type="button"
                    size="xs"
                    fw={600}
                    c="brand"
                    onClick={handleResendCode}
                    disabled={resending}
                  >
                    {resending ? "..." : t("register.resendCode")}
                  </Anchor>
                )}
              </Group>

              <Button
                fullWidth
                loading={loading}
                disabled={code.length < 6}
                onClick={handleComplete}
                radius="md"
                size="md"
                h={48}
                fw={700}
                fz="sm"
                className="saas-interactive-btn"
              >
                {t("register.confirm")}
              </Button>

              <Center mt="xs">
                <Anchor
                  component="button"
                  type="button"
                  size="xs"
                  c="dimmed"
                  onClick={() => {
                    setStep(1);
                    setErrorMessage(null);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  <IconArrowLeft size={14} />
                  {t("register.editInfo")}
                </Anchor>
              </Center>
            </Box>
          )}

          <AuthSecurityBadge compact />
        </Paper>
      </Container>
    </Box>
  );
};

export default Register_Page;
