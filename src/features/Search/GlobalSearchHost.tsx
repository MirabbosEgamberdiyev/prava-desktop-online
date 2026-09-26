import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const GlobalSearchModal = lazy(() => import("./GlobalSearchModal"));

export const OPEN_GLOBAL_SEARCH_EVENT = "prava:open-global-search";

/** Opens the palette from anywhere (e.g. the dashboard search button). */
export function openGlobalSearch(): void {
  window.dispatchEvent(new Event(OPEN_GLOBAL_SEARCH_EVENT));
}

/**
 * Routes where Ctrl+K is disabled: an active exam / test must not be left by accident
 * (exam shortcuts own the keyboard there).
 */
export function isSearchBlockedPath(pathname: string): boolean {
  return (
    pathname === "/exam" ||
    pathname.startsWith("/exam/") ||
    /^\/tickets\/\d+/.test(pathname) ||
    /^\/packages\/\d+/.test(pathname) ||
    pathname === "/wrong-exam" ||
    pathname === "/marafon" ||
    pathname.startsWith("/auth")
  );
}

/**
 * Tiny always-mounted listener (no startup work beyond one keydown handler).
 * The palette itself is a lazy chunk loaded on first Ctrl+K / Cmd+K.
 */
export default function GlobalSearchHost() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const blocked = !isAuthenticated || isSearchBlockedPath(pathname);

  useEffect(() => {
    if (blocked) return;
    const onKey = (e: KeyboardEvent) => {
      // e.code keeps Ctrl+K working on the Cyrillic layout (Ctrl+Л).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.code === "KeyK" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, onOpen);
    };
  }, [blocked]);

  // Close when navigating into a blocked route or logging out.
  useEffect(() => {
    if (blocked) setOpen(false);
  }, [blocked]);

  if (!open || blocked) return null;
  return (
    <Suspense fallback={null}>
      <GlobalSearchModal onClose={() => setOpen(false)} />
    </Suspense>
  );
}
