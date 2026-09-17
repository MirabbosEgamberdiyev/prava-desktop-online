import {
  Alert,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
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
import { showToast } from "../../../utils/notificationUtils";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconDeviceMobile,
  IconLock,
  IconMail,
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
  isValidUzPhone,
  normalizeUzPhone,
} from "../../../utils/phoneUtils";
import TermsModal from "../../../components/auth/TermsModal";

const Register_Page = () => {
  const { register: authRegister, isAuthenticated } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [termsModal, setTermsModal] = useState<"terms" | "privacy" | null>(null);
  const isCapsLock = useCapsLock();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

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
      confirmPassword: "",
      verificationType: "EMAIL" as "EMAIL" | "SMS",
    },

    validate: {
      firstName: (value) =>
        value.trim().length < 2 ? t("validation.nameTooShort", { defaultValue: "Ism kamida 2 ta harfdan iborat bo'lishi kerak" }) : null,
      lastName: (value) =>
        value.trim().length < 2 ? t("validation.nameTooShort", { defaultValue: "Familiya kamida 2 ta harfdan iborat bo'lishi kerak" }) : null,
      email: (value, values) => {
        if (values.verificationType === "SMS") return null;
        if (!value || value.trim().length === 0)
          return t("validation.invalidEmail", { defaultValue: "Email kiriting" });
        return /^\S+@\S+\.\S+$/.test(value.trim())
          ? null
          : t("validation.invalidEmail", { defaultValue: "Noto'g'ri email" });
      },
      phoneNumber: (value, values) => {
        if (values.verificationType === "EMAIL") return null;
        if (!value || value.trim().length === 0)
          return t("validation.invalidPhone", { defaultValue: "Telefon raqamini kiriting" });
        return isValidUzPhone(value) ? null : t("validation.phoneLength", { defaultValue: "Telefon raqami noto'g'ri" });
      },
      password: (value) => {
        const rules = checkPasswordRules(value);
        if (!rules.allValid) {
          return t("validation.passwordComplexity", { defaultValue: "Parol xavfsizlik talablariga javob bermaydi" });
        }
        return null;
      },
      confirmPassword: (value, values) =>
        value !== values.password
          ? t("forgotPassword.passwordMismatch", { defaultValue: "Parollar mos kelmaydi" })
          : null,
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/me" replace />;
  }

  const handleInit = async (values: typeof form.values) => {
    if (loading) return;
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
      let msg = getErrorMessage(error, t("register.errorMessage", { defaultValue: "Ro'yxatdan o'tishda xatolik!" }));
      const isEmail = values.verificationType === "EMAIL";
      if (!isEmail && (msg.includes("yuborib bo'lmadi") || (error as any)?.response?.status === 400)) {
        msg = "SMS xizmati vaqtincha ishlamayapti. Iltimos, Email orqali ro'yxatdan o'ting.";
      }
      setErrorMessage(msg);
      showToast({
        id: "auth-register-init-error",
        dedupeKey: "auth-register-init-error",
        title: t("register.errorTitle", { defaultValue: "Xatolik" }),
        message: msg,
        color: "red",
        withBorder: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resending || countdown > 0) return;
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
      showToast({
        id: "auth-register-resend-success",
        dedupeKey: "auth-register-resend-success",
        title: t("common.success", { defaultValue: "Muvaffaqiyat" }),
        message: t("register.otpSentTo", { defaultValue: "Tasdiqlash kodi qayta yuborildi" }),
        color: "teal",
        withBorder: true,
      });
    } catch (error: unknown) {
      let msg = getErrorMessage(error, t("register.errorMessage", { defaultValue: "Xatolik yuz berdi" }));
      setErrorMessage(msg);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (overrideCode?: string) => {
    const targetCode = typeof overrideCode === "string" ? overrideCode.trim() : code.trim();
    if (targetCode.length !== 6 || loading) return;
    setLoading(true);
    setErrorMessage(null);

    const isEmail = form.values.verificationType === "EMAIL";
    const recipient = isEmail
      ? form.values.email.trim()
      : normalizeUzPhone(form.values.phoneNumber);

    try {
      const response = await api.post("/api/v1/auth/register/verify", {
        recipient,
        code: targetCode,
        verificationType: form.values.verificationType,
        preferredLanguage: i18n.language || "uzl",
      });

      if (response.data.success) {
        authRegister(response.data.data);
        navigate("/me", { replace: true });
        showToast({
          id: "auth-register-verify-success",
          dedupeKey: "auth-register-verify-success",
          title: t("register.successTitle", { defaultValue: "Muvaffaqiyat" }),
          message: t("register.successMessage", { defaultValue: "Muvaffaqiyatli ro'yxatdan o'tdingiz!" }),
          color: "teal",
          withBorder: true,
        });
      }
    } catch (error: unknown) {
      const msg = getErrorMessage(error, t("register.codeError", { defaultValue: "Tasdiqlash kodi xato yoki muddati o'tgan!" }));
      setErrorMessage(msg);
      showToast({
        id: "auth-register-verify-error",
        dedupeKey: "auth-register-verify-error",
        title: t("register.errorTitle", { defaultValue: "Xatolik" }),
        message: msg,
        color: "red",
        withBorder: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ width: "100%", maxWidth: 440, margin: "0 auto" }}>
      <SEO
        title="Ro'yxatdan o'tish - Prava Online"
        description="Prava Online platformasida yangi akkaunt oching va yo'l harakati qoidalari bo'yicha imtihonga tayyorlanishni boshlang."
        canonical="/auth/register"
      />

      {/* Header */}
      <Stack gap={6} align="center" mb={18} ta="center">
        <Title
          order={2}
          size="1.5rem"
          fw={800}
          style={{ letterSpacing: "-0.02em", color: "var(--text)" }}
        >
          {step === 1
            ? t("register.title", { defaultValue: "Ro'yxatdan o'tish" })
            : t("register.otpTitle", { defaultValue: "Tasdiqlash kodini kiriting" })}
        </Title>

        <Text size="sm" c="dimmed" maw={360}>
          {step === 1
            ? t("register.registerSubtitle", {
                defaultValue: "Bepul hisob yarating va imtihonga tayyorlanishni boshlang",
              })
            : form.values.verificationType === "EMAIL"
            ? `${form.values.email} manziliga yuborilgan 6 xonali kodni kiriting`
            : `${form.values.phoneNumber} raqamiga yuborilgan 6 xonali kodni kiriting`}
        </Text>
      </Stack>

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

      {step === 1 ? (
        /* Step 1: Personal Info Form */
        <form
          onSubmit={form.onSubmit(handleInit)}
          onChange={() => errorMessage && setErrorMessage(null)}
          noValidate
        >
          <Stack gap={14}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={12}>
              <TextInput
                label={t("register.firstName", { defaultValue: "Ism" })}
                placeholder="Ali"
                required
                size="sm"
                radius="md"
                leftSection={<IconUser size={17} color="#0284c7" />}
                styles={{
                  input: { height: 44, fontSize: "14px" },
                  label: { fontSize: "12.5px", fontWeight: 600, marginBottom: 3 },
                }}
                {...form.getInputProps("firstName")}
              />

              <TextInput
                label={t("register.lastName", { defaultValue: "Familiya" })}
                placeholder="Valiyev"
                required
                size="sm"
                radius="md"
                leftSection={<IconUser size={17} color="#0284c7" />}
                styles={{
                  input: { height: 44, fontSize: "14px" },
                  label: { fontSize: "12.5px", fontWeight: 600, marginBottom: 3 },
                }}
                {...form.getInputProps("lastName")}
              />
            </SimpleGrid>

            {/* Verification Method Segmented Toggle */}
            <Box>
              <Text fz={12.5} fw={600} mb={4}>
                {t("register.verificationChannel", { defaultValue: "Tasdiqlash usuli" })}
              </Text>
              <SegmentedControl
                fullWidth
                radius="md"
                size="sm"
                value={form.values.verificationType}
                onChange={(val) => {
                  form.setFieldValue("verificationType", val as "EMAIL" | "SMS");
                  setErrorMessage(null);
                }}
                data={[
                  {
                    value: "EMAIL",
                    label: (
                      <Group gap={6} justify="center">
                        <IconMail size={16} />
                        <span>{t("register.verifyByEmail", { defaultValue: "Email orqali" })}</span>
                      </Group>
                    ),
                  },
                  {
                    value: "SMS",
                    label: (
                      <Group gap={6} justify="center">
                        <IconDeviceMobile size={16} />
                        <span>{t("register.verifyBySms", { defaultValue: "SMS orqali" })}</span>
                      </Group>
                    ),
                  },
                ]}
              />
            </Box>

            {/* Email or Phone Input */}
            {form.values.verificationType === "EMAIL" ? (
              <TextInput
                label={t("register.email", { defaultValue: "Email" })}
                placeholder="name@example.com"
                required
                size="sm"
                radius="md"
                autoComplete="email"
                leftSection={<IconMail size={17} color="#0284c7" />}
                styles={{
                  input: { height: 44, fontSize: "14px" },
                  label: { fontSize: "12.5px", fontWeight: 600, marginBottom: 3 },
                }}
                {...form.getInputProps("email")}
              />
            ) : (
              <TextInput
                label={t("register.phoneNumber", { defaultValue: "Telefon raqam" })}
                placeholder="+998 90 123 45 67"
                required
                size="sm"
                radius="md"
                autoComplete="tel"
                leftSection={<IconDeviceMobile size={17} color="#0284c7" />}
                styles={{
                  input: { height: 44, fontSize: "14px" },
                  label: { fontSize: "12.5px", fontWeight: 600, marginBottom: 3 },
                }}
                {...form.getInputProps("phoneNumber")}
              />
            )}

            {/* Password */}
            <Box>
              <PasswordInput
                label={t("register.password", { defaultValue: "Parol" })}
                placeholder="••••••••"
                required
                size="sm"
                radius="md"
                autoComplete="new-password"
                leftSection={<IconLock size={17} color="#64748b" />}
                styles={{
                  input: { height: 44, fontSize: "14px" },
                  label: { fontSize: "12.5px", fontWeight: 600, marginBottom: 3 },
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                {...form.getInputProps("password")}
              />
              <CapsLockWarning active={isCapsLock && passwordFocused} />
              <PasswordStrengthMeter password={form.values.password} />
            </Box>

            {/* Confirm Password */}
            <PasswordInput
              label={lang === "ru" ? "Повторите пароль" : lang === "uzc" ? "Паролни такрорланг" : "Parolni tasdiqlang"}
              placeholder="••••••••"
              required
              size="sm"
              radius="md"
              autoComplete="new-password"
              leftSection={<IconLock size={17} color="#64748b" />}
              styles={{
                input: { height: 44, fontSize: "14px" },
                label: { fontSize: "12.5px", fontWeight: 600, marginBottom: 3 },
              }}
              {...form.getInputProps("confirmPassword")}
            />

            {/* Terms of Service */}
            <Text fz={11.5} c="dimmed" style={{ lineHeight: 1.4 }}>
              {t("auth.termsAgreementPrefix", { defaultValue: "Davom etish orqali siz" })}{" "}
              <Anchor
                component="button"
                type="button"
                onClick={() => setTermsModal("terms")}
                size="xs"
                c="blue"
              >
                {t("auth.termsOfService", { defaultValue: "Foydalanish shartlari" })}
              </Anchor>{" "}
              {t("auth.andText", { defaultValue: "va" })}{" "}
              <Anchor
                component="button"
                type="button"
                onClick={() => setTermsModal("privacy")}
                size="xs"
                c="blue"
              >
                {t("auth.privacyPolicy", { defaultValue: "Maxfiylik siyosati" })}
              </Anchor>
              {t("auth.termsAgreementSuffix", { defaultValue: "ga rozilik bildirasiz." })}
            </Text>

            {/* Submit Button */}
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
              }}
            >
              {t("register.register", { defaultValue: "Ro'yxatdan o'tish" })} →
            </Button>

            <Divider
              label={t("auth.orContinueWith", { defaultValue: "yoki" })}
              labelPosition="center"
              my={2}
            />

            {/* Social Registration */}
            <Stack gap={8}>
              <GoogleLoginButton mode="register" />
              <TelegramLoginButton mode="register" />
            </Stack>
          </Stack>
        </form>
      ) : (
        /* Step 2: 6-Digit OTP Verification */
        <Stack align="center" gap={18} py={12}>
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: "rgba(2, 132, 199, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {form.values.verificationType === "EMAIL" ? (
              <IconMail size={32} color="#0284c7" />
            ) : (
              <IconDeviceMobile size={32} color="#0284c7" />
            )}
          </Box>

          <PinInput
            length={6}
            size="lg"
            type="number"
            value={code}
            onChange={(val) => {
              setCode(val);
              setErrorMessage(null);
            }}
            onComplete={(val) => handleVerify(val)}
            autoFocus
            radius="md"
            gap="sm"
          />

          <Button
            size="md"
            fullWidth
            radius="md"
            onClick={() => handleVerify()}
            loading={loading}
            disabled={code.length !== 6}
            h={46}
            color="blue"
            style={{ fontWeight: 700 }}
          >
            {t("register.confirm", { defaultValue: "Tasdiqlash" })}
          </Button>

          {/* Resend OTP */}
          <Group justify="center" gap={6}>
            {countdown > 0 ? (
              <Text fz={13} c="dimmed">
                {t("register.resendCodeIn", {
                  seconds: countdown,
                  defaultValue: `Kodni qayta yuborish: ${countdown}s`,
                })}
              </Text>
            ) : (
              <Anchor
                component="button"
                type="button"
                onClick={handleResendCode}
                size="xs"
                c="blue"
                fw={600}
              >
                {t("register.resendCode", { defaultValue: "Kodni qayta yuborish" })}
              </Anchor>
            )}
          </Group>

          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => setStep(1)}
          >
            {t("register.editInfo", { defaultValue: "Ma'lumotlarni o'zgartirish" })}
          </Button>
        </Stack>
      )}

      {/* Footer Nav */}
      <Group justify="center" gap={6} mt={20}>
        <Text size="xs" c="dimmed">
          {t("register.alreadyHaveAccount", { defaultValue: "Profilingiz bormi?" })}
        </Text>
        <Anchor component={Link} to="/auth/login" size="xs" fw={700} c="blue">
          {t("register.login", { defaultValue: "Kirish" })}
        </Anchor>
      </Group>

      <Box mt={14}>
        <AuthSecurityBadge compact />
      </Box>

      <TermsModal
        opened={termsModal !== null}
        onClose={() => setTermsModal(null)}
        type={termsModal || "terms"}
      />
    </Box>
  );
};

export default Register_Page;
