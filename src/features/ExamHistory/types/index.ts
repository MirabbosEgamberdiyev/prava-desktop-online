import type { LocalizedText } from "../../../types";

export type HistoryFilterStatus = "ALL" | "COMPLETED" | "FAILED" | "IN_PROGRESS" | "ABANDONED";

/** Maps frontend filter to actual backend ExamStatus for the API call */
export function getApiStatus(filter: HistoryFilterStatus): string | null {
  switch (filter) {
    case "ALL": return null;
    case "COMPLETED": return "COMPLETED";
    case "FAILED": return "COMPLETED"; // Backend has no FAILED status; we fetch COMPLETED and filter client-side
    case "IN_PROGRESS": return "IN_PROGRESS";
    case "ABANDONED": return "ABANDONED";
  }
}

export interface ExamHistoryItem {
  sessionId: number;
  status: string;
  score?: number;
  percentage: number;
  isPassed?: boolean;
  passed?: boolean;
  passingScore?: number;
  totalQuestions: number;
  correctCount?: number;
  correctAnswers?: number;
  incorrectCount?: number;
  incorrectAnswers?: number;
  unansweredCount?: number;
  durationSeconds?: number;
  totalTimeSpentSeconds?: number;
  startedAt: string;
  finishedAt?: string | null;
  completedAt?: string | null;
  packageName?: LocalizedText;
  ticketName?: LocalizedText;
  ticketNumber?: number;
  isMarathonMode?: boolean;
  isMarathon?: boolean;
  isTicketMode?: boolean;
}

export interface ExamHistoryResponse {
  success: boolean;
  message: string;
  data: {
    content: ExamHistoryItem[];
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
