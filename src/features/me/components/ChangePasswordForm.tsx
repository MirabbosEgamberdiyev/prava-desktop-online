import { useState } from "react";
import {
  Button,
  Paper,
  PasswordInput,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import api from "../../../api/api";

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  return Math.min(score, 100);
}

function getStrengthColor(strength: number): string {
  if (strength < 30) return "red";
  if (strength < 60) return "yellow";
  if (strength < 80) return "blue";
  return "green";
}

export function ChangePasswordForm() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const strengthColor = getStrengthColor(strength);

  const hasMinLength = newPassword.length >= 8;
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isValid =
    hasMinLength &&
    hasLowercase &&
    hasUppercase &&
    hasDigit &&
    hasSpecial &&
    passwordsMatch &&
    currentPassword.length > 0;

  const handleSubmit = async () => {
    if (!passwordsMatch) {
      notifications.show({
        title: t("common.error"),
        message: t("profile.passwordMismatch"),
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/v1/auth/change-password", {
        currentPassword,
        newPassword,
      });

      notifications.show({
        title: t("common.success"),
        message: t("profile.passwordChanged"),
        color: "green",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || t("profile.passwordChangeError");

      notifications.show({
        title: t("common.error"),
        message: errorMessage,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p={{ base: "md", sm: "lg" }} radius="md" withBorder shadow="sm">
      <Title order={4} mb="md">
        {t("profile.changePassword")}
      </Title>

      <Stack gap="sm" maw={{ base: "100%", sm: 400 }}>
        <PasswordInput
          label={t("profile.currentPassword")}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          radius="md"
        />

        <PasswordInput
          label={t("profile.newPassword")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.currentTarget.value)}
          radius="md"
        />

        {newPassword.length > 0 && (
          <>
            <Progress value={strength} color={strengthColor} size="sm" />
            <Text size="xs" c="dimmed">
              {t("profile.passwordRequirements")}:
            </Text>
            <Stack gap={2}>
              <Text size="xs" c={hasMinLength ? "green" : "red"}>
                {hasMinLength ? "✓" : "×"} 8+ {t("validation.minChars", { count: 8 }).toLowerCase()}
              </Text>
              <Text size="xs" c={hasLowercase ? "green" : "red"}>
                {hasLowercase ? "✓" : "×"} a-z
              </Text>
              <Text size="xs" c={hasUppercase ? "green" : "red"}>
                {hasUppercase ? "✓" : "×"} A-Z
              </Text>
              <Text size="xs" c={hasDigit ? "green" : "red"}>
                {hasDigit ? "✓" : "×"} 0-9
              </Text>
              <Text size="xs" c={hasSpecial ? "green" : "red"}>
                {hasSpecial ? "✓" : "×"} !@#$%
              </Text>
            </Stack>
          </>
        )}

        <PasswordInput
          label={t("profile.confirmPassword")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          radius="md"
          error={
            confirmPassword.length > 0 && !passwordsMatch
              ? t("profile.passwordMismatch")
              : undefined
          }
        />

        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!isValid}
          mt="sm"
          radius="md"
        >
          {t("profile.save")}
        </Button>
      </Stack>
    </Paper>
  );
}
