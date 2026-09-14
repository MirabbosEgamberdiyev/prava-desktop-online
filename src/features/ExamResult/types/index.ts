import type { LocalizedText } from "../../../types";

export type ExamStatus = "COMPLETED" | "EXPIRED" | "IN_PROGRESS" | "ABANDONED";

export interface AnswerDetail {
  questionId: number;
  questionOrder: number;
  questionText: LocalizedText;
  imageUrl?: string | null;
  options: {
    id: number;
    index: number;
    text: LocalizedText;
  }[];
  correctOptionIndex: number;
  selectedOptionIndex: number | null;
  isCorrect: boolean | null;
  timeSpentSeconds: number | null;
  explanation: LocalizedText;
}

/**
 * Matches the backend ExamResultResponse DTO exactly.
 * Backend fields: sessionId, packageId, packageName, topicId, topicName,
 * status, isMarathonMode, totalQuestions, answeredCount, correctCount,
 * incorrectCount, unansweredCount, score, percentage, isPassed, passingScore,
 * startedAt, finishedAt, durationSeconds, averageTimePerQuestion, answerDetails
 */
export interface ExamResultResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: number;
    packageId: number | null;
    packageName: LocalizedText | null;
    topicId: number | null;
    topicName: LocalizedText | null;
    status: ExamStatus;
    isMarathonMode: boolean;
    totalQuestions: number;
    answeredCount: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    score: number;
    percentage: number;
    isPassed: boolean;
    passingScore: number;
    startedAt: string;
    finishedAt: string;
    durationSeconds: number;
    averageTimePerQuestion: number;
    answerDetails: AnswerDetail[];
  };
}
