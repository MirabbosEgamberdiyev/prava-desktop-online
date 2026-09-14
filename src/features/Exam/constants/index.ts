// Exam sahifasi uchun default qiymatlar
export const EXAM_DEFAULTS = {
  QUESTION_COUNT: 20,
  DURATION_MINUTES: 20,
} as const;

// API endpoints
export const EXAM_API = {
  START_VISIBLE: "/api/v2/exams/marathon/start-visible",
  SUBMIT: "/api/v2/exams/submit",
} as const;

// Timer uchun ranglar (sekundlarda)
export const TIMER_THRESHOLDS = {
  DANGER: 60, // 1 minut - qizil
  WARNING: 300, // 5 minut - sariq
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  OPTION_KEYS: ["F1", "F2", "F3", "F4", "F5"],
  PREV_QUESTION: "ArrowLeft",
  NEXT_QUESTION: "ArrowRight",
} as const;

// Package name uchun default qiymat
export const DEFAULT_PACKAGE_NAME = {
  uzl: "Imtihon",
  uzc: "Имтиҳон",
  en: "Exam",
  ru: "Экзамен",
} as const;
