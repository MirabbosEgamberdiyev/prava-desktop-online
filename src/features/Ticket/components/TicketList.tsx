import {
  Alert,
  Button,
  Center,
  Grid,
  Group,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconTicket } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../../components/common/EmptyState";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { useTickets } from "../hooks/useTickets";
import { TicketCard } from "./TicketCard";
import { TopicFilter } from "../../Topic/components/TopicFilter";
import type { Ticket } from "../types";
import type { LocalizedText } from "../../../types";

interface TicketStatItem {
  ticketId: number;
  ticketNumber: number;
  ticketName: LocalizedText;
  totalExams: number;
  passedExams: number;
  averageScore: number;
  bestScore?: number;
  lastAttemptDate?: string;
}

interface StatsResponse {
  data: {
    ticketStats?: TicketStatItem[];
  };
}

export function TicketList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const { tickets, loading, error, totalPages, mutate } = useTickets({
    page: page,
    size: 20,
    topicId: selectedTopicId ? Number(selectedTopicId) : null,
  });

  // Fetch ticket stats for all tickets
  const { data: statsResponse } = useSWR<StatsResponse>(
    "/api/v2/my-statistics",
  );

  // Memoize the stats map
  const ticketStatsMap = useMemo(() => {
    const map = new Map<number, TicketStatItem>();
    if (statsResponse?.data?.ticketStats) {
      for (const stat of statsResponse.data.ticketStats) {
        map.set(stat.ticketId, stat);
      }
    }
    return map;
  }, [statsResponse]);

  const handleTicketClick = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  const handleTopicChange = (value: string | null) => {
    setSelectedTopicId(value);
    setPage(0);
  };

  if (loading) {
    return (
      <>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Title order={2}>{t("ticket.title")}</Title>
          <TopicFilter
            value={selectedTopicId}
            onChange={handleTopicChange}
            valueKey="id"
          />
        </Group>
        <Grid gutter="md">
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4, lg: 4, xl: 3 }}>
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Skeleton height={20} width="70%" radius="sm" />
                  <Skeleton height={14} width="40%" radius="sm" />
                  <Skeleton height={10} width="100%" radius="sm" />
                  <Skeleton height={10} width="100%" radius="sm" />
                  <Skeleton height={10} width="100%" radius="sm" />
                  <Skeleton height={8} width="100%" radius="xl" />
                  <Skeleton height={36} width="100%" radius="md" />
                </Stack>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>
      </>
    );
  }

  if (error) {
    return (
      <Center h="50vh">
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title={t("common.error")}
        >
          {error}
          <Button size="xs" variant="light" mt="sm" onClick={() => mutate?.()}>
            {t("common.retry")}
          </Button>
        </Alert>
      </Center>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Title order={2}>{t("ticket.title")}</Title>
        <TopicFilter
          value={selectedTopicId}
          onChange={handleTopicChange}
          valueKey="id"
        />
      </Group>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<IconTicket size={48} color="gray" style={{ opacity: 0.5 }} />}
          title={t("ticket.notFound")}
        />
      ) : (
        <>
          <Grid gutter="md">
            {tickets.map((ticket) => (
              <Grid.Col
                key={ticket.id}
                span={{ base: 12, sm: 6, md: 4, lg: 4, xl: 3 }}
              >
                <TicketCard
                  ticket={ticket}
                  onClick={handleTicketClick}
                  stats={ticketStatsMap.get(ticket.id)}
                />
              </Grid.Col>
            ))}
          </Grid>
          <Pagination
            mt="md"
            value={page + 1}
            onChange={(p) => setPage(p - 1)}
            total={totalPages}
          />
        </>
      )}
    </>
  );
}
