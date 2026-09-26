/**
 * Question-image preload queue (offline media cache warm-up).
 *
 *  - Background: after an offline bundle sync (or shortly after startup) ALL question images
 *    are cached one by one in idle time, throttled, skipping images already cached. Because
 *    "already cached" is checked per item, an interrupted run simply resumes next time.
 *  - Priority: the exam view pushes the next 3 questions' images to the FRONT of the queue and
 *    they run immediately (not idle-scheduled), also warming the in-memory object URL.
 *  - Never blocks the UI: every item is async, background items wait for requestIdleCallback.
 *
 * `diagnoseQuestionMedia()` reports missing / broken images (also exposed in dev builds as
 * `window.__pravaMediaDiagnostics()`).
 */
import { offlineMediaManager } from "./offlineMediaManager";
import { networkModeManager } from "../sync/networkModeManager";
import { questionRepository } from "../database/repositories/questionRepository";

export interface PreloadDeps {
  isCached(path: string): Promise<boolean>;
  cache(path: string): Promise<boolean>;
  /** False → network not allowed now; background work pauses (priority items still check the cache). */
  canFetch(): boolean;
  /** Schedule low-priority work (default: requestIdleCallback with timeout fallback). */
  scheduleIdle(cb: () => void): void;
  /** Pause between background items (ms). */
  throttleMs: number;
  /** Parallel workers (priority items are allowed one extra slot). */
  concurrency: number;
}

export interface PreloadStats {
  pending: number;
  cached: number;
  skipped: number;
  failed: number;
  running: number;
}

export class MediaPreloadQueue {
  private queue: string[] = [];
  private queued = new Set<string>();
  private priority = new Set<string>();
  private handled = new Set<string>();
  private failedSet = new Set<string>();
  private running = 0;
  private stats = { cached: 0, skipped: 0, failed: 0 };
  private waiters: Array<() => void> = [];
  private stopped = false;
  private readonly deps: PreloadDeps;

  constructor(deps: PreloadDeps) {
    this.deps = deps;
  }

  /** Add paths (deduplicated). `priority` → front of the queue, processed right away. */
  enqueue(paths: Iterable<string | null | undefined>, priority = false): void {
    const fresh: string[] = [];
    for (const p of paths) {
      if (!p) continue;
      if (this.handled.has(p)) continue;
      if (this.failedSet.has(p) && !priority) continue;
      if (this.queued.has(p)) {
        if (priority && !this.priority.has(p)) {
          this.priority.add(p);
          this.queue.splice(this.queue.indexOf(p), 1);
          fresh.push(p);
        }
        continue;
      }
      this.queued.add(p);
      if (priority) this.priority.add(p);
      fresh.push(p);
    }
    if (priority) this.queue.unshift(...fresh);
    else this.queue.push(...fresh);
    this.stopped = false;
    this.pump();
  }

  /** Stop background processing (queued items are kept; `resume()` continues). */
  pause(): void {
    this.stopped = true;
  }

  resume(): void {
    this.stopped = false;
    this.pump();
  }

  /** Failed images get another chance (e.g. after the next successful sync). */
  resetFailed(): void {
    this.failedSet.clear();
  }

  getStats(): PreloadStats {
    return { pending: this.queue.length, running: this.running, ...this.stats };
  }

  /** Resolves when the queue is empty and nothing is running (tests / diagnostics). */
  whenIdle(): Promise<void> {
    if (this.isIdle()) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  /** Nothing running and nothing runnable (empty, or only background work blocked by pause/offline). */
  private isIdle(): boolean {
    if (this.running > 0) return false;
    if (this.queue.length === 0) return true;
    const blocked = this.stopped || !this.deps.canFetch();
    return blocked && this.queue.every((p) => !this.priority.has(p));
  }

  private settleIfIdle(): void {
    if (this.isIdle()) {
      const w = this.waiters.splice(0);
      w.forEach((fn) => fn());
    }
  }

  private pump(): void {
    while (this.queue.length > 0) {
      const next = this.queue[0];
      const isPri = this.priority.has(next);
      const limit = this.deps.concurrency + (isPri ? 1 : 0);
      if (this.running >= limit) break;
      if (!isPri && (this.stopped || !this.deps.canFetch())) break;
      this.queue.shift();
      this.queued.delete(next);
      this.running++;
      const run = () => {
        void this.process(next).finally(() => {
          this.running--;
          this.priority.delete(next);
          if (isPri || this.deps.throttleMs <= 0) this.pump();
          else setTimeout(() => this.pump(), this.deps.throttleMs);
          this.settleIfIdle();
        });
      };
      if (isPri) run();
      else this.deps.scheduleIdle(run);
    }
    this.settleIfIdle();
  }

  private async process(path: string): Promise<void> {
    try {
      if (await this.deps.isCached(path)) {
        this.stats.skipped++;
        this.handled.add(path);
        return;
      }
      if (!this.deps.canFetch()) {
        // Can't download now — let a later run retry it.
        return;
      }
      const ok = await this.deps.cache(path);
      if (ok) {
        this.stats.cached++;
        this.handled.add(path);
      } else {
        this.stats.failed++;
        this.failedSet.add(path);
      }
    } catch {
      this.stats.failed++;
      this.failedSet.add(path);
    }
  }
}

function defaultScheduleIdle(cb: () => void): void {
  const w = typeof window !== "undefined" ? (window as Window & typeof globalThis) : undefined;
  if (w && typeof w.requestIdleCallback === "function") w.requestIdleCallback(() => cb(), { timeout: 3000 });
  else setTimeout(cb, 50);
}

export const mediaPreloadQueue = new MediaPreloadQueue({
  isCached: (p) => offlineMediaManager.isCached(p),
  cache: (p) => offlineMediaManager.cacheImage(p),
  canFetch: () =>
    !networkModeManager.isOfflineOnly() && (typeof navigator === "undefined" || navigator.onLine !== false),
  scheduleIdle: defaultScheduleIdle,
  throttleMs: 120,
  concurrency: 2,
});

/**
 * Exam view: make the next questions' images instant. Cached → decode the object URL into
 * memory now; not cached → download first in line.
 */
export function prioritizeQuestionImages(paths: Array<string | null | undefined>): void {
  const list = paths.filter((p): p is string => !!p);
  if (list.length === 0) return;
  mediaPreloadQueue.enqueue(list, true);
  for (const p of list) {
    if (!offlineMediaManager.peekLocalImageUrl(p)) {
      offlineMediaManager
        .getLocalImageUrl(p)
        .then((url) => {
          if (url && typeof Image !== "undefined") {
            const img = new Image();
            img.decoding = "async";
            img.src = url;
          }
        })
        .catch(() => {});
    }
  }
}

let backgroundRunning = false;

/** Queue every question image for background caching. Safe to call repeatedly. */
export async function startBackgroundMediaPreload(): Promise<void> {
  if (backgroundRunning) return;
  backgroundRunning = true;
  try {
    const all = await questionRepository.getAllQuestions();
    const paths = all.map((q) => q.image_url).filter((p): p is string => !!p);
    mediaPreloadQueue.resetFailed();
    mediaPreloadQueue.enqueue(paths);
  } catch {
    // DB not ready yet — the next sync event retries
  } finally {
    backgroundRunning = false;
  }
}

export interface MediaDiagnostics {
  total: number;
  ok: number;
  missing: number;
  broken: number;
  missingSample: string[];
  brokenSample: string[];
  queue: PreloadStats;
}

/** Dev/diagnostic: how many question images are missing or broken in the local cache. */
export async function diagnoseQuestionMedia(): Promise<MediaDiagnostics> {
  const all = await questionRepository.getAllQuestions();
  const paths = Array.from(new Set(all.map((q) => q.image_url).filter((p): p is string => !!p)));
  const result: MediaDiagnostics = {
    total: paths.length,
    ok: 0,
    missing: 0,
    broken: 0,
    missingSample: [],
    brokenSample: [],
    queue: mediaPreloadQueue.getStats(),
  };
  for (const p of paths) {
    const state = await offlineMediaManager.inspectCachedImage(p);
    if (state === "ok") result.ok++;
    else if (state === "missing") {
      result.missing++;
      if (result.missingSample.length < 20) result.missingSample.push(p);
    } else {
      result.broken++;
      if (result.brokenSample.length < 20) result.brokenSample.push(p);
    }
  }
  return result;
}

let installed = false;

/** Start background preload after each successful sync (and once shortly after startup). */
export function installAutoMediaPreload(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const soon = (ms: number) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => void startBackgroundMediaPreload(), ms);
  };
  window.addEventListener("sync-status-changed", (e: Event) => {
    const d = (e as CustomEvent<{ state?: string; isRunning?: boolean }>).detail;
    if (d && d.state === "IDLE" && !d.isRunning) soon(3000);
  });
  window.addEventListener("online", () => mediaPreloadQueue.resume());
  soon(20000);
  if (import.meta.env?.DEV) {
    (window as unknown as Record<string, unknown>).__pravaMediaDiagnostics = diagnoseQuestionMedia;
  }
}
