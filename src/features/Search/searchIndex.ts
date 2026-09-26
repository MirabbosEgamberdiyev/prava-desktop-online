/**
 * Builds the Ctrl+K search index from LOCAL data only (no network):
 * app pages, topics + tickets (IndexedDB content stores) and curriculum
 * responses cached by the Learn pages (IndexedDB sync_meta).
 */
import type { TFunction } from "i18next";
import { dbClient } from "../../database/dbClient";
import type { DbTicket, DbTopic } from "../../database/schema";
import { readCurriculumCache, type CurriculumResources } from "../Curriculum/curriculumCache";
import { htmlToText, pickLocalized } from "../Curriculum/localize";
import { LEARN_SECTIONS } from "../Curriculum/learnSections";
import type { SearchEntry } from "./searchRanking";

export interface SearchSources {
  topics: DbTopic[];
  tickets: DbTicket[];
  curriculum: Partial<CurriculumResources>;
}

export async function loadSearchSources(): Promise<SearchSources> {
  const safe = <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
  const [topics, tickets, signs, markings, rules, penalties, centers, practical] = await Promise.all([
    safe(dbClient.getTopics(), [] as DbTopic[]),
    safe(dbClient.getTickets(), [] as DbTicket[]),
    safe(readCurriculumCache("signs"), null),
    safe(readCurriculumCache("markings"), null),
    safe(readCurriculumCache("rules"), null),
    safe(readCurriculumCache("penalties"), null),
    safe(readCurriculumCache("centers"), null),
    safe(readCurriculumCache("practical"), null),
  ]);
  return {
    topics,
    tickets: [...tickets].sort((a, b) => a.ticket_number - b.ticket_number),
    curriculum: {
      signs: signs?.data,
      markings: markings?.data,
      rules: rules?.data,
      penalties: penalties?.data,
      centers: centers?.data,
      practical: practical?.data,
    },
  };
}

const allNames = (row: object, base: string) =>
  ["uzl", "uzc", "ru"].map((l) => (row as Record<string, unknown>)[`${base}_${l}`]).filter((v) => typeof v === "string").join(" ");

/** Static navigation targets (always searchable, also the empty-query list). */
export function pageEntries(t: TFunction): SearchEntry[] {
  const nav = t("dashboard.categories.practice", "Mashg'ulot");
  const tools = t("nav.tools", "Vositalar");
  const learn = t("nav.learn", "O'rganish");
  const pages: SearchEntry[] = [
    { id: "page-exam", kind: "page", title: t("dashboard.modes.examTitle", "Haqiqiy imtihon"), category: t("dashboard.categories.exam", "Imtihon"), route: "/me?picker=exam", keywords: "exam imtihon test" },
    { id: "page-tickets", kind: "page", title: t("nav.ticket", "Biletlar"), category: nav, route: "/tickets", keywords: "bilet tickets" },
    { id: "page-topics", kind: "page", title: t("nav.topics", "Mavzular"), category: nav, route: "/topics", keywords: "mavzu topics" },
    { id: "page-marathon", kind: "page", title: t("nav.marathon", "Marafon"), category: nav, route: "/marafon", keywords: "marathon marafon" },
    { id: "page-wrong-exam", kind: "page", title: t("dashboard.fixMistakesBtn", "Xatolar ustida ishlash"), category: nav, route: "/wrong-exam", keywords: "xato mistakes" },
    ...LEARN_SECTIONS.map<SearchEntry>((s) => ({
      id: `page-${s.id}`,
      kind: "page",
      title: t(s.labelKey, s.fallback),
      category: learn,
      route: s.path,
    })),
    { id: "page-stats", kind: "page", title: t("nav.statistics", "Statistika"), category: tools, route: "/statistics", keywords: "statistics stats" },
    { id: "page-wrong", kind: "page", title: t("nav.wrongAnswers", "Xato javoblar"), category: tools, route: "/wrong-answers" },
    { id: "page-saved", kind: "page", title: t("nav.savedQuestions", "Saqlangan savollar"), category: tools, route: "/saved-questions", keywords: "bookmark" },
    { id: "page-history", kind: "page", title: t("nav.history", "Tarix"), category: tools, route: "/history", keywords: "history" },
    { id: "page-leaderboard", kind: "page", title: t("nav.leaderboard", "Reyting"), category: tools, route: "/leaderboard", keywords: "rating leaderboard" },
    { id: "page-packages", kind: "page", title: t("nav.packages", "Paketlar"), category: tools, route: "/packages", keywords: "packages tarif" },
    { id: "page-settings", kind: "page", title: t("nav.settings", "Sozlamalar"), category: tools, route: "/settings", keywords: "settings" },
    { id: "page-appearance", kind: "page", title: t("settings.typographyTitle", "Matn va Ko'rinish"), category: t("nav.settings", "Sozlamalar"), route: "/settings?tab=appearance", keywords: "font shrift matn text size bold qalin" },
  ];
  return pages;
}

export function buildSearchEntries(src: SearchSources, t: TFunction, lang: string): SearchEntry[] {
  const out = pageEntries(t);
  const catTopics = t("dashboard.categories.topics", "Mavzular");
  const catTickets = t("dashboard.categories.tickets", "Biletlar");

  for (const tp of src.topics) {
    out.push({
      id: `topic-${tp.id}`,
      kind: "topic",
      title: pickLocalized(tp, "name", lang) || tp.code,
      category: catTopics,
      keywords: `${allNames(tp, "name")} ${tp.code ?? ""}`,
      route: `/marafon?topicId=${tp.id}`,
    });
  }
  for (const tk of src.tickets) {
    out.push({
      id: `ticket-${tk.id}`,
      kind: "ticket",
      title: pickLocalized(tk, "name", lang) || `${tk.ticket_number}-${t("dashboard.ticketNum", "bilet")}`,
      category: catTickets,
      code: String(tk.ticket_number),
      keywords: `${allNames(tk, "name")} bilet билет ticket`,
      route: `/tickets/${tk.id}`,
    });
  }

  const c = src.curriculum;
  const label = (id: string) => {
    const s = LEARN_SECTIONS.find((x) => x.id === id);
    return s ? t(s.labelKey, s.fallback) : id;
  };
  for (const s of c.signs ?? []) {
    out.push({ id: `sign-${s.id}`, kind: "sign", title: pickLocalized(s, "title", lang), category: label("signs"), code: s.code, keywords: allNames(s, "title"), route: `/signs?id=${s.id}` });
  }
  for (const m of c.markings ?? []) {
    out.push({ id: `marking-${m.id}`, kind: "marking", title: pickLocalized(m, "title", lang), category: label("markings"), code: m.code, keywords: allNames(m, "title"), route: `/markings?id=${m.id}` });
  }
  for (const r of c.rules ?? []) {
    const html = pickLocalized(r, "content_html", lang);
    out.push({ id: `rule-${r.id}`, kind: "rule", title: pickLocalized(r, "title", lang) || `${r.chapter_num}`, category: label("rules"), code: String(r.chapter_num), keywords: allNames(r, "title"), route: `/rules?chapter=${r.id}` });
    // Headings inside the chapter → deep links that highlight the heading text.
    const re = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(html)) && n < 200) {
      const text = htmlToText(m[1]);
      if (text.length < 3) continue;
      n++;
      out.push({
        id: `rule-${r.id}-h${n}`,
        kind: "rule",
        title: text.length > 120 ? `${text.slice(0, 117)}…` : text,
        category: label("rules"),
        route: `/rules?chapter=${r.id}&q=${encodeURIComponent(text.slice(0, 60))}`,
      });
    }
  }
  for (const p of c.penalties ?? []) {
    const text = pickLocalized(p, "text", lang);
    out.push({ id: `penalty-${p.id}`, kind: "penalty", title: text.length > 120 ? `${text.slice(0, 117)}…` : text, category: label("penalties"), code: String(p.penalty_number), keywords: allNames(p, "text"), route: `/penalties?q=${p.penalty_number}` });
  }
  for (const ct of c.centers ?? []) {
    out.push({ id: `center-${ct.id}`, kind: "center", title: pickLocalized(ct, "region", lang), category: label("exam-centers"), keywords: `${allNames(ct, "region")} ${allNames(ct, "address")}`, route: `/exam-centers?id=${encodeURIComponent(String(ct.id))}` });
  }
  for (const ex of c.practical?.exercises ?? []) {
    out.push({ id: `exercise-${ex.id}`, kind: "exercise", title: pickLocalized(ex, "title", lang), category: label("practical-exam"), code: String(ex.exercise_number), keywords: allNames(ex, "title"), route: `/practical-exam?id=${ex.id}` });
  }
  return out.filter((e) => e.title);
}
