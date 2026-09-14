import { useEffect, useRef, useCallback } from "react";
import api from "../api/api";
import type { AnswersMap } from "../types/api";

const AUTOSAVE_INTERVAL = 15_000; // 15 soniya
const LOCAL_STORAGE_KEY = "prava_autosave_";

interface UseAutoSaveOptions {
  sessionId: number | null;
  answers: AnswersMap;
  questions: Array<{ id: number }>;
  enabled: boolean;
}

/**
 * Javoblarni localStorage'ga zaxiralash. Serverga bog'liq emas — sahifa
 * yangilansa, brauzer qulasa yoki internet uzilsa ham javoblar saqlanib qoladi.
 */
export function backupAnswers(sessionId: number | null | undefined, answers: AnswersMap) {
  if (!sessionId) return;
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY + sessionId,
      JSON.stringify({ answers, savedAt: Date.now() }),
    );
  } catch {
    /* kvota to'lgan / private mode — jim o'tamiz */
  }
}

export function clearBackup(sessionId: number | null | undefined) {
  if (!sessionId) return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY + sessionId);
  } catch {
    /* ignore */
  }
}

/**
 * Sessiya uchun saqlangan javoblarni qaytaradi (yoki null).
 * 24 soatdan eski zaxiralar e'tiborsiz qoldiriladi va tozalanadi.
 */
export function restoreAnswers(
  sessionId: number | null | undefined,
): AnswersMap | null {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      answers?: AnswersMap;
      savedAt?: number;
    };
    // Eski format (to'g'ridan-to'g'ri AnswersMap) bilan ham ishlaydi
    const answers = parsed?.answers ?? (parsed as unknown as AnswersMap);
    if (!answers || typeof answers !== "object") return null;
    if (parsed?.savedAt && Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      clearBackup(sessionId);
      return null;
    }
    return Object.keys(answers).length > 0 ? answers : null;
  } catch {
    clearBackup(sessionId);
    return null;
  }
}

/**
 * Imtihon javoblarini avtomatik saqlaydi.
 *
 * Ikki qatlamli himoya:
 *  1. localStorage — HAR o'zgarishda darhol (serverga bog'liq emas).
 *  2. Server (`PUT /api/v2/exams/:id/autosave`) — 15 soniyada bir marta,
 *     tab yashirilganda va sahifa yopilayotganda.
 */
export function useAutoSave({
  sessionId,
  answers,
  questions,
  enabled,
}: UseAutoSaveOptions) {
  const lastSavedRef = useRef<string>("");
  const isSavingRef = useRef(false);
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const saveToServer = useCallback(
    async (answersToSave: AnswersMap) => {
      if (!sessionId || isSavingRef.current) return;

      const answersList = Object.entries(answersToSave).map(
        ([questionIndex, answer]) => ({
          questionId:
            questionsRef.current[Number(questionIndex)]?.id ??
            Number(questionIndex),
          selectedOptionIndex: answer.optionIndex,
          timeSpentSeconds: answer.timeSpentSeconds,
        }),
      );

      // BUG FIX: avval bu tekshiruv `isSavingRef.current = true` dan KEYIN edi va
      // `return` `finally` siz bajarilardi — natijada flag abadiy `true` bo'lib
      // qolib, autosave butunlay ishdan chiqardi.
      if (answersList.length === 0) return;

      isSavingRef.current = true;
      try {
        await api.put(`/api/v2/exams/${sessionId}/autosave`, {
          answers: answersList,
        });
        // Server qabul qildi — lekin localStorage zaxirasini SAQLAB qolamiz.
        // Faqat submit muvaffaqiyatli bo'lgandagina tozalanadi.
      } catch {
        // Server yetib bo'lmadi — localStorage zaxirasi allaqachon yozilgan.
      } finally {
        isSavingRef.current = false;
      }
    },
    [sessionId],
  );

  // 1-qatlam: har o'zgarishda localStorage'ga darhol yozish.
  useEffect(() => {
    if (!enabled || !sessionId) return;
    if (Object.keys(answers).length === 0) return;
    backupAnswers(sessionId, answers);
  }, [enabled, sessionId, answers]);

  // 2-qatlam: davriy server sinxronizatsiyasi.
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const interval = setInterval(() => {
      const current = answersRef.current;
      const serialized = JSON.stringify(current);
      if (serialized === lastSavedRef.current) return;
      if (Object.keys(current).length === 0) return;
      lastSavedRef.current = serialized;
      if (navigator.onLine) saveToServer(current);
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
    // `answers` dep'da EMAS — aks holda har javob tanlanganda interval
    // nolga qaytib, 15s hech qachon to'lmasdi.
  }, [enabled, sessionId, saveToServer]);

  // Tab yashirilganda / sahifa yopilayotganda oxirgi holatni saqlash.
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const flush = () => {
      const current = answersRef.current;
      if (Object.keys(current).length === 0) return;
      backupAnswers(sessionId, current);
      if (navigator.onLine) saveToServer(current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, [enabled, sessionId, saveToServer]);

  // Internet qaytganda zaxirani serverga yuborish.
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const handleOnline = () => {
      const saved = restoreAnswers(sessionId);
      if (saved) saveToServer(saved);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [enabled, sessionId, saveToServer]);

  return { saveToServer };
}
