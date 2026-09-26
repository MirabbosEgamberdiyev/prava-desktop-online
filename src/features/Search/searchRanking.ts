/**
 * Global search ranking (Ctrl+K). Pure functions — unit tested in tests/searchRanking.test.ts.
 *
 * Matching is script-insensitive (Latin ⇄ Cyrillic via normalizeSearchText) and token based:
 * every query token must match the title, code or keywords of an entry.
 */
import { normalizeSearchText } from "../../utils/transliterate";

export type SearchKind = "page" | "topic" | "ticket" | "sign" | "marking" | "rule" | "penalty" | "center" | "exercise";

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  title: string;
  /** Right-hand label (category). */
  category: string;
  /** Exact identifiers: sign code "3.24", ticket number "12", penalty number … */
  code?: string;
  /** Extra searchable text (other-language titles, descriptions). Lower weight. */
  keywords?: string;
  route: string;
}

export interface PreparedEntry extends SearchEntry {
  nTitle: string;
  nCode: string;
  nKeywords: string;
}

export interface RankedEntry extends PreparedEntry {
  score: number;
}

/** Small boost so navigation targets win ties against content rows. */
export const KIND_BOOST: Record<SearchKind, number> = {
  page: 40,
  topic: 25,
  ticket: 20,
  sign: 10,
  marking: 10,
  rule: 8,
  exercise: 6,
  center: 6,
  penalty: 4,
};

export function prepareEntries(entries: readonly SearchEntry[]): PreparedEntry[] {
  return entries.map((e) => ({
    ...e,
    nTitle: normalizeSearchText(e.title),
    nCode: normalizeSearchText(e.code),
    nKeywords: normalizeSearchText(e.keywords),
  }));
}

function tokenScore(e: PreparedEntry, token: string): number {
  if (e.nCode) {
    if (e.nCode === token) return 950;
    if (e.nCode.startsWith(token) && /[\d.]/.test(token)) return 700;
  }
  const title = e.nTitle;
  if (title === token) return 900;
  if (title.startsWith(token)) return 600;
  if (` ${title}`.includes(` ${token}`)) return 450; // word start
  if (title.includes(token)) return 300;
  if (e.nKeywords && ` ${e.nKeywords}`.includes(` ${token}`)) return 150;
  if (e.nKeywords && e.nKeywords.includes(token)) return 80;
  return 0;
}

/** Score of one entry for an already-normalised query (0 = no match). */
export function scoreEntry(e: PreparedEntry, normalizedQuery: string): number {
  const q = normalizedQuery;
  if (!q) return 0;
  const tokens = q.split(" ").filter(Boolean);
  let total = 0;
  for (const tok of tokens) {
    const s = tokenScore(e, tok);
    if (s === 0) return 0; // every token must match
    total += s;
  }
  if (tokens.length > 1) {
    if (e.nTitle === q) total += 400;
    else if (e.nTitle.startsWith(q)) total += 250;
    else if (e.nTitle.includes(q)) total += 150;
  }
  total += KIND_BOOST[e.kind];
  // Shorter titles are more specific ("Marafon" before "Marafon rejimida ...").
  total += Math.max(0, 30 - Math.floor(e.nTitle.length / 4));
  return total;
}

export function rankSearch(entries: readonly PreparedEntry[], query: string, limit = 30): RankedEntry[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const out: RankedEntry[] = [];
  for (const e of entries) {
    const score = scoreEntry(e, q);
    if (score > 0) out.push({ ...e, score });
  }
  out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return out.slice(0, limit);
}
