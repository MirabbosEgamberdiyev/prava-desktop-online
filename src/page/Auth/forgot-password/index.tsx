import {
  Alert,
  Anchor,
  Box,
  Button,
  Group,
  PasswordInput,
  PinInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { showToast } from "../../../utils/notificationUtils";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconDeviceMobile,
  IconLock,
  IconMail,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import SEO from "../../../components/common/SEO";
import { getErrorMessage } from "../../../types/errors";
import { useCapsLock } from "../../../hooks/useCapsLock";
import CapsLockWarning from "../../../components/auth/CapsLockWarning";
import PasswordStrengthMeter, {
  checkPasswordRules,
} from "../../../components/auth/PasswordStrengthMeter";
import { normalizeUzPhone } from "../../../utils/phoneUtils";
import AuthSecurityBadge from "../../../components/auth/AuthSecurityBadge";

const ForgotPassword_Page = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [code, setCode] = useState("");
  const [verificationType, setVerificationType] = useState<"EMAIL" | "SMS">("EMAIL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [countdown, setCountdown] = useState(60);
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
      identifier: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      identifier: (value) =>
        value.trim().length < 4
          ? t("validation.minChars", { count: 4, defaultValue: "Kamida 4 ta belgi kiriting" })
          : null,
      newPassword: (value) => {
        if (step !== 3) return null;
        const rules = checkPasswordRules(value);
        if (!rules.allValid) {
          return t("validation.passwordComplexity", { defaultValue: "Parol xavfsizlik talablariga javob bermaydi" });
        }
        return null;
      },
      confirmPassword: (value, values) => {
        if (step !== 3) return null;
        return value !== values.newPassword
          ? t("forgotPassword.passwordMismatch", { defaultValue: "Parollar mos kelmaydi" })
          : null;
      },
    },
  });

  const handleSendCode = async () => {
    const validation = form.validateField("identifier");
    if (validation.hasError) return;

    setLoading(true);
    setErrorMessage(null);

    let cleanId = form.values.identifier.trim();
    if (verificationType === "SMS") {
      cleanId = normalizeUzPhone(cleanId);
    }

    try {
      await api.post("/api/v1/auth/forgot-password", {
        identifier: cleanId,
        verificationType,
      });
      setStep(2);
      setCountdown(60);
      setCode("");
    } catch (error: unknown) {
      const msg = getErrorMessage(error, t("forgotPassword.errorMessage", { defaultValue: "Kod yuborishda xatolik yuz berdi" }));
      setErrorMessage(msg);
      showToast({
        id: "forgot-password-send-error",
        title: t("forgotPassword.errorTitle", { defaultValue: "Xatolik" }),
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

    let cleanId = form.values.identifier.trim();
    if (verificationType === "SMS") {
      cleanId = normalizeUzPhone(cleanId);
    }

    try {
      await api.post("/api/v1/auth/forgot-password", {
        identifier: cleanId,
        verificationType,
      });
      setCountdown(60);
      showToast({
        id: "forgot-password-resend-success",
        title: t("common.success", { defaultValue: "Muvaffaqiyat" }),
        message: t("forgotPassword.codeSent", { defaultValue: "Tasdiqlash kodi qayta yuborildi" }),
        color: "teal",
        withBorder: true,
      });
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, t("forgotPassword.errorMessage", { defaultValue: "Xatolik yuz berdi" })));
    } finally {
      setResending(false);
    }
  };

  const handleCodeSubmit = (overrideCode?: string) => {
    const targetCode = typeof overrideCode === "string" ? overrideCode.trim() : code.trim();
    if (targetCode.length !== 6) return;
    if (targetCode !== code) {
      setCode(targetCode);
    }
    setStep(3);
  };

  const handleResetPassword = async () => {
    const validation = form.validate();
    if (validation.hasErrors) return;

    setLoading(true);
    setErrorMessage(null);

    let cleanId = form.values.identifier.trim();
    if (verificationType === "SMS") {
      cleanId = normalizeUzPhone(cleanId);
    }

    try {
      await api.post("/api/v1/auth/reset-password", {
        recipient: cleanId,
        code,
        newPassword: form.values.newPassword,
        verificationType,
      });

      showToast({
        id: "forgot-password-reset-success",
        title: t("forgotPassword.successTitle", { defaultValue: "Muvaffaqiyat" }),
        message: t("forgotPassword.successMessage", {
          defaultValue: "Parol muvaffaqiyatli tiklandi. Yangi parol bilan kirishingiz mumkin.",
        }),
        color: "teal",
        withBorder: true,
      });
      navigate("/auth/login", { replace: true });
    } catch (error: unknown) {
      const msg = getErrorMessage(error, t("forgotPassword.resetError", { defaultValue: "Parolni tiklashda xatolik yuz berdi" }));
      setErrorMessage(msg);
      showToast({
        id: "forgot-password-reset-error",
        title: t("forgotPassword.errorTitle", { defaultValue: "Xatolik" }),
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
        title="Parolni tiklash - Prava Online"
        description="Parolingizni unutdingizmi? Email yoki telefon raqamingiz orqali parolni tiklang."
        canonical="/auth/forgot-password"
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
            ? t("forgotPassword.title", { defaultValue: "Parolni tiklash" })
            : step === 2
            ? t("forgotPassword.enterCode", { defaultValue: "Kodni kiriting" })
            : t("forgotPassword.newPassword", { defaultValue: "Yangi parol o'rnatish" })}
        </Title>

        <Text size="sm" c="dimmed" maw={360}>
          {step === 1
            ? t("forgotPassword.description", {
                defaultValue: "Email yoki telefon raqamingizni kiriting, biz sizga tasdiqlash kodini yuboramiz",
              })
            : step === 2
            ? `${form.values.identifier} ga yuborilgan 6 xonali tasdiqlash kodini kiriting`
            : "Profilingiz uchun yangi va mustahkam parol kiriting"}
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
        /* Step 1: Identifier + Channel */
        <Stack gap={14}>
          <Box>
            <Text fz={12.5} fw={600} mb={4}>
              {t("register.verificationChannel", { defaultValue: "Tasdiqlash usuli" })}
            </Text>
            <SegmentedControl
              fullWidth
              radius="md"
              size="sm"
              value={verificationType}
              onChange={(val) => {
                setVerificationType(val as "EMAIL" | "SMS");
                setErrorMessage(null);
              }}
              data={[
                {
                  value: "EMAIL",
                  label: (
                    <Group gap={6} justify="center">
                      <IconMail size={16} />
                      <span>{t("forgotPassword.verifyByEmail", { defaultValue: "Email orqali" })}</span>
                    </Group>
                  ),
                },
                {
                  value: "SMS",
                  label: (
                    <Group gap={6} justify="center">
                      <IconDeviceMobile size={16} />
                      <span>{t("forgotPassword.verifyBySms", { defaultValue: "SMS orqali" })}</span>
                    </Group>
                  ),
                },
              ]}
            />
          </Box>

          <TextInput
            label={t("forgotPassword.identifier", { defaultValue: "Email yoki Telefon raqam" })}
            placeholder={verificationType === "EMAIL" ? "name@example.com" : "+998 90 123 45 67"}
            required
            size="sm"
            radius="md"
            leftSection={verificationType === "EMAIL" ? <IconMail size={17} color="#0284c7" /> : <IconDeviceMobile size={17} color="#0284c7" />}
            styles={{
              input: { height: 46, fontSize: "14.5px" },
              label: { fontSize: "13px", fontWeight: 600, marginBottom: 4 },
            }}
            {...form.getInputProps("identifier")}
          />

          <Button
            size="md"
            fullWidth
            radius="md"
            onClick={handleSendCode}
            loading={loading}
            h={48}
            color="blue"
            style={{ fontWeight: 700, fontSize: "15px" }}
          >
            {t("forgotPassword.sendCode", { defaultValue: "Kodni yuborish" })} →
          </Button>

          <Button
            variant="subtle"
            color="gray"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate("/auth/login")}
          >
            {t("forgotPassword.backToLogin", { defaultValue: "Kirishga qaytish" })}
          </Button>
        </Stack>
      ) : step === 2 ? (
        /* Step 2: 6-Digit OTP */
        <Stack align="center" gap={18} py={8}>
          <PinInput
            length={6}
            size="lg"
            type="number"
            value={code}
            onChange={(val) => {
              setCode(val);
              setErrorMessage(null);
            }}
            onComplete={(val) => handleCodeSubmit(val)}
            autoFocus
            radius="md"
            gap="sm"
          />

          <Button
            size="md"
            fullWidth
            radius="md"
            onClick={() => handleCodeSubmit()}
            disabled={code.length !== 6}
            h={46}
            color="blue"
            style={{ fontWeight: 700 }}
          >
            {lang === "ru" ? "Продолжить" : lang === "uzc" ? "Давом этиш" : "Davom etish"} →
          </Button>

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
            {lang === "ru" ? "Изменить данные" : lang === "uzc" ? "Маълумотларни ўзгартириш" : "Ma'lumotlarni o'zgartirish"}
          </Button>
        </Stack>
      ) : (
        /* Step 3: New Password */
        <Stack gap={14}>
          <Box>
            <PasswordInput
              label={t("forgotPassword.newPassword", { defaultValue: "Yangi parol" })}
              placeholder="••••••••"
              required
              size="sm"
              radius="md"
              autoComplete="new-password"
              leftSection={<IconLock size={17} color="#64748b" />}
              styles={{
                input: { height: 46, fontSize: "14.5px" },
                label: { fontSize: "13px", fontWeight: 600, marginBottom: 4 },
              }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              {...form.getInputProps("newPassword")}
            />
            <CapsLockWarning active={isCapsLock && passwordFocused} />
            <PasswordStrengthMeter password={form.values.newPassword} />
          </Box>

          <PasswordInput
            label={t("forgotPassword.confirmPassword", { defaultValue: "Parolni tasdiqlang" })}
            placeholder="••••••••"
            required
            size="sm"
            radius="md"
            autoComplete="new-password"
            leftSection={<IconLock size={17} color="#64748b" />}
            styles={{
              input: { height: 46, fontSize: "14.5px" },
              label: { fontSize: "13px", fontWeight: 600, marginBottom: 4 },
            }}
            {...form.getInputProps("confirmPassword")}
          />

          <Button
            size="md"
            fullWidth
            radius="md"
            onClick={handleResetPassword}
            loading={loading}
            h={48}
            color="blue"
            style={{ fontWeight: 700, fontSize: "15px" }}
          >
            {t("forgotPassword.resetPassword", { defaultValue: "Parolni yangilash" })}
          </Button>

          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => setStep(2)}
          >
            {lang === "ru" ? "Назад к коду" : lang === "uzc" ? "Код киритишга қайтиш" : "Kod kiritishga qaytish"}
          </Button>
        </Stack>
      )}

      {/* Footer Nav */}
      <Group justify="center" gap={6} mt={20}>
        <Anchor component={Link} to="/auth/login" size="xs" fw={700} c="blue">
          ← {t("forgotPassword.backToLogin", { defaultValue: "Kirish sahifasiga qaytish" })}
        </Anchor>
      </Group>

      <Box mt={14}>
        <AuthSecurityBadge compact />
      </Box>
    </Box>
  );
};

export default ForgotPassword_Page;
