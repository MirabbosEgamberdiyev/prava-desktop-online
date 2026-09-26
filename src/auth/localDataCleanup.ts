/**
 * Local (on-device) personal data lifecycle: startup migrations, per-user clean-up on logout.
 * Principle: don't persist what isn't needed, scope per user, clear on logout.
 * Shared content (question bank, topics, tickets) is never touched here.
 */
import { dbClient } from "../database/dbClient";
import storageService from "../services/storageService";
import { STATS_CACHE_BASE_KEY, statsCacheKey } from "../utils/userScope";
import { AccountManager, readRememberMePreference } from "./accountManager";

export const LOGOUT_FLUSH_TIMEOUT_MS = 5000;

let startupMigrationsDone = false;

/** Idempotent; runs once per app start. No network, no IndexedDB. */
export function runLocalStorageMigrations(): void {
  if (startupMigrationsDone) return;
  startupMigrationsDone = true;
  AccountManager.migrateLegacyStorage();
  try {
    // Pre-scoping stats cache: belonged to whoever was logged in last — drop it.
    localStorage.removeItem(STATS_CACHE_BASE_KEY);
  } catch {
    // ignore
  }
}

/** Best-effort push of the user's pending outbox rows before the session ends (≤ timeoutMs). */
export async function flushOutboxBeforeLogout(timeoutMs = LOGOUT_FLUSH_TIMEOUT_MS): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  const flush = import("../sync/syncEngine")
    .then(({ syncEngine }) => syncEngine.flushOutbox())
    .then(() => undefined)
    .catch(() => undefined);
  try {
    await Promise.race([flush, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Explicit logout: removes this user's local personal data (IndexedDB user stores incl. outbox,
 * per-user localStorage progress + stats cache) and, when "remember me" is off, the
 * "accounts on this device" entry. Other users and guest data are untouched.
 */
export async function clearLocalUserData(userId: string | number | null | undefined): Promise<void> {
  if (userId === null || userId === undefined || userId === "") return;
  try {
    storageService.clearUserData(userId);
    localStorage.removeItem(statsCacheKey(userId));
  } catch {
    // ignore
  }
  if (!readRememberMePreference()) AccountManager.removeAccount(userId);
  await dbClient.clearUserData(userId).catch(() => {});
}
