// Ticket status type
export type TicketStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";

// Ko'p tilli matn interfeysi
export interface LocalizedText {
  uzl: string;
  uzc: string;
  en: string;
  ru: string;
}

// Ticket interfeysi
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

// API Response interfeysi
export interface TicketsResponse {
  success: boolean;
  message: string;
  data: {
    content: Ticket[];
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

// Option interfeysi
export interface Option {
  id: number;
  index: number;
  text: LocalizedText;
}

// Question interfeysi
export interface Question {
  id: number;
  order: number;
  text: LocalizedText;
  imageUrl?: string | null;
  options: Option[];
  correctOptionIndex: number;
  explanation: LocalizedText;
}

// Ticket Exam Data interfeysi
export interface TicketExamData {
  success: boolean;
  message: string;
  data: {
    sessionId: number;
    ticketId: number;
    ticketNumber: number;
    ticketName: LocalizedText;
    totalQuestions: number;
    durationMinutes: number;
    passingScore: number;
    startedAt: string;
    expiresAt: string;
    questions: Question[];
  };
}
