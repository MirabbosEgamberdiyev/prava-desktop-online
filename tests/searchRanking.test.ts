import { describe, it, expect } from "vitest";
import { prepareEntries, rankSearch, scoreEntry, type SearchEntry } from "../src/features/Search/searchRanking";
import { normalizeSearchText } from "../src/utils/transliterate";

const entries: SearchEntry[] = [
  { id: "page-marathon", kind: "page", title: "Marafon", category: "Mashg'ulot", route: "/marafon" },
  { id: "page-signs", kind: "page", title: "Yo'l belgilari", category: "O'rganish", route: "/signs" },
  { id: "page-markings", kind: "page", title: "Yo'l chiziqlari", category: "O'rganish", route: "/markings" },
  { id: "topic-5", kind: "topic", title: "Yo'l belgilari va ularning turlari", category: "Mavzular", route: "/marafon?topicId=5" },
  { id: "ticket-512", kind: "ticket", title: "12-bilet", code: "12", category: "Biletlar", route: "/tickets/512", keywords: "bilet билет" },
  { id: "ticket-501", kind: "ticket", title: "1-bilet", code: "1", category: "Biletlar", route: "/tickets/501", keywords: "bilet билет" },
  { id: "sign-324", kind: "sign", title: "Harakatlanish taqiqlangan", code: "3.2", category: "Yo'l belgilari", route: "/signs?id=324" },
  { id: "sign-3241", kind: "sign", title: "Maksimal tezlik cheklovi", code: "3.24", category: "Yo'l belgilari", route: "/signs?id=3241" },
  { id: "rule-1", kind: "rule", title: "Umumiy qoidalar", category: "YHQ", keywords: "общие положения", route: "/rules?chapter=1" },
  { id: "penalty-3", kind: "penalty", title: "Xavfsizlik kamarini taqmaslik", code: "3", category: "Jarimalar", route: "/penalties?q=3" },
];
const prepared = prepareEntries(entries);
const ids = (q: string) => rankSearch(prepared, q).map((r) => r.id);

describe("search normalisation", () => {
  it("maps Cyrillic and apostrophe variants to one Latin form", () => {
    expect(normalizeSearchText("Йўл белгилари")).toBe("yol belgilari");
    expect(normalizeSearchText("Yo‘l  Belgilari")).toBe("yol belgilari");
    expect(normalizeSearchText("  O'rganish ")).toBe("organish");
  });
});

describe("rankSearch", () => {
  it("returns nothing for an empty query", () => {
    expect(rankSearch(prepared, "   ")).toEqual([]);
  });

  it("puts an exact title match first and requires every token to match", () => {
    expect(ids("marafon")[0]).toBe("page-marathon");
    expect(ids("yol belgilari")[0]).toBe("page-signs");
    expect(ids("yol belgilari")).toContain("topic-5");
    expect(ids("yol belgilari")).not.toContain("page-markings"); // "belgilari" does not match
  });

  it("finds Latin titles with a Cyrillic query", () => {
    expect(ids("йўл белгилари")[0]).toBe("page-signs");
    expect(ids("марафон")[0]).toBe("page-marathon");
  });

  it("ranks exact codes: ticket number and sign code", () => {
    expect(ids("12")[0]).toBe("ticket-512");
    expect(ids("3.24")[0]).toBe("sign-3241");
    // prefix of a code still matches, exact code wins
    const r = ids("3.2");
    expect(r[0]).toBe("sign-324");
    expect(r).toContain("sign-3241");
  });

  it("matches keywords (other-language text) with lower weight than titles", () => {
    expect(ids("общие")).toEqual(["rule-1"]);
    const title = scoreEntry(prepared.find((e) => e.id === "rule-1")!, normalizeSearchText("umumiy"));
    const keyword = scoreEntry(prepared.find((e) => e.id === "rule-1")!, normalizeSearchText("общие"));
    expect(title).toBeGreaterThan(keyword);
  });

  it("prefers word-start matches over mid-word matches", () => {
    const r = rankSearch(prepared, "cheklov");
    expect(r[0].id).toBe("sign-3241");
    expect(ids("taqiq")).toEqual(["sign-324"]);
  });

  it("respects the limit and orders by score", () => {
    const r = rankSearch(prepared, "bilet", 1);
    expect(r).toHaveLength(1);
    const all = rankSearch(prepared, "bilet");
    for (let i = 1; i < all.length; i++) expect(all[i - 1].score).toBeGreaterThanOrEqual(all[i].score);
    expect(all.map((x) => x.id)).toEqual(expect.arrayContaining(["ticket-512", "ticket-501"]));
  });
});
