/**
 * Uzbek Cyrillic → Latin transliteration (ported from the web app) plus a
 * search normaliser, so a Latin query finds Cyrillic content and vice versa.
 */

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: "a", А: "A", б: "b", Б: "B", в: "v", В: "V", г: "g", Г: "G",
  д: "d", Д: "D", е: "e", Е: "E", ё: "yo", Ё: "Yo", ж: "j", Ж: "J",
  з: "z", З: "Z", и: "i", И: "I", й: "y", Й: "Y", к: "k", К: "K",
  л: "l", Л: "L", м: "m", М: "M", н: "n", Н: "N", о: "o", О: "O",
  п: "p", П: "P", р: "r", Р: "R", с: "s", С: "S", т: "t", Т: "T",
  у: "u", У: "U", ф: "f", Ф: "F", х: "x", Х: "X", ц: "ts", Ц: "Ts",
  ч: "ch", Ч: "Ch", ш: "sh", Ш: "Sh", щ: "sh", Щ: "Sh", ъ: "'", Ъ: "'",
  ы: "i", Ы: "I", ь: "", Ь: "", э: "e", Э: "E", ю: "yu", Ю: "Yu",
  я: "ya", Я: "Ya", ў: "o'", Ў: "O'", қ: "q", Қ: "Q", ғ: "g'", Ғ: "G'",
  ҳ: "h", Ҳ: "H",
};

export function cyrillicToLatin(text: string | null | undefined): string {
  if (!text) return "";
  let out = "";
  for (const ch of text) out += CYRILLIC_TO_LATIN_MAP[ch] ?? ch;
  return out;
}

/**
 * Canonical form for matching: Latin script, lower case, apostrophe variants removed,
 * whitespace collapsed. "Йўл белгилари" and "Yo'l belgilari" both → "yol belgilari".
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return "";
  return cyrillicToLatin(text)
    .toLowerCase()
    .replace(/['‘’`ʼʻ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
