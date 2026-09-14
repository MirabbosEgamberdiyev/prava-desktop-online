import {
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Paper,
  PasswordInput,
  PinInput,
  SegmentedControl,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
  ActionIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconAt,
  IconDeviceMobile,
  IconLock,
  IconMailShare,
  IconMessageShare,
  IconUser,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import SEO from "../../../components/common/SEO";

const ForgotPassword_Page = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [verificationType, setVerificationType] = useState<"EMAIL" | "SMS">(
    "EMAIL"
  );
  const navigate = useNavigate();
  const { t } = useTranslation();

  const form = useForm({
    initialValues: {
      identifier: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      identifier: (value) =>
        value.trim().length < 5
          ? t("validation.minChars", { count: 5 })
          : null,
      newPassword: (value) => {
        if (step !== 3) return null;
        return value.length < 8
          ? t("validation.minChars", { count: 8 })
          : null;
      },
      confirmPassword: (value, values) => {
        if (step !== 3) return null;
        return value !== values.newPassword
          ? t("forgotPassword.passwordMismatch")
          : null;
      },
    },
  });

  // Step 1: Send verification code
  const handleSendCode = async () => {
    const validation = form.validateField("identifier");
    if (validation.hasError) return;

    setLoading(true);
    try {
      await api.post("/api/v1/auth/forgot-password", {
        identifier: form.values.identifier.trim(),
        verificationType,
      });
      setStep(2);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: t("forgotPassword.errorTitle"),
        message:
          err?.response?.data?.message || t("forgotPassword.errorMessage"),
        color: "red",
        withBorder: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Code entered -> go to step 3
  const handleCodeEntered = () => {
    if (code.length < 6) return;
    setStep(3);
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    const validation = form.validate();
    if (validation.hasErrors) return;

    setLoading(true);
    try {
      await api.post("/api/v1/auth/reset-password", {
        recipient: form.values.identifier.trim(),
        code,
        newPassword: form.values.newPassword,
        verificationType,
      });

      notifications.show({
        title: t("forgotPassword.successTitle"),
        message: t("forgotPassword.successMessage"),
        color: "green",
        withBorder: true,
      });
      navigate("/auth/login");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: t("forgotPassword.errorTitle"),
        message:
          err?.response?.data?.message || t("forgotPassword.resetError"),
        color: "red",
        withBorder: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Stepper active index (0-based)
  const stepperActive = step - 1;

  return (
    <Box className="auth-page-container">
      <Container size={440} p={0} className="auth-page-inner">
        <SEO
          title="Parolni tiklash"
          description="Parolingizni unutdingizmi? Email yoki telefon raqamingiz orqali parolni tiklang."
          canonical="/auth/forgot-password"
          noIndex={true}
        />
        <Flex gap="sm" justify="space-between" align="center" mb={{ base: 10, sm: "md" }}>
          <Title order={3} size="1.2rem">{t("forgotPassword.title")}</Title>
          <Anchor component={Link} to="/auth/login">
            <Button
              leftSection={<IconArrowLeft size={16} />}
              variant="subtle"
              size="xs"
            >
              {t("forgotPassword.backToLogin")}
            </Button>
          </Anchor>
        </Flex>

        <Stepper
          active={stepperActive}
          size="xs"
          mb={{ base: 10, sm: 14 }}
        >
          <Stepper.Step icon={<IconUser size={16} />} />
          <Stepper.Step icon={<IconMailShare size={16} />} />
          <Stepper.Step icon={<IconLock size={16} />} />
        </Stepper>

        <Paper
          withBorder
          shadow="sm"
          p={{ base: 16, sm: 24 }}
          radius="lg"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {step === 1 && (
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                {t("forgotPassword.description")}
              </Text>
              <TextInput
                label={t("forgotPassword.identifier")}
                placeholder="email@example.com"
                required
                size="sm"
                radius="md"
                leftSection={<IconUser size={16} />}
                {...form.getInputProps("identifier")}
              />
              <SegmentedControl
                value={verificationType}
                onChange={(v) => setVerificationType(v as "EMAIL" | "SMS")}
                fullWidth
                size="xs"
                radius="md"
                data={[
                  {
                    label: (
                      <Flex align="center" gap={6} justify="center">
                        <IconAt size={15} />
                        <span>{t("forgotPassword.verifyByEmail")}</span>
                      </Flex>
                    ),
                    value: "EMAIL",
                  },
                  {
                    label: (
                      <Flex align="center" gap={6} justify="center">
                        <IconDeviceMobile size={15} />
                        <span>{t("forgotPassword.verifyBySms")}</span>
                      </Flex>
                    ),
                    value: "SMS",
                  },
                ]}
              />
              <Button
                fullWidth
                mt={4}
                loading={loading}
                radius="md"
                size="md"
                h={42}
                fw={600}
                onClick={handleSendCode}
              >
                {t("forgotPassword.sendCode")}
              </Button>
            </Stack>
          )}

          {step === 2 && (
            <Box>
              <Center>
                <ActionIcon
                  size={54}
                  variant="light"
                  radius="xl"
                  color={verificationType === "EMAIL" ? "blue" : "green"}
                >
                  {verificationType === "SMS" ? (
                    <IconMessageShare size={24} />
                  ) : (
                    <IconMailShare size={24} />
                  )}
                </ActionIcon>
              </Center>
              <Text ta="center" fw={500} size="sm" mt="xs">
                {verificationType === "SMS"
                  ? t("forgotPassword.codeSentToPhone")
                  : t("forgotPassword.codeSent")}
              </Text>
              <Center>
                <Text ta="center" fw={600} size="sm" c="blue">
                  {form.values.identifier}
                </Text>
              </Center>
              <Center mt="md">
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
              <Button
                fullWidth
                loading={loading}
                disabled={code.length < 6}
                onClick={handleCodeEntered}
                radius="md"
                mt="md"
                size="md"
                h={42}
                fw={600}
              >
                {t("forgotPassword.enterCode")}
              </Button>
            </Box>
          )}

          {step === 3 && (
            <Stack gap="sm">
              <PasswordInput
                label={t("forgotPassword.newPassword")}
                required
                size="sm"
                radius="md"
                leftSection={<IconLock size={16} />}
                {...form.getInputProps("newPassword")}
              />
              <PasswordInput
                label={t("forgotPassword.confirmPassword")}
                required
                size="sm"
                radius="md"
                leftSection={<IconLock size={16} />}
                {...form.getInputProps("confirmPassword")}
              />
              <Button
                fullWidth
                mt={4}
                loading={loading}
                radius="md"
                size="md"
                h={42}
                fw={600}
                onClick={handleResetPassword}
              >
                {t("forgotPassword.resetPassword")}
              </Button>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword_Page;
