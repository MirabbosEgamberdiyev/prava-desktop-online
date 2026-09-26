import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconBook,
  IconBook2,
  IconBuildingSkyscraper,
  IconDirections,
  IconGavel,
  IconLayoutGrid,
  IconRoad,
  IconSearch,
  IconSteeringWheel,
  IconTicket,
} from "@tabler/icons-react";
import { useLanguage } from "../../context/LanguageContext";
import { buildSearchEntries, loadSearchSources, pageEntries, type SearchSources } from "./searchIndex";
import { prepareEntries, rankSearch, type SearchKind } from "./searchRanking";
import "./globalSearch.css";

const ICONS: Record<SearchKind, typeof IconSearch> = {
  page: IconLayoutGrid,
  topic: IconBook2,
  ticket: IconTicket,
  sign: IconDirections,
  marking: IconRoad,
  rule: IconBook,
  penalty: IconGavel,
  center: IconBuildingSkyscraper,
  exercise: IconSteeringWheel,
};

let lastSources: SearchSources | null = null;

interface Props {
  onClose: () => void;
}

/**
 * Ctrl+K command palette: pages, topics, tickets and cached curriculum (all local).
 * ↑/↓ (PageUp/PageDown) move, Enter opens, Esc closes. Focus returns to the previous element.
 */
export default function GlobalSearchModal({ onClose }: Props) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [sources, setSources] = useState<SearchSources | null>(lastSources);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    let alive = true;
    loadSearchSources()
      .then((s) => {
        lastSources = s;
        if (alive) setSources(s);
      })
      .catch(() => {});
    return () => {
      alive = false;
      prev?.focus?.();
    };
  }, []);

  const prepared = useMemo(
    () => prepareEntries(sources ? buildSearchEntries(sources, t, lang) : pageEntries(t)),
    [sources, t, lang]
  );
  const quick = useMemo(() => prepareEntries(pageEntries(t)).slice(0, 10), [t]);
  const results = useMemo(() => (query.trim() ? rankSearch(prepared, query, 40) : quick), [prepared, query, quick]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const open = (idx: number) => {
    const r = results[idx];
    if (!r) return;
    onClose();
    navigate(r.route);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation(); // page-level shortcuts must not fire behind the palette
    if ((e.ctrlKey || e.metaKey) && (e.code === "KeyK" || e.key.toLowerCase() === "k")) {
      e.preventDefault();
      onClose(); // Ctrl+K toggles
      return;
    }
    const n = results.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (n) setActive((a) => (a + 1) % n);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (n) setActive((a) => (a - 1 + n) % n);
        break;
      case "PageDown":
        e.preventDefault();
        if (n) setActive((a) => Math.min(n - 1, a + 6));
        break;
      case "PageUp":
        e.preventDefault();
        if (n) setActive((a) => Math.max(0, a - 6));
        break;
      case "Enter":
        e.preventDefault();
        open(active);
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      case "Tab":
        e.preventDefault(); // keep focus inside the dialog
        inputRef.current?.focus();
        break;
    }
  };

  return (
    <div className="gs-overlay" data-global-search-open="" onMouseDown={onClose}>
      <div
        className="gs-card"
        role="dialog"
        aria-modal="true"
        aria-label={t("dashboard.searchModalLabel", "Global qidiruv")}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="gs-input-row">
          <IconSearch size={20} className="gs-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="gs-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="gs-results"
            aria-activedescendant={results[active] ? `gs-opt-${active}` : undefined}
            placeholder={t("dashboard.searchPlaceholder", "Mavzu, bilet yoki qoida qidirish...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="gs-kbd">Esc</kbd>
        </div>

        <div id="gs-results" ref={listRef} className="gs-results" role="listbox">
          {!query.trim() && <div className="gs-section">{t("search.quickLinks", "Tezkor o'tish")}</div>}
          {results.length === 0 ? (
            <div className="gs-empty">{t("dashboard.noSearchResults", "Hech narsa topilmadi")}</div>
          ) : (
            results.map((r, idx) => {
              const Icon = ICONS[r.kind];
              return (
                <div
                  key={r.id}
                  id={`gs-opt-${idx}`}
                  data-index={idx}
                  role="option"
                  aria-selected={idx === active}
                  className={`gs-item${idx === active ? " active" : ""}`}
                  onMouseMove={() => idx !== active && setActive(idx)}
                  onClick={() => open(idx)}
                >
                  <Icon size={18} className="gs-item-icon" />
                  {r.code && (r.kind === "sign" || r.kind === "marking") && <span className="gs-code">{r.code}</span>}
                  <span className="gs-item-title">{r.title}</span>
                  <span className="gs-item-cat">{r.category}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="gs-footer">
          <span>
            <kbd className="gs-kbd">↑</kbd> <kbd className="gs-kbd">↓</kbd> {t("dashboard.navigate", "harakatlanish")}
          </span>
          <span>
            <kbd className="gs-kbd">Enter</kbd> {t("dashboard.select", "tanlash")}
          </span>
          <span>
            <kbd className="gs-kbd">Esc</kbd> {t("dashboard.close", "yopish")}
          </span>
          {!sources?.curriculum.signs && <span className="gs-hint">{t("search.learnHint", "O'rganish bo'limlari bir marta ochilgach, ularning mazmuni ham qidiriladi")}</span>}
        </div>
      </div>
    </div>
  );
}
