// ─── Localized text (backend: LocalizedText) ─────────────────────────────────
export interface LocalizedText {
  uzl?: string;
  uzc?: string;
  en?: string;
  ru?: string;
}

// ─── License ──────────────────────────────────────────────────────────────────
export interface LicenseStatus {
  is_valid: boolean;
  is_expired: boolean;
  days_remaining: number;
  expires_at: string;
  machine_id: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  preferredLanguage?: string;
  isActive?: boolean;
  profileImageUrl?: string;
}

// ─── Topic ────────────────────────────────────────────────────────────────────
export interface TopicResponse {
  id: number;
  code?: string;
  name?: string;
  nameUzl?: string;
  nameUzc?: string;
  nameEn?: string;
  nameRu?: string;
  description?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  questionCount?: number;
}

// ─── Package ──────────────────────────────────────────────────────────────────
export interface PackageResponse {
  id: number;
  name?: string;
  description?: string;
  questionCount?: number;
  durationMinutes?: number;
  passingScore?: number;
  generationType?: string;
  topic?: string;
  topicName?: string;
  isActive?: boolean;
  isFree?: boolean;
  price?: number;
  orderIndex?: number;
  actualQuestionCount?: number;
}

// ─── Question Option ──────────────────────────────────────────────────────────
export interface OptionResponse {
  id?: number;
  index?: number;
  text?: LocalizedText;
}

// ─── Question ─────────────────────────────────────────────────────────────────
export interface QuestionResponse {
  id: number;
  order?: number;
  text?: LocalizedText;
  imageUrl?: string;
  options?: OptionResponse[];
  correctOptionIndex?: number;  // only in visible mode
  explanation?: LocalizedText;  // only in visible mode
}

// ─── Exam ─────────────────────────────────────────────────────────────────────
export interface ExamResponse {
  sessionId?: number;
  ticketId?: number;
  ticketNumber?: number;
  ticketName?: LocalizedText;
  packageId?: number;
  packageName?: LocalizedText;
  topicId?: number;
  topicName?: LocalizedText;
  totalQuestions?: number;
  durationMinutes?: number;
  passingScore?: number;
  startedAt?: string;
  expiresAt?: string;
  isMarathonMode?: boolean;
  isVisibleMode?: boolean;
  questions?: QuestionResponse[];
}

// ─── Exam Result ──────────────────────────────────────────────────────────────
export interface AnswerDetailResponse {
  questionId?: number;
  questionText?: LocalizedText;
  imageUrl?: string;
  options?: OptionResponse[];
  selectedOptionIndex?: number;
  correctOptionIndex?: number;
  isCorrect?: boolean;
  explanation?: LocalizedText;
}

export interface ExamResultResponse {
  sessionId?: number;
  totalQuestions?: number;
  answeredCount?: number;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  score?: number;
  percentage?: number;
  isPassed?: boolean;
  passingScore?: number;
  durationSeconds?: number;
  averageTimePerQuestion?: number;
  answerDetails?: AnswerDetailResponse[];
}

export interface SubmitAnswerRequest {
  sessionId: number;
  answers: { questionId: number; selectedOptionIndex: number }[];
}

// ─── Ticket ───────────────────────────────────────────────────────────────────
export interface TicketResponse {
  id: number;
  ticketNumber?: number;
  name?: LocalizedText;
  description?: LocalizedText;
  packageId?: number;
  topicId?: number;
  topicName?: LocalizedText;
  questionCount?: number;
  durationMinutes?: number;
  passingScore?: number;
  isActive?: boolean;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
// Field names match actual backend response (ComprehensiveStatisticsResponse)
export interface ComprehensiveStatisticsResponse {
  summary?: {
    totalExams?: number;
    completedExams?: number;
    passedExams?: number;
    failedExams?: number;
    passRate?: number;
    correctAnswers?: number;      // backend field name
    wrongAnswers?: number;        // backend field name
    accuracy?: number;
    averageScore?: number;
    bestScore?: number;
    totalTimeSpentSeconds?: number;
  };
  ticketStats?: {
    ticketId?: number;
    ticketNumber?: number;
    ticketName?: LocalizedText;
    totalExams?: number;          // backend field name (was timesAttempted)
    passedExams?: number;         // backend field name (was timesPassed)
    bestScore?: number;
    averageScore?: number;
    lastAttemptDate?: string;
  }[];
  topicStats?: {
    topicId?: number;
    topicName?: LocalizedText;
    topicCode?: string;
    totalExams?: number;
    passedExams?: number;
    averageScore?: number;
    accuracy?: number;
  }[];
  packageStats?: {
    packageId?: number;
    packageName?: LocalizedText;
    totalExams?: number;
    passedExams?: number;
    averageScore?: number;
    bestScore?: number;
  }[];
}

// ─── Wrong Answers ────────────────────────────────────────────────────────────
export interface WrongAnswerResponse {
  questionId: number;
  wrongCount: number;
  lastSeen: string;
  text?: LocalizedText;
  imageUrl?: string;
  options?: OptionResponse[];
  correctOptionIndex?: number;
  explanation?: LocalizedText;
  topicId?: number;
  topicName?: LocalizedText;
}

// ─── Saved Questions ──────────────────────────────────────────────────────────
export interface SavedQuestionResponse {
  questionId: number;
  savedAt: string;
  text?: LocalizedText;
  imageUrl?: string;
  options?: OptionResponse[];
  correctOptionIndex?: number;
  explanation?: LocalizedText;
  topicId?: number;
  topicName?: LocalizedText;
}

// ─── App Screens ──────────────────────────────────────────────────────────────
export type AppScreen =
  | "license"
  | "login"
  | "register"
  | "forgot-password"
  | "home"
  | "exam"
  | "marathon"
  | "topics"
  | "stats"
  | "biletlar"
  | "ticket-exam"
  | "wrong-answers"
  | "saved-questions";
