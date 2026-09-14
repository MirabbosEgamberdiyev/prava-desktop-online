// Ko'p tilli matn interfeysi
export interface LocalizedText {
  uzl: string;
  uzc: string;
  en: string;
  ru: string;
}

// Javob varianti interfeysi
export interface Option {
  id: number;
  index: number;
  text: LocalizedText;
}

// Savol interfeysi
export interface Question {
  id: number;
  order: number;
  text: LocalizedText;
  imageUrl?: string | null;
  options: Option[];
  correctOptionIndex: number;
  explanation: LocalizedText;
}

// API dan keladigan imtihon ma'lumotlari
export interface ExamData {
  success: boolean;
  message: string;
  data: {
    sessionId: number;
    totalQuestions: number;
    durationMinutes: number;
    passingScore: number;
    startedAt: string;
    expiresAt: string;
    isMarathonMode: boolean;
    isVisibleMode: boolean;
    questions: Question[];
  };
}

// Imtihon boshlash uchun request
export interface ExamStartRequest {
  questionCount: number;
  durationMinutes: number;
}

// Javob formati
export interface Answer {
  optionIndex: number;
  timeSpentSeconds: number;
}

// Javoblar record type
export type AnswersRecord = Record<number, Answer>;

// Exam Page props
export interface ExamPageProps {
  questionCount?: number;
  durationMinutes?: number;
}

// Tilni olish uchun type
export type LanguageKey = "uzl" | "uzc" | "en" | "ru";
