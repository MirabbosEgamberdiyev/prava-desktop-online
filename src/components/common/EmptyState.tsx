import { Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="md">
        {icon || (
          <ThemeIcon size={60} radius="xl" variant="light" color="gray">
            <IconInbox size={30} />
          </ThemeIcon>
        )}
        {title && (
          <Text size="lg" fw={600} c="dimmed">
            {title}
          </Text>
        )}
        {description && (
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            {description}
          </Text>
        )}
        {action}
      </Stack>
    </Center>
  );
}
