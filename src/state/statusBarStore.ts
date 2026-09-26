import { useSyncExternalStore } from "react";

/**
 * Status bar uchun joriy imtihon holati (Bilet #14 | Savol 8/20 | taymer).
 *
 * Imtihon sahifalari `setExamStatus(...)` ni chaqiradi, status bar `useExamStatus()` bilan o'qiydi.
 * Tashqi kutubxonasiz, React 18+ `useSyncExternalStore` asosida — faqat qiymat o'zgarganda
 * obunachilar qayta chiziladi (taymer uchun absolute deadline saqlanadi, har soniya yozilmaydi).
 */
export type ExamStatusMode = "real" | "ticket" | "marathon" | "survival" | "wrong" | "topic" | "package";

export interface ExamStatus {
  mode: ExamStatusMode;
  /** Masalan "Bilet #14" yoki "Marafon" — tayyor, tarjima qilingan matn. */
  label: string;
  /** 1 dan boshlanadi. */
  questionNumber: number;
  totalQuestions: number;
  /** Epoch ms; taymersiz rejimlarda null. */
  deadline: number | null;
  /** Ixtiyoriy: xatolar soni / ruxsat etilgan chegara (real imtihon). */
  mistakes?: number;
  maxMistakes?: number;
}

let current: ExamStatus | null = null;
const listeners = new Set<() => void>();

function shallowEqual(a: ExamStatus | null, b: ExamStatus | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a) as (keyof ExamStatus)[];
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

export function setExamStatus(next: ExamStatus | null): void {
  if (shallowEqual(current, next)) return;
  current = next;
  listeners.forEach((l) => l());
}

export function clearExamStatus(): void {
  setExamStatus(null);
}

export function getExamStatus(): ExamStatus | null {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useExamStatus(): ExamStatus | null {
  return useSyncExternalStore(subscribe, getExamStatus, getExamStatus);
}
