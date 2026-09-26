import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconSearch } from "@tabler/icons-react";
import { useAuth } from "../auth/AuthContext";
import UserMenuButton from "../components/nav/UserMenuButton";
import NotificationCenter from "../components/dashboard/NotificationCenter";
import { isSearchBlockedPath, openGlobalSearch } from "../features/Search/GlobalSearchHost";
import { findNavItem } from "./navItems";
import appIcon from "./app-icon-64.png";
import { closeWindow, isTauri, minimizeWindow, toggleMaximizeWindow, useWindowState } from "./windowControls";

/** Segoe Fluent-style caption glyphs (10×10, 1px strokes, crisp at any DPI). */
function CaptionGlyph({ kind }: { kind: "min" | "max" | "restore" | "close" }) {
  const common = { width: 10, height: 10, viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: 1, "aria-hidden": true };
  switch (kind) {
    case "min":
      return (
        <svg {...common}>
          <path d="M0 5.5h10" />
        </svg>
      );
    case "max":
      return (
        <svg {...common}>
          <rect x="0.5" y="0.5" width="9" height="9" rx="1" />
        </svg>
      );
    case "restore":
      return (
        <svg {...common}>
          <rect x="0.5" y="2.5" width="7" height="7" rx="1" />
          <path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" />
        </svg>
      );
  }
}

const SECTION_FALLBACKS: Array<[RegExp, string, string]> = [
  [/^\/history/, "desktopShell.sections.history", "Imtihon tarixi"],
  [/^\/auth/, "desktopShell.sections.signIn", "Kirish"],
];

/**
 * Frameless window caption (Tauri `decorations: false`, see src-tauri/src/lib.rs):
 * icon + title + current section on a drag region (double-click maximizes natively via
 * Tauri's drag script), search / notifications / account, then Windows caption buttons.
 * Snap Layouts flyout needs a native maximize button → not available (documented limitation).
 */
export default function TitleBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { maximized, fullscreen } = useWindowState();
  const native = isTauri();

  if (fullscreen) return null;

  const nav = findNavItem(pathname);
  const fb = SECTION_FALLBACKS.find(([re]) => re.test(pathname));
  const section = nav ? t(nav.labelKey, nav.fallback) : fb ? t(fb[1], fb[2]) : "";
  const canSearch = isAuthenticated && !isSearchBlockedPath(pathname);

  return (
    <header className="shell-titlebar" role="banner">
      <div className="shell-titlebar-drag" data-tauri-drag-region="deep">
        <img className="shell-titlebar-icon" src={appIcon} width={16} height={16} alt="" draggable={false} />
        <span className="shell-titlebar-title">Prava Online</span>
        {section && (
          <>
            <span className="shell-titlebar-sep" aria-hidden="true">
              —
            </span>
            <span className="shell-titlebar-section">{section}</span>
          </>
        )}
      </div>

      {canSearch && (
        <button
          type="button"
          className="shell-titlebar-search"
          onClick={openGlobalSearch}
          title={`${t("search.shortcutLabel", "Global qidiruv")} (Ctrl+K / Ctrl+F)`}
          aria-keyshortcuts="Control+K Control+F"
        >
          <IconSearch size={14} stroke={1.8} />
          <span>{t("desktopShell.titlebar.search", "Qidirish…")}</span>
          <kbd>Ctrl K</kbd>
        </button>
      )}

      <div className="shell-titlebar-drag shell-titlebar-spacer" data-tauri-drag-region="deep" />

      {isAuthenticated && (
        <div className="shell-titlebar-tools">
          <NotificationCenter />
          <UserMenuButton />
        </div>
      )}

      {native && (
        <div className="shell-caption-buttons">
          <button
            type="button"
            className="shell-caption-btn"
            onClick={() => void minimizeWindow()}
            title={t("desktopShell.titlebar.minimize", "Yig'ish")}
            aria-label={t("desktopShell.titlebar.minimize", "Yig'ish")}
            tabIndex={-1}
          >
            <CaptionGlyph kind="min" />
          </button>
          <button
            type="button"
            className="shell-caption-btn"
            onClick={() => void toggleMaximizeWindow()}
            title={maximized ? t("desktopShell.titlebar.restore", "Oldingi o'lcham") : t("desktopShell.titlebar.maximize", "Kattalashtirish")}
            aria-label={maximized ? t("desktopShell.titlebar.restore", "Oldingi o'lcham") : t("desktopShell.titlebar.maximize", "Kattalashtirish")}
            tabIndex={-1}
          >
            <CaptionGlyph kind={maximized ? "restore" : "max"} />
          </button>
          <button
            type="button"
            className="shell-caption-btn shell-caption-close"
            onClick={() => void closeWindow()}
            title={t("desktopShell.titlebar.close", "Yopish")}
            aria-label={t("desktopShell.titlebar.close", "Yopish")}
            tabIndex={-1}
          >
            <CaptionGlyph kind="close" />
          </button>
        </div>
      )}
    </header>
  );
}
