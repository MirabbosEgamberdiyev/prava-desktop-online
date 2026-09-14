import {
  Card,
  Text,
  Group,
  Stack,
  Flex,
  Button,
  Divider,
  Progress,
  Badge,
} from "@mantine/core";
import {
  IconClock,
  IconQuestionMark,
  IconCheck,
  IconTrophy,
  IconPercentage,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../hooks/useLanguage";
import type { Ticket } from "../types";
import type { TicketStatus } from "../types";
import classes from "./TicketCard.module.css";
import type { LocalizedText } from "../../../types";

interface TicketStats {
  ticketId: number;
  ticketNumber: number;
  ticketName: LocalizedText;
  totalExams: number;
  passedExams: number;
  averageScore: number;
  bestScore?: number;
  lastAttemptDate?: string;
}

interface TicketCardProps {
  ticket: Ticket;
  onClick?: (ticket: Ticket) => void;
  stats?: TicketStats;
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function getTicketStatus(stats?: TicketStats): TicketStatus {
  if (!stats || stats.totalExams === 0) return "NOT_STARTED";
  if (stats.passedExams > 0) return "COMPLETED";
  return "IN_PROGRESS";
}

const statusColorMap: Record<TicketStatus, string> = {
  COMPLETED: "green",
  IN_PROGRESS: "yellow",
  NOT_STARTED: "gray",
};

const borderColorMap: Record<TicketStatus, string> = {
  COMPLETED: "var(--mantine-color-green-5)",
  IN_PROGRESS: "var(--mantine-color-yellow-5)",
  NOT_STARTED: "var(--mantine-color-gray-4)",
};

export function TicketCard({ ticket, onClick, stats }: TicketCardProps) {
  const { t } = useTranslation();
  const { localize } = useLanguage();

  const status = getTicketStatus(stats);
  const hasStats = stats && stats.totalExams > 0;
  const avgScore =
    hasStats && Number.isFinite(stats.averageScore)
      ? clamp(Math.round(stats.averageScore))
      : 0;
  const scoreColor =
    avgScore >= 70 ? "green" : avgScore >= 50 ? "yellow" : "red";
  const passRate = hasStats
    ? clamp(Math.round((stats.passedExams / stats.totalExams) * 100))
    : 0;

  return (
    <Card
      withBorder
      shadow="sm"
      p="md"
      radius="md"
      className={classes.card}
      style={{
        cursor: onClick ? "pointer" : "default",
        borderLeftColor: borderColorMap[status],
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.(ticket);
      }}
    >
      {/* Top section — flex: 1 to push button down */}
      <div style={{ flex: 1 }}>
        <Stack gap="sm">
          <Flex justify="space-between" align="flex-start" gap="sm">
            <Stack gap={4} style={{ flex: 1 }}>
              <Text fw={600} size="sm" lineClamp={2}>
                {localize(ticket.name)}
              </Text>
              <Badge size="sm" variant="light" color={statusColorMap[status]}>
                {status === "COMPLETED"
                  ? t("ticket.completed")
                  : status === "IN_PROGRESS"
                    ? t("ticket.inProgress")
                    : t("ticket.notStarted")}
              </Badge>
            </Stack>
            <div className={classes.badge}>#{ticket.ticketNumber}</div>
          </Flex>

          <Group gap="xs" wrap="wrap">
            <Flex align="center" gap={4}>
              <IconQuestionMark size={14} color="var(--mantine-color-blue-5)" />
              <Text size="xs" c="dimmed">
                {ticket.questionCount} {t("package.questions")}
              </Text>
            </Flex>
            <Flex align="center" gap={4}>
              <IconClock size={14} color="var(--mantine-color-orange-5)" />
              <Text size="xs" c="dimmed">
                {ticket.durationMinutes} {t("ticket.minutes")}
              </Text>
            </Flex>
            <Flex align="center" gap={4}>
              <IconCheck size={14} color="var(--mantine-color-green-5)" />
              <Text size="xs" c="dimmed">
                {ticket.passingScore}%
              </Text>
            </Flex>
          </Group>

          {/* Stats section — always visible */}
          <Divider variant="dashed" />
          <Stack gap={6}>
            <Group justify="space-between" gap="xs">
              <Group gap={4}>
                <IconTrophy size={14} color="var(--mantine-color-yellow-5)" />
                <Text size="xs" c="dimmed">
                  {t("ticket.attempts")}: {hasStats ? stats.totalExams : 0}
                </Text>
              </Group>
              <Badge
                size="sm"
                variant="light"
                color={hasStats && stats.passedExams > 0 ? "green" : "gray"}
              >
                {hasStats ? `${stats.passedExams}/${stats.totalExams}` : "0/0"}
              </Badge>
            </Group>
            <Group justify="space-between" gap="xs">
              <Group gap={4}>
                <IconPercentage size={14} color="var(--mantine-color-blue-5)" />
                <Text size="xs" c="dimmed">
                  {t("ticket.passRate")}
                </Text>
              </Group>
              <Text
                size="xs"
                fw={600}
                c={hasStats ? (passRate >= 50 ? "green" : "red") : "dimmed"}
              >
                {passRate}%
              </Text>
            </Group>

            {hasStats && stats.bestScore != null && (
              <Group justify="space-between" gap="xs">
                <Text size="xs" c="dimmed">
                  {t("ticket.bestScore")}
                </Text>
                <Text
                  size="xs"
                  fw={600}
                  c={clamp(Math.round(stats.bestScore)) >= 70 ? "green" : "red"}
                >
                  {clamp(Math.round(stats.bestScore))}%
                </Text>
              </Group>
            )}

            <Progress
              value={avgScore}
              color={hasStats ? scoreColor : "gray"}
              size="sm"
              radius="xl"
            />
          </Stack>
        </Stack>
      </div>

      {/* Bottom section — pinned to bottom */}
      <div
        style={{ marginTop: "auto", paddingTop: "var(--mantine-spacing-sm)" }}
      >
        <Divider variant="dashed" mb="sm" />
        <Button
          onClick={() => onClick?.(ticket)}
          radius="md"
          size="sm"
          fullWidth
          className={classes.startButton}
        >
          {hasStats ? t("ticket.continue") : t("ticket.start")}
        </Button>
      </div>
    </Card>
  );
}
