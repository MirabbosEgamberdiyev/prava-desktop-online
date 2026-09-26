/**
 * Phase 5 desktop parity: offline bundle v2 mapping, key sampling, keyboard shortcuts,
 * payment allow-list, timer helpers and design-token wiring.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapOfflineBundle } from "../src/sync/syncEngine";
import { sampleKeys } from "../src/database/dbClient";
import { resolveExamShortcut } from "../src/hooks/useExamShortcuts";
import { isAllowedPaymentUrl } from "../src/payment/paymentRedirect";
import { formatClock, remainingSecondsUntil } from "../src/components/quiz/ExamTimerDisplay";
import tokens from "../src/theme/design-tokens.json";

const ROOT = join(__dirname, "..");

describe("offline bundle v2 → IndexedDB rows", () => {
  const data = {
    version: "v42",
    questions: [
      { id: 11, text: { uzl: "Q11" }, options: [{ text: { uzl: "a" } }], correctOptionIndex: 0 },
      { id: 12, text: { uzl: "Q12" }, options: [], correctOptionIndex: 0, topicId: 3 },
      { id: 13, text: { uzl: "Q13" }, options: [], correctOptionIndex: 0 },
    ],
    topics: [
      { id: 3, code: "T3", nameUzl: "Belgilar", nameUzc: "Белгилар", nameRu: "Знаки", nameEn: "Signs", displayOrder: 2, questionIds: [11, 12] },
      { id: 4, code: "T4", nameUzl: "Chorraha", displayOrder: 1, questionIds: [13] },
    ],
    tickets: [
      { id: 501, ticketNumber: 1, topicId: null, packageId: 9, nameUzl: "1-bilet", durationMinutes: 20, questionIds: [13, 11] },
    ],
  };

  it("keeps server ids and official ordering/mappings", () => {
    const m = mapOfflineBundle(data, 1000);
    expect(m.version).toBe("v42");
    expect(m.topics!.map((t) => [t.id, t.order_num, t.question_count, t.question_ids])).toEqual([
      [3, 2, 2, [11, 12]],
      [4, 1, 1, [13]],
    ]);
    expect(m.topics![0]).toMatchObject({ code: "T3", name_uzl: "Belgilar", name_uzc: "Белгилар", name_ru: "Знаки", name_en: "Signs" });
    expect(m.tickets![0]).toMatchObject({
      id: 501,
      ticket_number: 1,
      package_id: 9,
      question_ids: [13, 11],
      question_count: 2,
      name_ru: "Билет #1",
    });

    const byId = new Map(m.questions.map((q) => [q.id, q]));
    expect(byId.get(13)).toMatchObject({ ticket_id: 501, order_num: 1, topic_id: 4 });
    expect(byId.get(11)).toMatchObject({ ticket_id: 501, order_num: 2, topic_id: 3 });
    expect(byId.get(12)).toMatchObject({ ticket_id: null, topic_id: 3 });
  });

  it("pre-v2 bundle (no topics/tickets) is reported as such (legacy pulls stay as fallback)", () => {
    const m = mapOfflineBundle({ version: "1", questions: data.questions });
    expect(m.topics).toBeNull();
    expect(m.tickets).toBeNull();
    expect(m.questions).toHaveLength(3);
  });
});

describe("sampleKeys (random questions without loading every row)", () => {
  it("returns N distinct keys from the pool", () => {
    const keys = Array.from({ length: 1200 }, (_, i) => i + 1);
    const picked = sampleKeys(keys, 20);
    expect(picked).toHaveLength(20);
    expect(new Set(picked).size).toBe(20);
    expect(picked.every((k) => keys.includes(k))).toBe(true);
    expect(keys).toHaveLength(1200); // input untouched
  });

  it("caps at the pool size and handles 0", () => {
    expect(sampleKeys([1, 2, 3], 10).sort()).toEqual([1, 2, 3]);
    expect(sampleKeys([1, 2, 3], 0)).toEqual([]);
  });
});

describe("unified exam keyboard shortcuts", () => {
  const k = (key: string, code = "", mods: Partial<Record<"shiftKey" | "ctrlKey" | "metaKey" | "altKey", boolean>> = {}) =>
    resolveExamShortcut({ key, code, ...mods });

  it("digits 1–5 and numpad select options; letters no longer select", () => {
    expect(k("1", "Digit1")).toEqual({ type: "select", index: 0 });
    expect(k("5", "Digit5")).toEqual({ type: "select", index: 4 });
    expect(k("2", "Numpad2")).toEqual({ type: "select", index: 1 });
    expect(k("a", "KeyA")).toBeNull();
    expect(k("e", "KeyE")).toBeNull();
    expect(k("F3", "F3")).toBeNull();
    expect(k("6", "Digit6")).toBeNull();
    expect(k("f", "KeyF")).toBeNull();
  });

  it("navigation, confirm, escape and bookmark", () => {
    expect(k("ArrowLeft")).toEqual({ type: "prev" });
    expect(k("ArrowRight")).toEqual({ type: "next" });
    expect(k("Enter", "Enter")).toEqual({ type: "confirm" });
    expect(k("Escape")).toEqual({ type: "escape" });
    expect(k(" ", "Space")).toEqual({ type: "space" });
    expect(k("B", "KeyB", { shiftKey: true })).toEqual({ type: "bookmark" });
    expect(k("b", "KeyB", { ctrlKey: true })).toEqual({ type: "bookmark" });
    expect(k("b", "KeyB")).toEqual({ type: "bookmark" }); // plain B = bookmark (letters are commands)
  });

  it("leaves browser/OS combos alone", () => {
    expect(k("c", "KeyC", { ctrlKey: true })).toBeNull();
    expect(k("1", "Digit1", { altKey: true })).toBeNull();
  });
});

describe("payment redirect allow-list", () => {
  it("allows only https on Click / Payme hosts", () => {
    expect(isAllowedPaymentUrl("https://my.click.uz/services/pay?service_id=1")).toBe(true);
    expect(isAllowedPaymentUrl("https://checkout.paycom.uz/abc")).toBe(true);
    expect(isAllowedPaymentUrl("https://test.paycom.uz/abc")).toBe(true);
    expect(isAllowedPaymentUrl("https://checkout.test.paycom.uz/abc")).toBe(true);
  });

  it("rejects other schemes, hosts, look-alikes and credentials", () => {
    expect(isAllowedPaymentUrl("http://my.click.uz/")).toBe(false);
    expect(isAllowedPaymentUrl("https://my.click.uz.evil.com/")).toBe(false);
    expect(isAllowedPaymentUrl("https://evil.com/?u=https://my.click.uz")).toBe(false);
    expect(isAllowedPaymentUrl("https://user:pw@my.click.uz/")).toBe(false);
    expect(isAllowedPaymentUrl("https://my.click.uz:8443/")).toBe(false);
    expect(isAllowedPaymentUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedPaymentUrl("")).toBe(false);
    expect(isAllowedPaymentUrl(undefined)).toBe(false);
  });
});

describe("countdown helpers (absolute deadline)", () => {
  it("derives remaining seconds from the wall clock", () => {
    expect(remainingSecondsUntil(10_000, 0)).toBe(10);
    expect(remainingSecondsUntil(10_000, 9_001)).toBe(1);
    expect(remainingSecondsUntil(10_000, 12_000)).toBe(0);
  });
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3 * 3600 + 5)).toBe("3:00:05");
  });
});

describe("design tokens are the single source", () => {
  it("desktop copy is identical to the web tokens (when the web repo is present)", () => {
    const webPath = join(ROOT, "..", "prava", "prava", "frontend", "prava-test", "src", "theme", "design-tokens.json");
    let web: string | null = null;
    try {
      web = readFileSync(webPath, "utf8");
    } catch {
      web = null; // CI without the web checkout
    }
    if (web) expect(JSON.parse(web)).toEqual(tokens);
  });

  it("desktop.css light/dark variables mirror design-tokens.json", () => {
    const css = readFileSync(join(ROOT, "src", "styles", "desktop.css"), "utf8");
    const block = (start: string, end: string) => css.slice(css.indexOf(start), css.indexOf(end));
    const light = block("/* ============ LIGHT MODE (default) ============ */", "/* ============ DARK MODE ============ */");
    const dark = block("/* ============ DARK MODE ============ */", "/* ============ OS PREFERS DARK MODE FALLBACK ============ */");
    const osDark = block("/* ============ OS PREFERS DARK MODE FALLBACK ============ */", "/* ============ GLOBAL CONTAINER");
    const expectVar = (src: string, name: string, value: string) =>
      expect(src, `${name} should be ${value}`).toContain(`${name}: ${value};`);

    for (const [src, c] of [
      [light, tokens.color.light],
      [dark, tokens.color.dark],
      [osDark, tokens.color.dark],
    ] as const) {
      expectVar(src, "--primary", c.primary);
      expectVar(src, "--primary-hover", c.primaryHover);
      expectVar(src, "--on-primary", c.onPrimary);
      expectVar(src, "--bg", c.background);
      expectVar(src, "--surface", c.surface);
      expectVar(src, "--surface-alt", c.surfaceAlt);
      expectVar(src, "--border", c.border);
      expectVar(src, "--text", c.text);
      expectVar(src, "--text-muted", c.textMuted);
      expectVar(src, "--success", c.success);
      expectVar(src, "--danger", c.danger);
      expectVar(src, "--warning", c.warning);
      expectVar(src, "--success-bg", c.successBg);
      expectVar(src, "--danger-bg", c.dangerBg);
    }
    expectVar(light, "--content-max-width", `${tokens.layout.contentMaxWidth}px`);
  });
});
