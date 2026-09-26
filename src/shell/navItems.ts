import type { ComponentType } from "react";
import {
  IconAlertTriangle,
  IconBookmark,
  IconBook2,
  IconChartBar,
  IconClipboardCheck,
  IconLayoutDashboard,
  IconPackage,
  IconRun,
  IconFlame,
  IconSchool,
  IconSettings,
  IconTicket,
  IconTrophy,
} from "@tabler/icons-react";
import { isLearnPath } from "./routes";

export interface ShellNavItem {
  id: string;
  path: string;
  /** i18n key under desktopShell.nav */
  labelKey: string;
  fallback: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  match: (pathname: string) => boolean;
  /** Displayed in the tooltip (e.g. "Ctrl+,"). */
  shortcut?: string;
}

const starts = (...prefixes: string[]) => (p: string) =>
  prefixes.some((x) => p === x || p.startsWith(`${x}/`));

/** Sidebar order = spec order. Paths are the existing routes in src/routes/index.tsx. */
export const SHELL_NAV_MAIN: ShellNavItem[] = [
  { id: "home", path: "/me", labelKey: "desktopShell.nav.home", fallback: "Asosiy", icon: IconLayoutDashboard, match: starts("/me") },
  { id: "exam", path: "/exam", labelKey: "desktopShell.nav.realExam", fallback: "Real imtihon", icon: IconClipboardCheck, match: starts("/exam") },
  { id: "tickets", path: "/tickets", labelKey: "desktopShell.nav.tickets", fallback: "Biletlar", icon: IconTicket, match: starts("/tickets") },
  { id: "topics", path: "/topics", labelKey: "desktopShell.nav.topics", fallback: "Mavzular", icon: IconBook2, match: starts("/topics") },
  { id: "marathon", path: "/marafon", labelKey: "desktopShell.nav.marathon", fallback: "Marafon", icon: IconRun, match: starts("/marafon") },
  { id: "survival", path: "/survival", labelKey: "desktopShell.nav.survival", fallback: "Xatogacha marafon", icon: IconFlame, match: starts("/survival") },
  { id: "wrong", path: "/wrong-answers", labelKey: "desktopShell.nav.wrongWork", fallback: "Xatolar ustida ishlash", icon: IconAlertTriangle, match: starts("/wrong-answers", "/wrong-exam") },
  { id: "saved", path: "/saved-questions", labelKey: "desktopShell.nav.saved", fallback: "Tanlanganlar", icon: IconBookmark, match: starts("/saved-questions") },
  { id: "learn", path: "/signs", labelKey: "desktopShell.nav.learn", fallback: "O'quv materiallari", icon: IconSchool, match: isLearnPath },
  { id: "stats", path: "/statistics", labelKey: "desktopShell.nav.statistics", fallback: "Statistika", icon: IconChartBar, match: starts("/statistics", "/history") },
  { id: "rating", path: "/leaderboard", labelKey: "desktopShell.nav.rating", fallback: "Reyting", icon: IconTrophy, match: starts("/leaderboard") },
  { id: "packages", path: "/packages", labelKey: "desktopShell.nav.packages", fallback: "Paketlar", icon: IconPackage, match: starts("/packages", "/payment") },
];

export const SHELL_NAV_FOOTER: ShellNavItem[] = [
  { id: "settings", path: "/settings", labelKey: "desktopShell.nav.settings", fallback: "Sozlamalar", icon: IconSettings, match: starts("/settings"), shortcut: "Ctrl+," },
];

export const SHELL_NAV_ALL: ShellNavItem[] = [...SHELL_NAV_MAIN, ...SHELL_NAV_FOOTER];

export function findNavItem(pathname: string): ShellNavItem | null {
  return SHELL_NAV_ALL.find((i) => i.match(pathname)) ?? null;
}
