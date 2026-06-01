/**
 * localStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Backend /api/v1/app/ endpointlari 403 qaytarsa ham ma'lumotlar
 * saqlanishi uchun localStorage'ga yozamiz.
 *
 * Xatolar  → "prava_wrong_answers"
 * Saqlangan → "prava_saved_questions"
 */

import type { QuestionResponse, WrongAnswerResponse, SavedQuestionResponse } from "./types";

const WRONG_KEY = "prava_wrong_answers";
const SAVED_KEY = "prava_saved_questions";

// ─── Wrong Answers ────────────────────────────────────────────────────────────

export function localGetWrongs(): WrongAnswerResponse[] {
  try {
    const raw = localStorage.getItem(WRONG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function localAddWrong(q: QuestionResponse): void {
  const list = localGetWrongs();
  const idx  = list.findIndex((w) => w.questionId === q.id);
  if (idx >= 0) {
    list[idx].wrongCount = (list[idx].wrongCount || 0) + 1;
    list[idx].lastSeen   = new Date().toISOString();
  } else {
    list.push({
      questionId:         q.id,
      wrongCount:         1,
      lastSeen:           new Date().toISOString(),
      text:               q.text,
      imageUrl:           q.imageUrl,
      options:            q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation:        q.explanation,
    });
  }
  localStorage.setItem(WRONG_KEY, JSON.stringify(list));
}

export function localRemoveWrong(questionId: number): void {
  const list = localGetWrongs().filter((w) => w.questionId !== questionId);
  localStorage.setItem(WRONG_KEY, JSON.stringify(list));
}

// ─── Saved Questions ──────────────────────────────────────────────────────────

export function localGetSaved(): SavedQuestionResponse[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Returns true  → question is now saved
 * Returns false → question was removed
 */
export function localToggleSaved(questionId: number, q?: QuestionResponse): boolean {
  const list = localGetSaved();
  const idx  = list.findIndex((s) => s.questionId === questionId);
  if (idx >= 0) {
    // already saved → remove
    list.splice(idx, 1);
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    return false;
  }
  // not saved → add (only if we have the question data)
  if (q) {
    list.push({
      questionId:         q.id,
      savedAt:            new Date().toISOString(),
      text:               q.text,
      imageUrl:           q.imageUrl,
      options:            q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation:        q.explanation,
    });
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    return true;
  }
  return false;
}

export function localRemoveSaved(questionId: number): void {
  const list = localGetSaved().filter((s) => s.questionId !== questionId);
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

export function localIsSaved(questionId: number): boolean {
  return localGetSaved().some((s) => s.questionId === questionId);
}
