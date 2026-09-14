import useSWR from "swr";
import { useTranslation } from "react-i18next";
import type { TicketsResponse } from "../types";

interface UseTicketsOptions {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "ASC" | "DESC";
  topicId?: number | null;
}

export function useTickets(options: UseTicketsOptions = {}) {
  const {
    page = 0,
    size = 20,
    sortBy = "ticketNumber",
    direction = "ASC",
    topicId = null,
  } = options;

  const { i18n } = useTranslation();

  // API endpoint - til o'zgarganda qayta so'rov yuboriladi
  const url = topicId
    ? `/api/v2/tickets/topic/${topicId}?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}&lang=${i18n.language}`
    : `/api/v2/tickets?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}&lang=${i18n.language}`;

  const { data, isLoading, error, mutate } = useSWR<TicketsResponse>(url);

  return {
    tickets: data?.data?.content ?? [],
    loading: isLoading,
    error: error ? i18n.t("ticket.loadError") : null,
    totalPages: data?.data?.totalPages ?? 0,
    totalElements: data?.data?.totalElements ?? 0,
    mutate,
  };
}
