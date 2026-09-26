import type { AppLanguage } from "../../context/LanguageContext";

/**
 * Picks `<base>_ru` / `<base>_uzc` / `<base>_uzl` from a curriculum row for the UI language,
 * falling back to Latin Uzbek (the only mandatory column).
 */
export function pickLocalized(row: object | null | undefined, base: string, lang: AppLanguage | string): string {
  if (!row) return "";
  const r = row as Record<string, unknown>;
  const val = (suffix: string) => {
    const v = r[`${base}_${suffix}`];
    return typeof v === "string" && v.trim() ? v : "";
  };
  if (lang === "ru") return val("ru") || val("uzl");
  if (lang === "uzc") return val("uzc") || val("uzl");
  return val("uzl");
}

/** Plain text from an HTML fragment (search indexing; no DOM needed). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
