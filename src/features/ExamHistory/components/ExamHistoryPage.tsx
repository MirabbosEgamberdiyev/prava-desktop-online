import {
  Badge,
  Flex,
  Group,
  Pagination,
  Paper,
  Progress,
  ScrollArea,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconClock, IconHistory } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { useLanguage } from "../../../hooks/useLanguage";
import { EmptyState } from "../../../components/common/EmptyState";
import type { ExamHistoryResponse, ExamHistoryItem, HistoryFilterStatus } from "../types";
import { getApiStatus } from "../types";

export function ExamHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang, localize } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const [filter, setFilter] = useState<HistoryFilterStatus>(
    (searchParams.get("filter") as HistoryFilterStatus) ?? "ALL",
  );

  const apiStatus = getApiStatus(filter);
  const apiUrl =
    apiStatus === null
      ? `/api/v2/exams/history?page=${page}&size=20&sortBy=startedAt&direction=DESC&lang=${lang}`
      : `/api/v2/exams/history/status/${apiStatus}?page=${page}&size=20&lang=${lang}`;

  const { data: historyResponse, isLoading } =
    useSWR<ExamHistoryResponse>(apiUrl);

  const history = historyResponse?.data;

  // Client-side filter for COMPLETED (passed only) and FAILED (not passed)
  const filteredContent = useMemo(() => {
    if (!history?.content || !Array.isArray(history.content)) return [];
    if (filter === "COMPLETED") return history.content.filter((item) => item && (item.isPassed ?? item.passed));
    if (filter === "FAILED") return history.content.filter((item) => item && !(item.isPassed ?? item.passed));
    return history.content.filter(Boolean);
  }, [history?.content, filter]);

  const filterOptions = [
    { label: t("history.all"), value: "ALL" },
    { label: t("history.completed"), value: "COMPLETED" },
    { label: t("history.failed"), value: "FAILED" },
    { label: t("history.inProgress"), value: "IN_PROGRESS" },
    { label: t("history.abandoned"), value: "ABANDONED" },
  ];

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p === 0) next.delete("page");
      else next.set("page", String(p));
      return next;
    }, { replace: true });
  };

  const handleFilterChange = (value: string) => {
    const newFilter = value as HistoryFilterStatus;
    setFilter(newFilter);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("page");
      if (newFilter === "ALL") next.delete("filter");
      else next.set("filter", newFilter);
      return next;
    }, { replace: true });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || !Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (item: ExamHistoryItem) => {
    if (item.status === "IN_PROGRESS") return "blue";
    if (item.status === "ABANDONED") return "gray";
    if (item.status === "EXPIRED") return "orange";
    return (item.isPassed ?? item.passed) ? "green" : "red";
  };

  const getStatusLabel = (item: ExamHistoryItem) => {
    if (item.status === "IN_PROGRESS") return t("history.inProgress");
    if (item.status === "ABANDONED") return t("history.abandoned");
    if (item.status === "EXPIRED") return t("history.expired");
    return (item.isPassed ?? item.passed) ? t("history.passedLabel") : t("history.failedLabel");
  };

  const getExamName = (item: ExamHistoryItem) => {
    if (item.packageName) return localize(item.packageName);
    if (item.ticketName)
      return `${localize(item.ticketName)} #${item.ticketNumber}`;
    if (item.isMarathonMode || item.isMarathon) return t("marathon.title", "Marafon");
    return t("history.exam", "Imtihon");
  };

  const totalPages = history?.totalPages ?? 0;

  return (
    <>
      <Title order={2} mb="md">
        {t("history.title")}
      </Title>

      <ScrollArea type="auto">
        <SegmentedControl
          value={filter}
          onChange={handleFilterChange}
          data={filterOptions}
          mb="lg"
          fullWidth
          size="sm"
          radius="md"
        />
      </ScrollArea>

      {isLoading && (
        <Stack gap="sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <Paper key={i} p="md" radius="md" withBorder shadow="sm">
              <Flex
                justify="space-between"
                align="center"
                gap="sm"
              >
                <Stack gap={4} style={{ flex: 1 }}>
                  <Skeleton height={18} width="50%" radius="sm" />
                  <Skeleton height={12} width="30%" radius="sm" />
                </Stack>
                <Stack gap={2} style={{ width: 200 }}>
                  <Skeleton height={16} width="100%" radius="xl" />
                  <Skeleton height={10} width="60%" radius="sm" ml="auto" />
                </Stack>
              </Flex>
            </Paper>
          ))}
        </Stack>
      )}

      {!isLoading && filteredContent.length === 0 && (
        <EmptyState
          icon={<IconHistory size={48} color="gray" style={{ opacity: 0.5 }} />}
          title={t("history.empty")}
        />
      )}

      {!isLoading && filteredContent.length > 0 && (
        <Stack gap="sm">
          {filteredContent.map((item) => (
            <Paper
              key={item.sessionId}
              p="md"
              radius="md"
              withBorder
              shadow="sm"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/exam/result/${item.sessionId}`)}
            >
              <Flex
                justify="space-between"
                align={{ base: "flex-start", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
                gap="sm"
              >
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text fw={600}>{getExamName(item)}</Text>
                    <Badge
                      size="sm"
                      color={getStatusColor(item)}
                      variant="light"
                    >
                      {getStatusLabel(item)}
                    </Badge>
                  </Group>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      {formatDate(item.startedAt)}
                    </Text>
                    {((item.durationSeconds ?? item.totalTimeSpentSeconds ?? 0) > 0) && (
                      <Flex align="center" gap={4}>
                        <IconClock size={12} color="gray" />
                        <Text size="xs" c="dimmed">
                          {formatDuration(item.durationSeconds ?? item.totalTimeSpentSeconds ?? 0)}
                        </Text>
                      </Flex>
                    )}
                  </Group>
                </Stack>

                <Flex
                  align="center"
                  gap="md"
                  w={{ base: "100%", sm: 200 }}
                  justify="flex-end"
                >
                  <Stack gap={2} style={{ flex: 1, minWidth: 100 }}>
                    <Progress
                      value={item.percentage}
                      size="lg"
                      radius="xl"
                      color={getStatusColor(item)}
                    />
                    <Text size="xs" c="dimmed" ta="right">
                      {item.correctCount ?? item.correctAnswers ?? 0}/{item.totalQuestions} (
                      {item.percentage.toFixed(0)}%)
                    </Text>
                  </Stack>
                </Flex>
              </Flex>
            </Paper>
          ))}

          {totalPages > 1 && (
            <Flex justify="center" mt="md">
              <Pagination
                value={page + 1}
                onChange={(p) => setPage(p - 1)}
                total={totalPages}
                withEdges
              />
            </Flex>
          )}
        </Stack>
      )}
    </>
  );
}
