import useSWR from "swr";
import { useTranslation } from "react-i18next";
import type { TopicsResponse } from "../types";

export function useTopics() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useSWR<TopicsResponse>(
    "/api/v1/admin/topics/with-questions"
  );

  return {
    topics: data?.data ?? [],
    loading: isLoading,
    error: error ? t("topics.loadError") : null,
  };
}
