import {
  Avatar,
  Badge,
  Center,
  Flex,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import type { UserResponse } from "../../../types/auth";

export function ProfileInfoCard() {
  const { t } = useTranslation();

  const { data: meResponse, isLoading } = useSWR<{ data: UserResponse }>(
    "/api/v1/auth/me",
  );

  const user = meResponse?.data;

  if (isLoading) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  if (!user) return null;

  const initials = `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Paper p="lg" radius="md" withBorder shadow="sm">
      <Flex
        direction={{ base: "column", sm: "row" }}
        align={{ base: "center", sm: "flex-start" }}
        gap="lg"
      >
        <Avatar size="xl" radius="xl" color="blue">
          {initials}
        </Avatar>

        <Stack gap="xs" style={{ flex: 1 }}>
          <Text size="xl" fw={700}>
            {user.fullName}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {/* Email */}
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {t("profile.email")}:
              </Text>
              <Text size="sm">{user.email || "-"}</Text>
              {user.email && (
                <Badge
                  size="xs"
                  variant="light"
                  color={user.emailVerified ? "green" : "gray"}
                  leftSection={
                    user.emailVerified ? (
                      <IconCheck size={10} />
                    ) : (
                      <IconX size={10} />
                    )
                  }
                >
                  {user.emailVerified
                    ? t("profile.verified")
                    : t("profile.notVerified")}
                </Badge>
              )}
            </Group>

            {/* Phone */}
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {t("profile.phone")}:
              </Text>
              <Text size="sm">{user.phoneNumber || "-"}</Text>
              {user.phoneNumber && (
                <Badge
                  size="xs"
                  variant="light"
                  color={user.phoneVerified ? "green" : "gray"}
                  leftSection={
                    user.phoneVerified ? (
                      <IconCheck size={10} />
                    ) : (
                      <IconX size={10} />
                    )
                  }
                >
                  {user.phoneVerified
                    ? t("profile.verified")
                    : t("profile.notVerified")}
                </Badge>
              )}
            </Group>

            {/* Role */}
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {t("profile.role")}:
              </Text>
              <Badge variant="light">{user.role || "USER"}</Badge>
            </Group>

            {/* Member since */}
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {t("profile.memberSince")}:
              </Text>
              <Text size="sm">{formatDate(user.createdAt)}</Text>
            </Group>

            {/* Last login */}
            {user.lastLoginAt && (
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  {t("profile.lastLogin")}:
                </Text>
                <Text size="sm">{formatDate(user.lastLoginAt)}</Text>
              </Group>
            )}
          </SimpleGrid>
        </Stack>
      </Flex>
    </Paper>
  );
}
