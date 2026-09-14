import { Box, Group, Progress, Stack, Text } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface PasswordStrengthMeterProps {
  password: string;
}

export interface PasswordRulesState {
  hasMinLength: boolean;
  hasCaseMix: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  allValid: boolean;
  strengthPercent: number;
}

export function checkPasswordRules(password: string): PasswordRulesState {
  const hasMinLength = password.length >= 8;
  const hasCaseMix = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&]/.test(password);

  let score = 0;
  if (hasMinLength) score += 1;
  if (hasCaseMix) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  const strengthPercent = (score / 4) * 100;
  const allValid = hasMinLength && hasCaseMix && hasNumber && hasSpecial;

  return {
    hasMinLength,
    hasCaseMix,
    hasNumber,
    hasSpecial,
    allValid,
    strengthPercent,
  };
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { t } = useTranslation();

  if (!password) return null;

  const rules = checkPasswordRules(password);

  const getColor = (pct: number) => {
    if (pct <= 25) return "red";
    if (pct <= 50) return "orange";
    if (pct <= 75) return "yellow";
    return "teal";
  };

  const getLabel = (pct: number) => {
    if (pct <= 25) return t("auth.strengthVeryWeak");
    if (pct <= 50) return t("auth.strengthWeak");
    if (pct <= 75) return t("auth.strengthMedium");
    return t("auth.strengthStrong");
  };

  const color = getColor(rules.strengthPercent);
  const label = getLabel(rules.strengthPercent);

  const criteria = [
    { label: t("auth.passwordRuleLength"), valid: rules.hasMinLength },
    { label: t("auth.passwordRuleCase"), valid: rules.hasCaseMix },
    { label: t("auth.passwordRuleNumber"), valid: rules.hasNumber },
    { label: t("auth.passwordRuleSpecial"), valid: rules.hasSpecial },
  ];

  return (
    <Stack gap={6} mt={8}>
      <Group justify="space-between" align="center">
        <Text size="xs" c="dimmed">
          {t("auth.passwordStrength")}:
        </Text>
        <Text size="xs" fw={600} c={color}>
          {label}
        </Text>
      </Group>

      <Progress
        value={rules.strengthPercent}
        color={color}
        size="xs"
        radius="xl"
        style={{ transition: "all 300ms ease" }}
      />

      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "4px 8px",
          marginTop: 4,
        }}
      >
        {criteria.map((item, idx) => (
          <Group key={idx} gap={4} wrap="nowrap" align="center">
            {item.valid ? (
              <IconCheck size={14} style={{ color: "var(--mantine-color-teal-6)", flexShrink: 0 }} />
            ) : (
              <IconX size={14} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />
            )}
            <Text
              size="xs"
              c={item.valid ? "var(--mantine-color-teal-7)" : "dimmed"}
              style={{
                lineHeight: 1.2,
                fontSize: "11px",
                transition: "color 150ms ease",
              }}
            >
              {item.label}
            </Text>
          </Group>
        ))}
      </Box>
    </Stack>
  );
}
