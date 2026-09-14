/**
 * PRAVA DESKTOP ONLINE — MULTI-ACCOUNT MANAGER
 * Allows switching between multiple user accounts on desktop safely.
 */

import Cookies from "js-cookie";
import type { User } from "../types";

export interface StoredAccount {
  id: string | number;
  fullName: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  accessToken: string;
  refreshToken?: string;
  lastActiveAt: number;
}

const ACCOUNTS_STORAGE_KEY = "prava_desktop_saved_accounts";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_DATA_KEY = "userData";

export class AccountManager {
  /**
   * Get all accounts saved on this desktop machine
   */
  static getSavedAccounts(): StoredAccount[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed: StoredAccount[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Save or update an account session
   */
  static saveAccount(user: User, accessToken: string, refreshToken?: string): void {
    if (!user || !user.id || !accessToken) return;

    const accounts = this.getSavedAccounts();
    const existingIndex = accounts.findIndex((a) => String(a.id) === String(user.id));

    const updatedAccount: StoredAccount = {
      id: user.id,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Foydalanuvchi",
      phone: user.phoneNumber,
      email: (user as any).email,
      avatarUrl: (user as any).photoUrl || (user as any).avatar,
      role: (user as any).role,
      accessToken,
      refreshToken: refreshToken || "",
      lastActiveAt: Date.now(),
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = updatedAccount;
    } else {
      accounts.push(updatedAccount);
    }

    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.warn("Hisobni saqlashda xatolik:", e);
    }
  }

  /**
   * Switch active session to a previously saved account
   */
  static switchAccount(accountId: string | number): boolean {
    const accounts = this.getSavedAccounts();
    const target = accounts.find((a) => String(a.id) === String(accountId));
    if (!target) return false;

    const isSecure = window.location.protocol === "https:";

    // Set new tokens
    Cookies.set(ACCESS_TOKEN_KEY, target.accessToken, {
      expires: 1,
      secure: isSecure,
      sameSite: isSecure ? "strict" : "lax",
    });

    if (target.refreshToken) {
      Cookies.set(REFRESH_TOKEN_KEY, target.refreshToken, {
        expires: 30,
        secure: isSecure,
        sameSite: isSecure ? "strict" : "lax",
      });
    }

    // Prepare partial user profile
    const userData: Partial<User> = {
      id: target.id as any,
      firstName: target.fullName.split(" ")[0] || "",
      lastName: target.fullName.split(" ").slice(1).join(" ") || "",
      phoneNumber: target.phone,
    };

    Cookies.set(USER_DATA_KEY, JSON.stringify(userData), {
      expires: 1,
      secure: isSecure,
      sameSite: isSecure ? "strict" : "lax",
    });

    // Update lastActiveAt
    target.lastActiveAt = Date.now();
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

    // Signal app to reload auth state
    try {
      localStorage.setItem("auth_sync_event", `switch_${Date.now()}`);
    } catch {
      // ignore
    }

    window.location.hash = "#/me";
    window.location.reload();
    return true;
  }

  /**
   * Remove a saved account from the machine
   */
  static removeAccount(accountId: string | number): void {
    const accounts = this.getSavedAccounts().filter((a) => String(a.id) !== String(accountId));
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // ignore
    }
  }
}
