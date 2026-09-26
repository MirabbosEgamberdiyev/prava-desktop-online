/**
 * User data scope for locally stored progress (wrong answers, saved questions,
 * exam history, ticket stats, ...).
 *
 * Guests (not logged in) get their own `"guest"` namespace. Previously pages fell
 * back to `userId = 1`, which mixed guest data with the real account whose id is 1.
 */
import Cookies from "js-cookie";

export const GUEST_USER_KEY = "guest" as const;

export type UserScopeId = number | typeof GUEST_USER_KEY;

export function resolveUserScopeId(user?: { id?: unknown } | null): UserScopeId {
  const n = Number(user?.id);
  return Number.isFinite(n) && n > 0 ? n : GUEST_USER_KEY;
}

export function isGuestScope(id: UserScopeId | null | undefined): boolean {
  return id === undefined || id === null || id === GUEST_USER_KEY;
}

/** Id of the logged-in user (from the `userData` cookie), or null for guests. */
export function getActiveUserId(): string | number | null {
  try {
    const raw = Cookies.get("userData");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Canonical owner string for a user id: `"42"` for a real account, `"guest"` for
 * null / undefined / "guest" / invalid ids. Used as the IndexedDB `owner` field and
 * in per-user localStorage keys, so 42 and "42" map to the same owner.
 */
export function ownerOf(userId: unknown): string {
  if (userId === undefined || userId === null || userId === "" || userId === GUEST_USER_KEY) return GUEST_USER_KEY;
  if (typeof userId === "number") return Number.isFinite(userId) && userId > 0 ? String(userId) : GUEST_USER_KEY;
  const s = String(userId).trim();
  return s ? s : GUEST_USER_KEY;
}

/** Per-user localStorage key: `${base}_u42` / `${base}_guest`. */
export function scopedStorageKey(baseKey: string, userId: unknown): string {
  const owner = ownerOf(userId);
  return owner === GUEST_USER_KEY ? `${baseKey}_guest` : `${baseKey}_u${owner}`;
}

/** Personal statistics cache (desktopAdapter.getFullStats) — base key; the real key is per user. */
export const STATS_CACHE_BASE_KEY = "prava_cache_stats_v1";

/** `prava_cache_stats_v1_u42` / `_guest`. The unscoped legacy key is removed on startup. */
export function statsCacheKey(userId: unknown = getActiveUserId()): string {
  return scopedStorageKey(STATS_CACHE_BASE_KEY, userId);
}
