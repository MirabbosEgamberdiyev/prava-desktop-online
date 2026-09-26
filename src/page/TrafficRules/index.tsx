import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconBook2, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import SEO from "../../components/common/SEO";
import SafeHtml, { sanitizeHtml } from "../../components/common/SafeHtml";
import { useLanguage } from "../../context/LanguageContext";
import type { TrafficRule } from "../../api/curriculumApi";
import { useCurriculum } from "../../features/Curriculum/useCurriculum";
import { htmlToText, pickLocalized } from "../../features/Curriculum/localize";
import { CurriculumSearch, CurriculumShell, CurriculumState } from "../../features/Curriculum/components/CurriculumShell";
import SidebarList from "../../features/Curriculum/components/SidebarList";
import { normalizeSearchText } from "../../utils/transliterate";

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

/** Sanitise, give every heading an id and collect a table of contents. */
function prepareChapterHtml(raw: string, prefix: string): { html: string; toc: TocEntry[] } {
  const clean = sanitizeHtml(raw);
  if (!clean || typeof DOMParser === "undefined") return { html: clean, toc: [] };
  const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return { html: clean, toc: [] };
  const toc: TocEntry[] = [];
  root.querySelectorAll("h1, h2, h3, h4").forEach((h, i) => {
    const text = (h.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const id = `${prefix}-h${i}`;
    h.setAttribute("id", id);
    toc.push({ id, text, level: Number(h.tagName.slice(1)) });
  });
  return { html: root.innerHTML, toc };
}

type HighlightRegistry = { set: (name: string, h: unknown) => void; delete: (name: string) => void };
const highlightApi = (): { registry: HighlightRegistry; Highlight: new (...r: Range[]) => unknown } | null => {
  const css = (globalThis as { CSS?: { highlights?: HighlightRegistry } }).CSS;
  const H = (globalThis as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
  return css?.highlights && H ? { registry: css.highlights, Highlight: H } : null;
};

/** All case-insensitive occurrences of `query` inside `root` as DOM ranges. */
function findRanges(root: HTMLElement, query: string, limit = 500): Range[] {
  const q = query.toLowerCase();
  const out: Range[] = [];
  if (!q) return out;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node && out.length < limit) {
    const text = (node.nodeValue || "").toLowerCase();
    let from = 0;
    let idx = text.indexOf(q, from);
    while (idx >= 0 && out.length < limit) {
      const r = document.createRange();
      r.setStart(node, idx);
      r.setEnd(node, idx + q.length);
      out.push(r);
      from = idx + q.length;
      idx = text.indexOf(q, from);
    }
    node = walker.nextNode();
  }
  return out;
}

export default function TrafficRules_Page() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { data, error, isLoading, refresh, refreshing, savedAt, fromCache } = useCurriculum("rules");
  const chapters = useMemo(() => [...(data ?? [])].sort((a, b) => a.chapter_num - b.chapter_num), [data]);

  const [chapterId, setChapterId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [current, setCurrent] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rangesRef = useRef<Range[]>([]);

  // Deep link from Ctrl+K search: ?chapter=<id>&q=<text> opens the chapter and highlights the text.
  const [params] = useSearchParams();
  const deepChapter = params.get("chapter");
  const deepQ = params.get("q");
  useEffect(() => {
    if (deepChapter) setChapterId(Number(deepChapter));
    if (deepQ) setSearch(deepQ);
  }, [deepChapter, deepQ]);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(search.trim()), 200);
    return () => window.clearTimeout(h);
  }, [search]);

  const chapterTitle = (r: TrafficRule) => pickLocalized(r, "title", lang) || `${r.chapter_num}`;

  // Plain-text index per chapter (all scripts) for the chapter filter.
  const textIndex = useMemo(
    () =>
      new Map(
        chapters.map((r) => [
          r.id,
          normalizeSearchText(`${r.title_uzl} ${r.title_uzc ?? ""} ${r.title_ru ?? ""} ${htmlToText(pickLocalized(r, "content_html", lang))}`),
        ])
      ),
    [chapters, lang]
  );

  const visibleChapters = useMemo(() => {
    const q = normalizeSearchText(debounced);
    if (!q) return chapters;
    return chapters.filter((r) => (textIndex.get(r.id) || "").includes(q));
  }, [chapters, debounced, textIndex]);

  const active = chapters.find((r) => r.id === chapterId) ?? visibleChapters[0] ?? chapters[0] ?? null;

  const prepared = useMemo(
    () => (active ? prepareChapterHtml(pickLocalized(active, "content_html", lang), `rule-${active.id}`) : { html: "", toc: [] }),
    [active, lang]
  );

  // In-content search highlighting (CSS Custom Highlight API; no DOM mutation).
  useEffect(() => {
    const api = highlightApi();
    const root = contentRef.current;
    rangesRef.current = root && debounced ? findRanges(root, debounced) : [];
    setMatchCount(rangesRef.current.length);
    setCurrent(0);
    if (api) {
      if (rangesRef.current.length) api.registry.set("cur-search-hit", new api.Highlight(...rangesRef.current));
      else api.registry.delete("cur-search-hit");
    }
    return () => {
      api?.registry.delete("cur-search-hit");
      api?.registry.delete("cur-search-current");
    };
  }, [debounced, prepared.html]);

  useEffect(() => {
    const r = rangesRef.current[current];
    const api = highlightApi();
    if (!r) {
      api?.registry.delete("cur-search-current");
      return;
    }
    api?.registry.set("cur-search-current", new api.Highlight(r));
    const box = r.getBoundingClientRect();
    const container = scrollRef.current;
    if (container) {
      const cBox = container.getBoundingClientRect();
      if (box.top < cBox.top + 40 || box.bottom > cBox.bottom - 40) {
        container.scrollTop += box.top - cBox.top - cBox.height / 3;
      }
    }
  }, [current, matchCount]);

  const step = (dir: 1 | -1) => {
    if (matchCount === 0) return;
    setCurrent((c) => (c + dir + matchCount) % matchCount);
  };

  // F3 / Shift+F3 → next / previous match anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F3" || matchCount === 0) return;
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      setCurrent((c) => (c + dir + matchCount) % matchCount);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [matchCount]);

  const scrollToHeading = (id: string) => {
    const el = contentRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ block: "start" });
  };

  const multi = chapters.length > 1;
  const sidebarItems = multi
    ? visibleChapters.map((r) => ({ id: String(r.id), label: chapterTitle(r), count: r.chapter_num }))
    : prepared.toc.map((h) => ({ id: h.id, label: h.text }));
  const [tocSel, setTocSel] = useState<string>("");

  return (
    <>
      <SEO title={t("curriculum.rulesTitle", "Yo'l Harakati Qoidalari")} description={t("curriculum.rulesSubtitle", "")} canonical="/rules" noIndex />
      <CurriculumShell
        section="rules"
        title={t("curriculum.rulesTitle", "Yo'l Harakati Qoidalari")}
        subtitle={t("curriculum.rulesSubtitle", "")}
        badge={
          <span className="cur-badge">
            <IconBook2 size={14} /> {t("curriculum.officialText", "Rasmiy matn")}
          </span>
        }
        savedAt={savedAt}
        fromCache={fromCache}
        refreshing={refreshing}
        onRefresh={refresh}
        searchRef={searchRef}
        sidebar={
          sidebarItems.length > 0 ? (
            <>
              <div className="cur-sidebar-head">{multi ? t("learn.chapters", "Boblar") : t("learn.contents", "Mundarija")}</div>
              <SidebarList
                items={sidebarItems}
                value={multi ? String(active?.id ?? "") : tocSel}
                onChange={(id) => {
                  if (multi) {
                    setChapterId(Number(id));
                    if (scrollRef.current) scrollRef.current.scrollTop = 0;
                  } else {
                    setTocSel(id);
                    scrollToHeading(id);
                  }
                }}
                onActivate={() => scrollRef.current?.focus()}
                ariaLabel={multi ? t("learn.chapters", "Boblar") : t("learn.contents", "Mundarija")}
              />
            </>
          ) : undefined
        }
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <CurriculumSearch
              inputRef={searchRef}
              value={search}
              onChange={setSearch}
              placeholder={t("learn.searchRules", "Qoidalar matnidan qidirish... (Enter — keyingi)")}
              onEnter={() => step(1)}
              resultCount={debounced ? matchCount : undefined}
            />
          </div>
          <button type="button" className="cur-icon-btn" onClick={() => step(-1)} disabled={matchCount === 0} aria-label={t("learn.prevMatch", "Oldingi moslik")} title="Shift+F3">
            <IconChevronUp size={16} />
          </button>
          <button type="button" className="cur-icon-btn" onClick={() => step(1)} disabled={matchCount === 0} aria-label={t("learn.nextMatch", "Keyingi moslik")} title="F3">
            <IconChevronDown size={16} />
          </button>
        </div>
        <CurriculumState
          loading={isLoading}
          error={error}
          empty={!active}
          onRetry={refresh}
          emptyText={t("curriculum.rulesNotLoaded", "Qoidalar yuklanmadi")}
        >
          <div className="cur-panel">
            <div ref={scrollRef} className="cur-panel-scroll" tabIndex={0} style={{ padding: "20px 28px", outline: "none" }}>
              {active && multi && <h2 className="cur-detail-title" style={{ marginBottom: 12 }}>{chapterTitle(active)}</h2>}
              <SafeHtml ref={contentRef} className="cur-html" html={prepared.html} trusted />
            </div>
          </div>
        </CurriculumState>
      </CurriculumShell>
    </>
  );
}
