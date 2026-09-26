import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

class LocalStorageMock {
  store: Record<string, string> = {};
  get length() {
    return Object.keys(this.store).length;
  }
  key(i: number) {
    return Object.keys(this.store)[i] ?? null;
  }
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return key in this.store ? this.store[key] : null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

const g = globalThis as any;
if (typeof g.localStorage === "undefined") g.localStorage = new LocalStorageMock();
if (typeof g.window === "undefined") g.window = { dispatchEvent: () => {} };
if (typeof g.document === "undefined") g.document = { cookie: "" };

function loginAs(id: number | null) {
  g.document.cookie = id === null ? "" : `userData=${encodeURIComponent(JSON.stringify({ id }))}`;
}

import {
  AccountManager,
  ACCOUNTS_STORAGE_KEY,
  LEGACY_SAVED_IDENTIFIER_KEY,
  maskEmail,
  maskPhone,
  formatDisplayName,
} from "../src/auth/accountManager";
import {
  dbClient,
  CONTENT_STORES,
  GUEST_OWNER,
  LEGACY_OWNER,
  USER_DATA_STORES,
  isOwnedBy,
  legacyRowOwner,
  ownerKeyBounds,
  planLegacyClaim,
} from "../src/database/dbClient";
import { ownerOf, scopedStorageKey, statsCacheKey, STATS_CACHE_BASE_KEY } from "../src/utils/userScope";
import { clearLocalUserData, runLocalStorageMigrations } from "../src/auth/localDataCleanup";
import { OutboxQueue } from "../src/sync/outboxQueue";
import { syncEngine } from "../src/sync/syncEngine";
import { networkHeartbeat } from "../src/sync/networkHeartbeat";
import type { User } from "../src/types";

const user = (over: Partial<User> = {}): User =>
  ({
    id: 42,
    fullName: "Ali Valiyev",
    firstName: "Ali",
    lastName: "Valiyev",
    phoneNumber: "+998901234567",
    email: "ali.valiyev@gmail.com",
    role: "USER",
    ...over,
  }) as unknown as User;

beforeEach(() => {
  localStorage.clear();
  loginAs(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── P0-1: saved accounts ──────────────────────────────────────────────────────

describe("AccountManager — no tokens / PII on the device", () => {
  it("masks identifiers and names", () => {
    expect(maskPhone("+998901234567")).toBe("+998 ** *** ** 67");
    expect(maskEmail("ali.valiyev@gmail.com")).toBe("a***@gmail.com");
    expect(formatDisplayName("Ali", "Valiyev")).toBe("Ali V.");
    expect(maskPhone("12")).toBe("");
    expect(maskEmail("not-an-email")).toBe("");
  });

  it("stores only id, displayName, maskedIdentifier, lastUsedAt", () => {
    AccountManager.saveAccount(user());
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY)!;
    const [entry] = JSON.parse(raw);
    expect(Object.keys(entry).sort()).toEqual(["displayName", "id", "lastUsedAt", "maskedIdentifier"]);
    expect(entry.displayName).toBe("Ali V.");
    expect(entry.maskedIdentifier).toBe("+998 ** *** ** 67");
    expect(raw).not.toContain("901234567");
    expect(raw).not.toContain("valiyev@");
    expect(raw).not.toContain("Valiyev");
    expect(raw).not.toMatch(/token|role|USER/i);
  });

  it("falls back to a masked email when there is no phone", () => {
    AccountManager.saveAccount(user({ phoneNumber: undefined }));
    expect(AccountManager.getSavedAccounts()[0].maskedIdentifier).toBe("a***@gmail.com");
  });

  it("removeAccount removes only that entry", () => {
    AccountManager.saveAccount(user({ id: 1 }));
    AccountManager.saveAccount(user({ id: 2 }));
    AccountManager.removeAccount(1);
    expect(AccountManager.getSavedAccounts().map((a) => a.id)).toEqual([2]);
  });

  it("migration strips tokens / phone / email / role from legacy entries and the saved identifier", () => {
    localStorage.setItem(LEGACY_SAVED_IDENTIFIER_KEY, "+998901234567");
    localStorage.setItem(
      ACCOUNTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 7,
          fullName: "Vali Aliyev",
          phone: "+998931112233",
          email: "vali@mail.uz",
          role: "ADMIN",
          avatarUrl: "https://x/y.png",
          accessToken: "eyJhbGciOiJIUzI1NiJ9.a.b",
          refreshToken: "refresh-secret",
          lastActiveAt: 1000,
        },
      ])
    );

    AccountManager.migrateLegacyStorage();

    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY)!;
    expect(raw).not.toMatch(/accessToken|refreshToken|eyJ|refresh-secret|ADMIN|avatar|931112233|vali@/);
    expect(JSON.parse(raw)).toEqual([
      { id: 7, displayName: "Vali A.", maskedIdentifier: "+998 ** *** ** 33", lastUsedAt: 1000 },
    ]);
    expect(localStorage.getItem(LEGACY_SAVED_IDENTIFIER_KEY)).toBeNull();
  });

  it("migration is idempotent (no rewrite once clean)", () => {
    AccountManager.saveAccount(user());
    const before = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const spy = vi.spyOn(localStorage, "setItem");
    AccountManager.migrateLegacyStorage();
    AccountManager.migrateLegacyStorage();
    expect(spy).not.toHaveBeenCalledWith(ACCOUNTS_STORAGE_KEY, expect.anything());
    expect(localStorage.getItem(ACCOUNTS_STORAGE_KEY)).toBe(before);
  });
});

// ── P1-2: IndexedDB user scoping (pure helpers) ──────────────────────────────────

/** IndexedDB key ordering (numbers < strings < arrays; arrays compared element-wise). */
function cmp(a: unknown, b: unknown): number {
  const rank = (k: unknown) => (typeof k === "number" ? 1 : typeof k === "string" ? 3 : Array.isArray(k) ? 5 : 0);
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const c = cmp(a[i], b[i]);
      if (c !== 0) return c;
    }
    return a.length - b.length;
  }
  return (a as any) < (b as any) ? -1 : (a as any) > (b as any) ? 1 : 0;
}
const inRange = (key: unknown[], owner: string) => {
  const [lo, hi] = ownerKeyBounds(owner);
  return cmp(key, lo) >= 0 && cmp(key, hi) <= 0;
};

describe("dbClient user scoping", () => {
  it("canonical owner: 42 and '42' are the same user; null/guest → guest", () => {
    expect(ownerOf(42)).toBe("42");
    expect(ownerOf("42")).toBe("42");
    expect(ownerOf(null)).toBe(GUEST_OWNER);
    expect(ownerOf(undefined)).toBe(GUEST_OWNER);
    expect(ownerOf("guest")).toBe(GUEST_OWNER);
    expect(ownerOf(0)).toBe(GUEST_OWNER);
  });

  it("compound key range of user A contains only A's rows", () => {
    expect(inRange(["1", 5], "1")).toBe(true);
    expect(inRange(["1", "ticket_3"], "1")).toBe(true);
    expect(inRange(["10", 5], "1")).toBe(false); // prefix-lookalike owner
    expect(inRange(["2", 5], "1")).toBe(false);
    expect(inRange([LEGACY_OWNER, 5], "1")).toBe(false);
    expect(inRange([GUEST_OWNER, 5], "1")).toBe(false);
    expect(inRange([LEGACY_OWNER, 5], LEGACY_OWNER)).toBe(true);
  });

  it("reads are strict: A's rows invisible to B, legacy (null user) rows invisible to everyone", () => {
    const rowA = { owner: "1" };
    const legacy = { owner: legacyRowOwner({ user_id: null }) };
    expect(isOwnedBy(rowA, "1")).toBe(true);
    expect(isOwnedBy(rowA, "2")).toBe(false);
    expect(isOwnedBy(legacy, "1")).toBe(false);
    expect(isOwnedBy(legacy, GUEST_OWNER)).toBe(false);
    expect(isOwnedBy({}, "1")).toBe(false);
  });

  it("v3 migration assigns owners: null user_id → legacy, ids → canonical owner", () => {
    expect(legacyRowOwner({ user_id: null })).toBe(LEGACY_OWNER);
    expect(legacyRowOwner({})).toBe(LEGACY_OWNER);
    expect(legacyRowOwner({ user_id: 5 })).toBe("5");
    expect(legacyRowOwner({ user_id: "guest" })).toBe(GUEST_OWNER);
    expect(legacyRowOwner({ user_id: null, owner: "9" })).toBe("9");
  });

  it("legacy rows are claimed by the first user unless the device data belonged to someone else", () => {
    expect(planLegacyClaim([], "1")).toBe("claim");
    expect(planLegacyClaim(["1"], "1")).toBe("claim");
    expect(planLegacyClaim([GUEST_OWNER], "1")).toBe("claim");
    expect(planLegacyClaim(["2"], "1")).toBe("discard");
    expect(planLegacyClaim(["1", "2"], "1")).toBe("discard");
  });

  it("logout clears every personal store and never the question bank", () => {
    expect([...USER_DATA_STORES].sort()).toEqual(
      ["exam_sessions", "saved_questions", "sync_queue", "user_progress", "wrong_answers"].sort()
    );
    for (const s of CONTENT_STORES) expect(USER_DATA_STORES as readonly string[]).not.toContain(s);
  });
});

// ── Outbox user filter ─────────────────────────────────────────────────────────

describe("outbox is per user", () => {
  it("enqueue records the logged-in user's id (guest → null)", async () => {
    const spy = vi.spyOn(dbClient, "enqueueOutbox").mockResolvedValue();
    loginAs(42);
    await OutboxQueue.enqueue("UPDATE_PROGRESS", "/api/x", "POST", { a: 1 });
    loginAs(null);
    await OutboxQueue.enqueue("UPDATE_PROGRESS", "/api/y", "POST", { a: 2 });
    expect(spy.mock.calls[0][0].user_id).toBe(42);
    expect(spy.mock.calls[1][0].user_id).toBeNull();
  });

  it("push only asks for the current user's rows and never pushes as guest", async () => {
    vi.spyOn(networkHeartbeat, "getStatus").mockReturnValue({ isOnline: true } as any);
    const pending = vi.spyOn(dbClient, "getPendingOutbox").mockResolvedValue([]);
    const push = (syncEngine as any).pushOutbox.bind(syncEngine) as () => Promise<number>;

    loginAs(null);
    expect(await push()).toBe(0);
    expect(pending).not.toHaveBeenCalled();

    loginAs(7);
    await push();
    expect(pending).toHaveBeenCalledWith(7);
  });
});

// ── Logout clean-up ─────────────────────────────────────────────────────────────

describe("logout clears the user's local data but keeps content and other users", () => {
  it("removes per-user keys + IndexedDB rows of that user only", async () => {
    const clear = vi.spyOn(dbClient, "clearUserData").mockResolvedValue();
    localStorage.setItem(scopedStorageKey("prava_wrong_answers_v1", 42), "[1]");
    localStorage.setItem(scopedStorageKey("prava_wrong_answers_v1", 7), "[2]");
    localStorage.setItem(statsCacheKey(42), "{}");
    localStorage.setItem(statsCacheKey(7), "{}");
    localStorage.setItem("prava_cache_topics_v1", "[]");

    await clearLocalUserData(42);

    expect(clear).toHaveBeenCalledWith(42);
    expect(localStorage.getItem("prava_wrong_answers_v1_u42")).toBeNull();
    expect(localStorage.getItem(statsCacheKey(42))).toBeNull();
    expect(localStorage.getItem("prava_wrong_answers_v1_u7")).toBe("[2]");
    expect(localStorage.getItem(statsCacheKey(7))).toBe("{}");
    expect(localStorage.getItem("prava_cache_topics_v1")).toBe("[]");
  });

  it("drops the saved-account entry only when remember-me was off", async () => {
    vi.spyOn(dbClient, "clearUserData").mockResolvedValue();
    AccountManager.saveAccount(user({ id: 42 }));
    localStorage.setItem("prava_remember_me", "true");
    await clearLocalUserData(42);
    expect(AccountManager.getSavedAccounts()).toHaveLength(1);

    localStorage.setItem("prava_remember_me", "false");
    await clearLocalUserData(42);
    expect(AccountManager.getSavedAccounts()).toHaveLength(0);
  });

  it("stats cache key is per user and the legacy unscoped key is removed on startup", () => {
    expect(statsCacheKey(42)).toBe(`${STATS_CACHE_BASE_KEY}_u42`);
    expect(statsCacheKey(null)).toBe(`${STATS_CACHE_BASE_KEY}_guest`);
    localStorage.setItem(STATS_CACHE_BASE_KEY, "{}");
    runLocalStorageMigrations();
    expect(localStorage.getItem(STATS_CACHE_BASE_KEY)).toBeNull();
  });
});
