import { useSyncExternalStore } from "react";

/**
 * Main-window state + commands for the frameless titlebar (Tauri only; in a plain browser —
 * vite dev — every command is a harmless no-op / browser fallback).
 *
 * One `onResized` listener is attached lazily when the titlebar mounts and released when the
 * last subscriber unmounts. Resize events are coalesced to one IPC round-trip per frame.
 */
export const isTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface WindowState {
  maximized: boolean;
  fullscreen: boolean;
}

let state: WindowState = { maximized: false, fullscreen: false };
const listeners = new Set<() => void>();
let detach: (() => void) | null = null;
let attaching = false;

function setState(next: WindowState) {
  if (next.maximized === state.maximized && next.fullscreen === state.fullscreen) return;
  state = next;
  listeners.forEach((l) => l());
}

async function getWin() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

async function refresh() {
  if (!isTauri()) {
    setState({ maximized: false, fullscreen: !!document.fullscreenElement });
    return;
  }
  try {
    const w = await getWin();
    const [maximized, fullscreen] = await Promise.all([w.isMaximized(), w.isFullscreen()]);
    setState({ maximized, fullscreen });
  } catch {
    // window API unavailable — keep last known state
  }
}

async function attach() {
  if (attaching || detach) return;
  attaching = true;
  try {
    if (!isTauri()) {
      const onFs = () => void refresh();
      document.addEventListener("fullscreenchange", onFs);
      detach = () => document.removeEventListener("fullscreenchange", onFs);
      return;
    }
    const w = await getWin();
    let raf = 0;
    const unlisten = await w.onResized(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        void refresh();
      });
    });
    detach = () => {
      if (raf) cancelAnimationFrame(raf);
      unlisten();
    };
    // Unsubscribed while we were awaiting → release immediately.
    if (listeners.size === 0) {
      detach();
      detach = null;
    }
  } catch {
    // ignore
  } finally {
    attaching = false;
  }
  void refresh();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) void attach();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && detach) {
      detach();
      detach = null;
    }
  };
}

const getSnapshot = () => state;

export function useWindowState(): WindowState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export async function minimizeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    await (await getWin()).minimize();
  } catch {
    // ignore
  }
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    await (await getWin()).toggleMaximize();
  } catch {
    // ignore
  }
  void refresh();
}

export async function closeWindow(): Promise<void> {
  if (!isTauri()) {
    window.close();
    return;
  }
  try {
    await (await getWin()).close();
  } catch {
    // ignore
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (!isTauri()) {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // ignore
    }
    return;
  }
  try {
    const w = await getWin();
    const next = !(await w.isFullscreen());
    await w.setFullscreen(next);
    setState({ ...state, fullscreen: next });
  } catch {
    // ignore
  }
}
