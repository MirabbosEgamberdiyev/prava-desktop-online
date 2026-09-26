import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  curriculumSwrKey,
  fetchCurriculumRemote,
  loadCurriculum,
  type CurriculumEntry,
  type CurriculumResource,
  type CurriculumResources,
} from "./curriculumCache";

/** SWR options: data lives in the SWR memory cache for the app session, never refetched on focus. */
const SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  dedupingInterval: 60 * 60 * 1000,
  shouldRetryOnError: false,
  keepPreviousData: true,
} as const;

export function useCurriculum<K extends CurriculumResource>(name: K) {
  const { data, error, isLoading, mutate } = useSWR<CurriculumEntry<CurriculumResources[K]>>(
    curriculumSwrKey(name),
    () => loadCurriculum(name),
    SWR_OPTIONS
  );
  const [refreshing, setRefreshing] = useState(false);

  /** Force a network refresh (Retry / Refresh button, F5). Keeps the saved copy on failure. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await fetchCurriculumRemote(name);
      await mutate(fresh, { revalidate: false });
      return true;
    } catch {
      if (!data) await mutate();
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [name, mutate, data]);

  return {
    data: data?.data,
    savedAt: data?.savedAt ?? null,
    fromCache: data?.fromCache ?? false,
    error: data ? null : error,
    isLoading: isLoading && !data,
    refreshing,
    refresh,
  };
}
