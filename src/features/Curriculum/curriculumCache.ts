/**
 * Offline cache for curriculum (learning material) responses.
 *
 * Shared, non-personal content → stored in the IndexedDB `sync_meta` store (never cleared on
 * logout, no schema change). Strategy (stale-while-revalidate):
 *   - saved copy younger than FRESH_MS → returned without any network request;
 *   - older copy → returned immediately, a background refresh updates it (and SWR);
 *   - no copy → network (throws if offline / failing, so the page shows an error + retry).
 */
import { mutate } from "swr";
import { dbClient } from "../../database/dbClient";
import { networkModeManager } from "../../sync/networkModeManager";
import { curriculumApi, type PracticalExamData, type RoadSign, type RoadMarking, type ExamCenter, type PracticalPenalty, type TrafficRule } from "../../api/curriculumApi";

export interface CurriculumResources {
  signs: RoadSign[];
  markings: RoadMarking[];
  centers: ExamCenter[];
  penalties: PracticalPenalty[];
  rules: TrafficRule[];
  practical: PracticalExamData;
}
export type CurriculumResource = keyof CurriculumResources;

export interface CurriculumEntry<T> {
  data: T;
  savedAt: number;
  fromCache: boolean;
}

export const CURRICULUM_RESOURCES: CurriculumResource[] = ["signs", "markings", "centers", "penalties", "rules", "practical"];
const FETCHERS: { [K in CurriculumResource]: () => Promise<CurriculumResources[K]> } = {
  signs: curriculumApi.getSigns,
  markings: curriculumApi.getMarkings,
  centers: curriculumApi.getExamCenters,
  penalties: curriculumApi.getPenalties,
  rules: curriculumApi.getRules,
  practical: curriculumApi.getPracticalExam,
};

/** 24h: curriculum changes rarely; revisits within a day never touch the network. */
export const FRESH_MS = 24 * 60 * 60 * 1000;
const META_PREFIX = "curriculum_cache_v1:";

export const curriculumSwrKey = (name: CurriculumResource) => `curriculum:${name}`;

function isEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === "object" && "exercises" in value) {
    const v = value as PracticalExamData;
    return v.exercises.length === 0 && v.penalties.length === 0;
  }
  return value == null;
}

const memory = new Map<CurriculumResource, CurriculumEntry<unknown>>();

export async function readCurriculumCache<K extends CurriculumResource>(
  name: K
): Promise<CurriculumEntry<CurriculumResources[K]> | null> {
  const hit = memory.get(name);
  if (hit) return hit as CurriculumEntry<CurriculumResources[K]>;
  try {
    const raw = await dbClient.getSyncMeta(META_PREFIX + name);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: CurriculumResources[K] };
    if (!parsed || typeof parsed.savedAt !== "number" || parsed.data == null) return null;
    const entry = { data: parsed.data, savedAt: parsed.savedAt, fromCache: true };
    memory.set(name, entry);
    return entry;
  } catch {
    return null;
  }
}

async function writeCache<K extends CurriculumResource>(name: K, data: CurriculumResources[K]): Promise<CurriculumEntry<CurriculumResources[K]>> {
  const entry = { data, savedAt: Date.now(), fromCache: false };
  memory.set(name, entry);
  try {
    await dbClient.setSyncMeta(META_PREFIX + name, JSON.stringify({ savedAt: entry.savedAt, data }));
  } catch {
    // quota / closed DB — memory copy still serves this session
  }
  return entry;
}

const inflight = new Map<CurriculumResource, Promise<CurriculumEntry<unknown>>>();

/** Network fetch + persist. Empty server answers never overwrite a non-empty saved copy. */
export function fetchCurriculumRemote<K extends CurriculumResource>(name: K): Promise<CurriculumEntry<CurriculumResources[K]>> {
  const running = inflight.get(name);
  if (running) return running as Promise<CurriculumEntry<CurriculumResources[K]>>;
  const p = (async () => {
    if (!networkModeManager.isOnlineAllowed()) throw new Error("offline");
    const data = (await FETCHERS[name]()) as CurriculumResources[K];
    if (isEmpty(data)) {
      const cached = await readCurriculumCache(name);
      if (cached && !isEmpty(cached.data)) return cached;
    }
    return writeCache(name, data);
  })();
  inflight.set(name, p as Promise<CurriculumEntry<unknown>>);
  p.finally(() => inflight.delete(name)).catch(() => {});
  return p;
}

/** SWR fetcher (see strategy above). */
export async function loadCurriculum<K extends CurriculumResource>(name: K): Promise<CurriculumEntry<CurriculumResources[K]>> {
  const cached = await readCurriculumCache(name);
  if (cached) {
    if (Date.now() - cached.savedAt > FRESH_MS && networkModeManager.isOnlineAllowed()) {
      fetchCurriculumRemote(name)
        .then((fresh) => mutate(curriculumSwrKey(name), fresh, { revalidate: false }))
        .catch(() => {});
    }
    return cached;
  }
  return fetchCurriculumRemote(name);
}

/** Test hook. */
export function __resetCurriculumMemory(): void {
  memory.clear();
  inflight.clear();
}
