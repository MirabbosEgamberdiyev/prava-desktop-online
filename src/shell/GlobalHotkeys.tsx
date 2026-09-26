import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTypography } from "../context/TypographyContext";
import { openGlobalSearch } from "../features/Search/GlobalSearchHost";
import { getFocusMode } from "./focusMode";
import { isModalOpen, isTypingTarget, nextLanguage, resolveHotkey, type HotkeyAction } from "./hotkeys";
import { toggleSidebar } from "./sidebarPrefs";
import { toggleFullscreen } from "./windowControls";

/**
 * The single global keydown listener of the shell (see hotkeys.ts for the rules).
 * Registered once; the latest route/context values are read through a ref so the listener
 * is never re-attached on navigation.
 */
export default function GlobalHotkeys() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { zoomIn, zoomOut, resetZoom } = useTypography();

  const latest = useRef({ navigate, pathname, isAuthenticated, language, setLanguage, zoomIn, zoomOut, resetZoom });
  useEffect(() => {
    latest.current = { navigate, pathname, isAuthenticated, language, setLanguage, zoomIn, zoomOut, resetZoom };
  });

  useEffect(() => {
    const run = (action: HotkeyAction) => {
      const c = latest.current;
      switch (action) {
        case "toggleFullscreen":
          void toggleFullscreen();
          break;
        case "cycleLanguage":
          void c.setLanguage(nextLanguage(c.language));
          break;
        case "openSearch":
          openGlobalSearch();
          break;
        case "toggleSidebar":
          toggleSidebar();
          break;
        case "openSettings":
          if (c.isAuthenticated) c.navigate("/settings");
          break;
        case "zoomIn":
          c.zoomIn();
          break;
        case "zoomOut":
          c.zoomOut();
          break;
        case "zoomReset":
          c.resetZoom();
          break;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const action = resolveHotkey(e, {
        pathname: latest.current.pathname,
        typing: isTypingTarget(e.target),
        modalOpen: isModalOpen(),
        focusMode: getFocusMode(),
      });
      if (!action) return;
      if ((action === "openSearch" || action === "toggleSidebar") && !latest.current.isAuthenticated) return;
      e.preventDefault();
      run(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
