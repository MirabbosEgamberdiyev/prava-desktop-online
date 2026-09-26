import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconChevronLeft, IconChevronRight, IconPointer } from "@tabler/icons-react";
import SafeHtml from "../../../components/common/SafeHtml";
import SecureImage from "../../../components/common/SecureImage";
import { useLanguage } from "../../../context/LanguageContext";
import { pickLocalized } from "../localize";
import { normalizeSearchText } from "../../../utils/transliterate";
import { CurriculumSearch, CurriculumShell, CurriculumState } from "./CurriculumShell";
import SidebarList from "./SidebarList";
import VirtualGrid from "./VirtualGrid";
import type { LearnSectionId } from "../learnSections";

export interface CatalogItem {
  id: number;
  code: string;
  imageUrl?: string | null;
  title_uzl: string;
  title_uzc?: string;
  title_ru?: string;
  description_uzl?: string;
  description_uzc?: string;
  description_ru?: string;
}

export interface CatalogCategory<T> {
  id: string;
  label: string;
  match: (item: T) => boolean;
}

interface Props<T extends CatalogItem> {
  section: LearnSectionId;
  title: string;
  subtitle: string;
  countBadge: (count: number) => ReactNode;
  items: T[];
  loading: boolean;
  error: unknown;
  savedAt: number | null;
  fromCache: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  categories: CatalogCategory<T>[];
  searchPlaceholder: string;
  emptyText: string;
  itemMeta?: (item: T) => string;
}

/**
 * Road signs / road markings catalogue: category sidebar | virtualised card grid | detail pane.
 * Grid ←/→/↑/↓ selects (detail follows selection), Enter/↓ in search jumps into the grid.
 */
export default function CatalogPage<T extends CatalogItem>({
  section,
  title,
  subtitle,
  countBadge,
  items,
  loading,
  error,
  savedAt,
  fromCache,
  refreshing,
  onRefresh,
  categories,
  searchPlaceholder,
  emptyText,
  itemMeta,
}: Props<T>) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [category, setCategory] = useState(categories[0]?.id ?? "all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);

  // Deep link from Ctrl+K search: ?id=<item id> selects that item.
  const [params] = useSearchParams();
  const deepId = params.get("id");
  const allId = categories[0]?.id ?? "all";
  useEffect(() => {
    if (!deepId) return;
    setCategory(allId);
    setSearch("");
    setSelectedId(Number(deepId));
  }, [deepId, allId]);

  const itemTitle = (s: T) => pickLocalized(s, "title", lang);

  // Code + title in all scripts: a Latin query also finds Cyrillic titles.
  const index = useMemo(
    () => new Map(items.map((s) => [s.id, normalizeSearchText(`${s.code} ${s.title_uzl} ${s.title_uzc ?? ""} ${s.title_ru ?? ""}`)])),
    [items]
  );

  const activeCategory = categories.find((c) => c.id === category) ?? categories[0];

  const filtered = useMemo(() => {
    const raw = search.trim().toLowerCase();
    const q = normalizeSearchText(search);
    return items.filter((s) => {
      if (activeCategory && !activeCategory.match(s)) return false;
      if (!q) return true;
      if (s.code && s.code.toLowerCase().startsWith(raw)) return true;
      return (index.get(s.id) || "").includes(q);
    });
  }, [items, activeCategory, search, index]);

  const selectedIndex = filtered.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? filtered[selectedIndex] : null;
  const selectAt = (i: number) => setSelectedId(filtered[i]?.id ?? null);

  const focusGrid = () => {
    if (filtered.length === 0) return;
    if (selectedIndex < 0) selectAt(0);
    gridWrapRef.current?.querySelector<HTMLDivElement>(".cur-grid-scroll")?.focus();
  };

  const sidebarItems = categories.map((c) => ({
    id: c.id,
    label: c.label,
    count: items.filter(c.match).length,
  }));

  const detail = selected ? (
    <>
      <div className="cur-detail-media">
        <SecureImage path={selected.imageUrl || ""} alt={itemTitle(selected)} />
      </div>
      <div className="cur-detail-body">
        <span className="cur-code">{selected.code}</span>
        <h2 className="cur-detail-title">{itemTitle(selected)}</h2>
        {itemMeta && <span className="cur-detail-meta">{itemMeta(selected)}</span>}
        <SafeHtml className="cur-html" html={pickLocalized(selected, "description", lang)} />
      </div>
      <div className="cur-detail-nav">
        <button type="button" className="cur-btn grow" disabled={selectedIndex <= 0} onClick={() => selectAt(selectedIndex - 1)}>
          <IconChevronLeft size={15} /> {t("learn.prev", "Oldingi")}
        </button>
        <button
          type="button"
          className="cur-btn grow"
          disabled={selectedIndex >= filtered.length - 1}
          onClick={() => selectAt(selectedIndex + 1)}
        >
          {t("learn.next", "Keyingi")} <IconChevronRight size={15} />
        </button>
      </div>
    </>
  ) : (
    <div className="cur-detail-empty">
      <IconPointer size={30} stroke={1.5} />
      <span>{t("learn.selectItemHint", "Batafsil ma'lumot uchun ro'yxatdan element tanlang (sichqoncha yoki ↑ ↓ ← →).")}</span>
    </div>
  );

  return (
    <CurriculumShell
      section={section}
      title={title}
      subtitle={subtitle}
      badge={countBadge(filtered.length)}
      savedAt={savedAt}
      fromCache={fromCache}
      refreshing={refreshing}
      onRefresh={onRefresh}
      searchRef={searchRef}
      sidebar={
        <>
          <div className="cur-sidebar-head">{t("learn.categories", "Toifalar")}</div>
          <SidebarList
            items={sidebarItems}
            value={category}
            onChange={(id) => {
              setCategory(id);
              setSelectedId(null);
            }}
            onActivate={focusGrid}
            ariaLabel={t("learn.categories", "Toifalar")}
          />
        </>
      }
      detail={detail}
    >
      <CurriculumSearch
        inputRef={searchRef}
        value={search}
        onChange={(v) => {
          setSearch(v);
          setSelectedId(null);
        }}
        placeholder={searchPlaceholder}
        onEnter={focusGrid}
        onArrowDown={focusGrid}
        resultCount={filtered.length}
      />
      <div ref={gridWrapRef} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <CurriculumState
          loading={loading}
          error={error}
          empty={filtered.length === 0}
          onRetry={onRefresh}
          emptyText={emptyText}
          onClear={
            items.length > 0 && (search || category !== categories[0]?.id)
              ? () => {
                  setSearch("");
                  setCategory(categories[0]?.id ?? "all");
                }
              : undefined
          }
          clearText={t("learn.clearFilters", "Filtrlarni tozalash")}
        >
          <VirtualGrid
            items={filtered}
            idPrefix={`${section}-item`}
            getKey={(s) => s.id}
            getItemLabel={(s) => `${s.code} ${itemTitle(s)}`}
            selectedIndex={selectedIndex}
            onSelect={selectAt}
            ariaLabel={title}
            minColumnWidth={150}
            rowHeight={190}
            renderItem={(s) => (
              <>
                <div className="cur-card-media">
                  <SecureImage path={s.imageUrl || ""} alt={itemTitle(s)} lazy />
                </div>
                <div className="cur-card-body">
                  <span className="cur-code">{s.code}</span>
                  <span className="cur-card-title" title={itemTitle(s)}>
                    {itemTitle(s)}
                  </span>
                </div>
              </>
            )}
          />
        </CurriculumState>
      </div>
    </CurriculumShell>
  );
}
