import { Group, Text, Transition } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface CapsLockWarningProps {
  active: boolean;
}

export default function CapsLockWarning({ active }: CapsLockWarningProps) {
  const { t } = useTranslation();

  return (
    <Transition mounted={active} transition="fade" duration={150}>
      {(styles) => (
        <Group gap={6} mt={6} align="center" style={styles}>
          <IconAlertTriangle
            size={14}
            style={{ color: "var(--mantine-color-orange-6)", flexShrink: 0 }}
          />
          <Text size="xs" c="orange.7" fw={500}>
            {t("auth.capsLockActive")}
          </Text>
        </Group>
      )}
    </Transition>
  );
}
