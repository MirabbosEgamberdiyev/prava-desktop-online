import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconCloudOff, IconRefresh, IconSearch, IconX, IconAlertTriangle } from "@tabler/icons-react";
import { LEARN_SECTIONS, type LearnSectionId } from "../learnSections";
import "../curriculum.css";

interface ShellProps {
  section: LearnSectionId;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  savedAt: number | null;
  fromCache: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  /** In-page search input (Ctrl+F or "/" focuses it). */
  searchRef?: RefObject<HTMLInputElement | null>;
  sidebar?: ReactNode;
  children: ReactNode;
  detail?: ReactNode;
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Desktop frame for every "Learn" page: header (back, title, offline status, refresh),
 * Learn section tabs and a master-detail body (sidebar | content | optional detail pane).
 * Shortcuts: Ctrl+F or "/" → search, F5 → refresh, Alt+1…6 → switch section, Alt+← → back.
 */
export function CurriculumShell({
  section,
  title,
  subtitle,
  badge,
  savedAt,
  fromCache,
  refreshing,
  onRefresh,
  searchRef,
  sidebar,
  children,
  detail,
}: ShellProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (document.querySelector("[data-global-search-open]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.altKey && (e.code === "KeyF" || e.key.toLowerCase() === "f") && searchRef?.current) {
        e.preventDefault();
        searchRef.current.focus();
        searchRef.current.select();
        return;
      }
      if (e.key === "F5" && !mod) {
        e.preventDefault();
        refreshRef.current();
        return;
      }
      if (e.altKey && !mod && e.key === "ArrowLeft") {
        e.preventDefault();
        navigate("/me");
        return;
      }
      if (e.altKey && !mod && /^Digit[1-6]$/.test(e.code)) {
        const target = LEARN_SECTIONS[Number(e.code.slice(5)) - 1];
        if (target) {
          e.preventDefault();
          navigate(target.path);
        }
        return;
      }
      if (e.key === "/" && !mod && !e.altKey && !isTypingTarget(e.target) && searchRef?.current) {
        e.preventDefault();
        searchRef.current.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, searchRef]);

  const savedLabel = savedAt
    ? new Date(savedAt).toLocaleDateString(i18n.language === "ru" ? "ru-RU" : "uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div className="cur-screen">
      <header className="cur-header">
        <div className="cur-header-inner">
          <button
            type="button"
            className="quiz-back-btn"
            onClick={() => navigate("/me")}
            aria-label={t("common.back", "Ortga")}
            title={`${t("common.back", "Ortga")} (Alt+←)`}
          >
            <IconArrowLeft size={18} />
          </button>
          <div className="cur-header-titles">
            <h1 className="cur-title">{title}</h1>
            {subtitle && <p className="cur-subtitle">{subtitle}</p>}
          </div>
          <div className="cur-header-actions">
            {badge}
            {fromCache && savedLabel && (
              <span className="cur-status-chip" title={t("learn.offlineCopyHint", "Oxirgi saqlangan nusxa")}>
                <IconCloudOff size={14} />
                {t("learn.savedCopy", "Saqlangan nusxa")}: {savedLabel}
              </span>
            )}
            <button
              type="button"
              className="cur-icon-btn"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label={t("common.refresh", "Yangilash")}
              title={`${t("common.refresh", "Yangilash")} (F5)`}
            >
              <IconRefresh size={17} className={refreshing ? "cur-spin" : undefined} />
            </button>
          </div>
        </div>
        <nav className="cur-learn-nav" aria-label={t("nav.learn", "O'rganish")}>
          {LEARN_SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`cur-learn-tab${s.id === section ? " active" : ""}`}
              aria-current={s.id === section ? "page" : undefined}
              onClick={() => navigate(s.path)}
              title={`${t(s.labelKey, s.fallback)} (Alt+${i + 1})`}
            >
              <s.icon size={16} stroke={1.8} />
              <span>{t(s.labelKey, s.fallback)}</span>
            </button>
          ))}
        </nav>
      </header>
      <div className={`cur-body${sidebar ? " has-sidebar" : ""}${detail ? " has-detail" : ""}`}>
        {sidebar && <aside className="cur-sidebar">{sidebar}</aside>}
        <section className="cur-main">{children}</section>
        {detail && <aside className="cur-detail">{detail}</aside>}
      </div>
    </div>
  );
}

interface SearchProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter?: () => void;
  /** ArrowDown from the input moves focus to the result list. */
  onArrowDown?: () => void;
  resultCount?: number;
}

export function CurriculumSearch({ inputRef, value, onChange, placeholder, onEnter, onArrowDown, resultCount }: SearchProps) {
  const { t } = useTranslation();
  return (
    <div className="cur-search">
      <IconSearch size={17} className="cur-search-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className="cur-search-input"
        placeholder={placeholder}
        value={value}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (value) onChange("");
            else e.currentTarget.blur();
            e.preventDefault();
          } else if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          } else if (e.key === "ArrowDown" && onArrowDown) {
            e.preventDefault();
            onArrowDown();
          }
        }}
      />
      {value && resultCount !== undefined && <span className="cur-search-count">{resultCount}</span>}
      {value ? (
        <button type="button" className="cur-search-clear" onClick={() => onChange("")} aria-label={t("curriculum.clean", "Tozalash")}>
          <IconX size={15} />
        </button>
      ) : (
        <kbd className="cur-kbd" aria-hidden="true">Ctrl+F</kbd>
      )}
    </div>
  );
}

interface StateProps {
  loading: boolean;
  error: unknown;
  empty: boolean;
  onRetry: () => void;
  emptyText: string;
  onClear?: () => void;
  clearText?: string;
  children: ReactNode;
}

/** Loading skeleton / error with retry / empty state wrapper. */
export function CurriculumState({ loading, error, empty, onRetry, emptyText, onClear, clearText, children }: StateProps) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="cur-skeleton" aria-busy="true" aria-live="polite">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="cur-skeleton-row" />
        ))}
      </div>
    );
  }
  if (error && empty) {
    return (
      <div className="cur-empty" role="alert">
        <IconCloudOff size={36} stroke={1.5} />
        <p className="cur-empty-title">{t("learn.loadFailedTitle", "Ma'lumotlarni yuklab bo'lmadi")}</p>
        <p className="cur-empty-desc">{t("learn.loadFailedDesc", "Internetga ulaning va qayta urinib ko'ring. Bir marta ochilgan bo'lim keyin internetsiz ham ishlaydi.")}</p>
        <button type="button" className="cur-btn primary" onClick={onRetry}>
          <IconRefresh size={15} /> {t("common.retry", "Qayta urinish")}
        </button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="cur-empty">
        <IconAlertTriangle size={36} stroke={1.5} />
        <p className="cur-empty-title">{emptyText}</p>
        {onClear && (
          <button type="button" className="cur-btn" onClick={onClear}>
            {clearText || t("curriculum.clearSearch", "Qidiruvni tozalash")}
          </button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
