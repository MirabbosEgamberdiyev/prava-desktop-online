import { useState } from "react";
import {
  SimpleGrid,
  Skeleton,
  Center,
  Title,
  Text,
  Paper,
  Stack,
  TextInput,
  Group,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../hooks/useLanguage";
import { useTopics } from "../hooks/useTopics";
import { TopicCard } from "./TopicCard";

export function TopicList() {
  const { t } = useTranslation();
  const { localize } = useLanguage();
  const { topics, loading, error } = useTopics();
  const [search, setSearch] = useState("");

  const filteredTopics = topics.filter((topic) =>
    localize(topic.name).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <>
        <Title order={2} mb="md">
          {t("topics.title")}
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {Array.from({ length: 6 }).map((_, i) => (
            <Paper key={i} withBorder p="md" radius="md">
              <Stack gap="sm">
                <Skeleton height={40} width={40} circle />
                <Skeleton height={20} width="70%" radius="sm" />
                <Skeleton height={14} width="50%" radius="sm" />
                <Skeleton height={36} radius="sm" />
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </>
    );
  }

  if (error) {
    return (
      <Center h="50vh">
        <Text c="red">{t("topics.loadError")}</Text>
      </Center>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Title order={2}>{t("topics.title")}</Title>
        <TextInput
          placeholder={t("topics.search")}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          radius="md"
          w={{ base: "100%", sm: 280 }}
        />
      </Group>

      {filteredTopics.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed">{t("topics.notFound")}</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredTopics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
