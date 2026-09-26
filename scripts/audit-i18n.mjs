#!/usr/bin/env node
/**
 * i18n audit — desktop.
 *
 * 1) src/**\/*.{ts,tsx} ichidagi t("...") / t('...') / i18n.t("...") literal kalitlarini yig'adi;
 * 2) public/locales/<lng>/translation.json fayllari bilan solishtiradi;
 * 3) har bir locale uchun yetishmayotgan kalitlarni va locale'lar orasidagi
 *    kalit to'plami farqlarini chiqaradi.
 *
 * Exit code: 1 — agar kamida bitta ishlatilgan kalit biror locale'da bo'lmasa.
 * Locale'lararo farqlar (faqat bitta locale'da bor, kodda ishlatilmaydigan kalitlar)
 * ogohlantirish sifatida chiqadi; `--strict` bilan ular ham xato hisoblanadi.
 *
 * Usage: node scripts/audit-i18n.mjs [--strict] [--json]
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const LOCALES = join(ROOT, "public", "locales");
const args = new Set(process.argv.slice(2));
const STRICT = args.has("--strict");
const JSON_OUT = args.has("--json");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

// t("key"...), t('key'...), i18n.t("key"), i18next.t('key') — `t` must not be part of a longer identifier.
const KEY_RE = /(?<![\w$])(?:i18n(?:ext)?\.)?t\(\s*(["'])([A-Za-z0-9_.\-:]+)\1/g;

/** @type {Map<string, Set<string>>} key -> files */
const used = new Map();
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(KEY_RE)) {
    const key = m[2];
    if (!key.includes(".")) continue; // flat single words are almost never translation keys here
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(relative(ROOT, file).replace(/\\/g, "/"));
  }
}

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.set(key, "object");
      flatten(v, key, out);
    } else {
      out.set(key, Array.isArray(v) ? "array" : typeof v);
    }
  }
  return out;
}

const PLURAL = ["_zero", "_one", "_two", "_few", "_many", "_other"];
function has(flat, key) {
  if (flat.has(key)) return true;
  return PLURAL.some((s) => flat.has(key + s));
}

if (!existsSync(LOCALES)) {
  console.error(`Locale dir not found: ${LOCALES}`);
  process.exit(2);
}
const langs = readdirSync(LOCALES).filter((l) => existsSync(join(LOCALES, l, "translation.json")));
/** @type {Record<string, Map<string,string>>} */
const flats = {};
for (const l of langs) {
  flats[l] = flatten(JSON.parse(readFileSync(join(LOCALES, l, "translation.json"), "utf8")));
}

const missing = {};
let missingTotal = 0;
for (const l of langs) {
  missing[l] = [...used.keys()].filter((k) => !has(flats[l], k)).sort();
  missingTotal += missing[l].length;
}

// Leaf key-set differences between locales
const leafSets = Object.fromEntries(
  langs.map((l) => [l, new Set([...flats[l]].filter(([, t]) => t !== "object").map(([k]) => k))]),
);
const union = new Set(langs.flatMap((l) => [...leafSets[l]]));
const diffs = {};
let diffTotal = 0;
for (const l of langs) {
  diffs[l] = [...union].filter((k) => !leafSets[l].has(k)).sort();
  diffTotal += diffs[l].length;
}

if (JSON_OUT) {
  console.log(JSON.stringify({ usedKeys: used.size, langs, missing, onlyInOtherLocales: diffs }, null, 2));
} else {
  console.log(`i18n audit — ${used.size} literal keys used in src/, locales: ${langs.join(", ")}`);
  for (const l of langs) {
    console.log(`\n[${l}] missing used keys: ${missing[l].length}`);
    for (const k of missing[l]) console.log(`  - ${k}   (${[...used.get(k)].slice(0, 2).join(", ")})`);
  }
  console.log(`\nKey-set differences between locales (leaf keys absent in this locale but present in another):`);
  for (const l of langs) {
    console.log(`  [${l}] ${diffs[l].length}`);
    for (const k of diffs[l].slice(0, 50)) console.log(`    - ${k}`);
    if (diffs[l].length > 50) console.log(`    ... +${diffs[l].length - 50} more`);
  }
  console.log(`\nTOTAL missing: ${missingTotal}; locale set differences: ${diffTotal}`);
}

process.exit(missingTotal > 0 || (STRICT && diffTotal > 0) ? 1 : 0);
