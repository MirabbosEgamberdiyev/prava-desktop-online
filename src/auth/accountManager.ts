/**
 * PRAVA DESKTOP ONLINE — "accounts on this device" list.
 *
 * Security model (shared learning-center PCs): the list is only a convenience shortcut to
 * the login screen. It NEVER stores tokens, the full phone number / email, or the role —
 * only a display name ("Ali V."), a masked identifier ("+998 ** *** ** 67" / "a***@gmail.com")
 * and the last-used time. Switching accounts always goes through a normal login.
 * Entries are only written when "remember me" is on.
 */

import type { User } from "../types";

export interface StoredAccount {
  id: string | number;
  /** First name + last-name initial, e.g. "Ali V." */
  displayName: string;
  /** Masked phone / email, e.g. "+998 ** *** ** 67" or "a***@gmail.com" ("" if unknown). */
  maskedIdentifier: string;
  lastUsedAt: number;
}

export const ACCOUNTS_STORAGE_KEY = "prava_desktop_saved_accounts";
/** Login-page preference (boolean string). Not PII. */
export const REMEMBER_ME_KEY = "prava_remember_me";
/** Legacy: full phone/email of the last login. No longer written; removed on migration. */
export const LEGACY_SAVED_IDENTIFIER_KEY = "prava_saved_identifier";

const ALLOWED_FIELDS: ReadonlyArray<keyof StoredAccount> = ["id", "displayName", "maskedIdentifier", "lastUsedAt"];

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** "Ali", "Valiyev" → "Ali V."; missing names → "". */
export function formatDisplayName(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  if (!first && !last) return "";
  if (!first) return `${last.charAt(0).toUpperCase()}.`;
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

/** "+998901234567" → "+998 ** *** ** 67". Only the country code and the last 2 digits survive. */
export function maskPhone(phone?: string | null): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return "";
  const last2 = digits.slice(-2);
  if (digits.startsWith("998") && digits.length === 12) return `+998 ** *** ** ${last2}`;
  return `+** *** ** ${last2}`;
}

/** "ali.valiyev@gmail.com" → "a***@gmail.com". */
export function maskEmail(email?: string | null): string {
  const value = String(email || "").trim();
  const at = value.lastIndexOf("@");
  if (at < 1 || at === value.length - 1) return "";
  return `${value.charAt(0)}***${value.slice(at)}`;
}

export function maskIdentifier(phone?: string | null, email?: string | null): string {
  return maskPhone(phone) || maskEmail(email);
}

/**
 * Normalizes any stored object (new or legacy shape) into the minimal StoredAccount.
 * Legacy entries had {fullName, phone, email, role, accessToken, refreshToken, lastActiveAt, avatarUrl}.
 */
export function sanitizeStoredAccount(raw: unknown): StoredAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = r.id;
  if ((typeof id !== "string" && typeof id !== "number") || String(id) === "") return null;

  let displayName = typeof r.displayName === "string" ? r.displayName : "";
  if (!displayName && typeof r.fullName === "string") {
    const [first, ...rest] = r.fullName.trim().split(/\s+/);
    displayName = formatDisplayName(first, rest.join(" "));
  }

  let maskedIdentifier = typeof r.maskedIdentifier === "string" ? r.maskedIdentifier : "";
  if (!maskedIdentifier) {
    maskedIdentifier = maskIdentifier(
      typeof r.phone === "string" ? r.phone : null,
      typeof r.email === "string" ? r.email : null
    );
  }

  const lastUsedRaw = Number(r.lastUsedAt ?? r.lastActiveAt);
  return {
    id,
    displayName,
    maskedIdentifier,
    lastUsedAt: Number.isFinite(lastUsedRaw) && lastUsedRaw > 0 ? lastUsedRaw : 0,
  };
}

function isClean(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const keys = Object.keys(raw as object);
  return keys.every((k) => (ALLOWED_FIELDS as readonly string[]).includes(k));
}

function readRaw(): unknown[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(accounts: StoredAccount[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    if (accounts.length === 0) storage.removeItem(ACCOUNTS_STORAGE_KEY);
    else storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // quota / private mode — the list is only a convenience
  }
}

/** Login-page "remember me" preference (defaults to on, like the login form). */
export function readRememberMePreference(): boolean {
  try {
    return safeStorage()?.getItem(REMEMBER_ME_KEY) !== "false";
  } catch {
    return true;
  }
}

export class AccountManager {
  /** Accounts remembered on this machine, most recently used first (sanitized on read). */
  static getSavedAccounts(): StoredAccount[] {
    return readRaw()
      .map(sanitizeStoredAccount)
      .filter((a): a is StoredAccount => !!a)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  /** Remember (or refresh) the account. Stores NO tokens and NO full phone/email. */
  static saveAccount(user: User | null | undefined): void {
    if (!user || !user.id) return;
    const entry: StoredAccount = {
      id: user.id,
      displayName:
        formatDisplayName(user.firstName, user.lastName) ||
        sanitizeStoredAccount({ id: user.id, fullName: user.fullName || "" })?.displayName ||
        "",
      maskedIdentifier: maskIdentifier(user.phoneNumber, user.email),
      lastUsedAt: Date.now(),
    };
    const accounts = this.getSavedAccounts().filter((a) => String(a.id) !== String(user.id));
    accounts.unshift(entry);
    writeAll(accounts);
  }

  /** "Remove from this device". */
  static removeAccount(accountId: string | number): void {
    const all = this.getSavedAccounts();
    const next = all.filter((a) => String(a.id) !== String(accountId));
    if (next.length !== all.length) writeAll(next);
  }

  /**
   * One-time, idempotent migration run on app start: strips tokens / phone / email / role
   * from entries written by older builds and drops the legacy full-identifier key.
   */
  static migrateLegacyStorage(): void {
    const storage = safeStorage();
    if (!storage) return;
    try {
      storage.removeItem(LEGACY_SAVED_IDENTIFIER_KEY);
    } catch {
      // ignore
    }
    const raw = readRaw();
    if (raw.length === 0) return;
    if (raw.every(isClean)) return; // already migrated — no write
    writeAll(this.getSavedAccounts());
  }
}
