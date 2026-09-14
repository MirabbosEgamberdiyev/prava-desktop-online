export interface LocalizedText {
  uzl: string;
  uzc: string;
  en: string;
  ru: string;
}

export type LanguageKey = "uzl" | "uzc" | "en" | "ru";

export interface Option {
  id: number;
  index: number;
  text: LocalizedText;
}

export interface Question {
  id: number;
  order: number;
  text: LocalizedText;
  imageUrl?: string | null;
  options: Option[];
  correctOptionIndex: number;
  explanation: LocalizedText;
}

export interface Answer {
  optionIndex: number;
  timeSpentSeconds: number;
}

export type AnswersMap = Record<number, Answer>;

export interface ExamSessionData {
  sessionId: number;
  totalQuestions: number;
  durationMinutes: number;
  passingScore: number;
  startedAt: string;
  expiresAt: string;
  questions: Question[];
}

export interface PackageExamData {
  success: boolean;
  message: string;
  data: ExamSessionData & {
    packageId: number;
    packageName: LocalizedText;
    isMarathonMode: boolean;
    isVisibleMode: boolean;
  };
}

export interface TicketExamData {
  success: boolean;
  message: string;
  data: ExamSessionData & {
    ticketId: number;
    ticketNumber: number;
    ticketName: LocalizedText;
  };
}

export interface MarathonExamData {
  success: boolean;
  message: string;
  data: ExamSessionData & {
    isMarathonMode: boolean;
    isVisibleMode: boolean;
  };
}

export interface Ticket {
  id: number;
  ticketNumber: number;
  name: LocalizedText;
  questionCount: number;
  durationMinutes: number;
  passingScore: number;
  isFree: boolean;
  price: number;
}

export interface PaginatedData<T> {
  content: T[];
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
