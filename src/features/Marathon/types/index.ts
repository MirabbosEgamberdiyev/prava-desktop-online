// Ko'p tilli matn interfeysi
export interface LocalizedText {
  uzl: string;
  uzc: string;
  en: string;
  ru: string;
}

// Option interfeysi
export interface MarathonOption {
  id: number;
  index: number;
  text: LocalizedText;
}

// Question interfeysi
export interface MarathonQuestion {
  id: number;
  order: number;
  text: LocalizedText;
  imageUrl?: string | null;
  options: MarathonOption[];
  correctOptionIndex: number;
  explanation: LocalizedText;
}

// API dan keladigan ma'lumotlar interfeysi
export interface MarathonExamData {
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
    questions: MarathonQuestion[];
  };
}

// Javoblar uchun interfeys
export interface MarathonAnswerData {
  questionId: number;
  selectedOptionIndex: number;
  timeSpentSeconds: number;
}

// Marathon start request
export interface MarathonStartRequest {
  questionCount: number;
  durationMinutes?: number;
  topicId?: number | null;
}
