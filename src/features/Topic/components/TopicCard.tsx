import {
  Card,
  Text,
  Group,
  Badge,
  Button,
  ThemeIcon,
  Stack,
} from "@mantine/core";
import { IconBook2, IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../../hooks/useLanguage";
import type { Topic } from "../types";
import classes from "./TopicCard.module.css";

interface TopicCardProps {
  topic: Topic;
}

const TOPIC_COLORS = [
  "blue",
  "green",
  "orange",
  "grape",
  "cyan",
  "teal",
  "pink",
  "indigo",
  "red",
  "violet",
];

export function TopicCard({ topic }: TopicCardProps) {
  const { t } = useTranslation();
  const { localize } = useLanguage();
  const navigate = useNavigate();

  const color = TOPIC_COLORS[topic.id % TOPIC_COLORS.length];

  return (
    <Card
      withBorder
      shadow="sm"
      p="lg"
      radius="md"
      className={classes.card}
    >
      <Stack gap="sm">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" color={color} variant="light">
            <IconBook2 size={20} />
          </ThemeIcon>
          <Text fw={700} size="md" style={{ flex: 1 }} lineClamp={1}>
            {localize(topic.name)}
          </Text>
        </Group>

        {topic.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {localize(topic.description)}
          </Text>
        )}

        <Group gap="xs">
          <Badge variant="light" color={color} size="sm">
            {t("topics.questionCount", { count: topic.questionCount })}
          </Badge>
        </Group>

        <Button
          variant="light"
          color={color}
          radius="md"
          size="sm"
          fullWidth
          rightSection={<IconArrowRight size={16} />}
          onClick={() => navigate(`/topics/${topic.code}`)}
        >
          {t("topics.explore")}
        </Button>
      </Stack>
    </Card>
  );
}
