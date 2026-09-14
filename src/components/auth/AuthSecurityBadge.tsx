import { Group, Stack, Text, Anchor } from "@mantine/core";
import { IconShieldCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface AuthSecurityBadgeProps {
  compact?: boolean;
}

export default function AuthSecurityBadge({ compact = false }: AuthSecurityBadgeProps) {
  const { t } = useTranslation();

  return (
    <Stack gap={compact ? 4 : 8} align="center" mt={compact ? 12 : "md"}>
      <Group gap={6} justify="center" align="center">
        <IconShieldCheck size={14} style={{ color: "var(--mantine-color-teal-6)" }} />
        <Text size="xs" c="dimmed" fw={500}>
          {t("auth.sslProtected")}
        </Text>
      </Group>

      <Text size="xs" c="dimmed" ta="center" maw={380} style={{ lineHeight: 1.35, fontSize: "11px" }}>
        {t("auth.termsAgreementPrefix")}{" "}
        <Anchor component={Link} to="/terms" size="xs" c="dimmed" underline="always" style={{ fontSize: "11px" }}>
          {t("auth.termsOfService")}
        </Anchor>{" "}
        {t("auth.andText")}{" "}
        <Anchor component={Link} to="/privacy" size="xs" c="dimmed" underline="always" style={{ fontSize: "11px" }}>
          {t("auth.privacyPolicy")}
        </Anchor>{" "}
        {t("auth.termsAgreementSuffix")}
      </Text>
    </Stack>
  );
}
