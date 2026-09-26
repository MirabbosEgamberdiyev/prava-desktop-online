import { useSyncExternalStore } from "react";

/** Sidebar collapsed (icons only) preference — persisted, toggled by Ctrl+B or the rail button. */
export const SIDEBAR_COLLAPSED_KEY = "prava-sidebar-collapsed";

function read(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

let collapsed = typeof window === "undefined" ? false : read();
const listeners = new Set<() => void>();

export function setSidebarCollapsed(next: boolean): void {
  if (next === collapsed) return;
  collapsed = next;
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function toggleSidebar(): void {
  setSidebarCollapsed(!collapsed);
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

const get = () => collapsed;

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, get, get);
}
