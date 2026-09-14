export interface StoredOption {
  uzl: string;
  uzc?: string;
  ru?: string;
}

export interface StoredQuestion {
  id: number;
  ticketId?: number | null;
  ticketNumber?: number | null;
  topicId?: number | null;
  orderNum?: number;
  textUzl: string;
  textUzc?: string | null;
  textRu?: string | null;
  explanationUzl?: string | null;
  explanationUzc?: string | null;
  explanationRu?: string | null;
  imageUrl?: string | null;
  options: StoredOption[];
  correctOption: number;
}

export interface StoredExamResult {
  id: number;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  durationSeconds: number;
  examType: string;
  createdAt: string;
}

export interface StoredTicketStat {
  ticketId: number;
  timesDone: number;
  timesPassed: number;
  bestCorrect: number;
  lastScore: number;
  lastDuration: number;
  fastPerfectCount: number;
}

const STORAGE_KEYS = {
  WRONG_ANSWERS: "prava_wrong_answers_v1",
  SAVED_QUESTIONS: "prava_saved_questions_v1",
  EXAM_HISTORY: "prava_exam_history_v1",
  TICKET_STATS: "prava_ticket_stats_v1",
  QUESTION_ATTEMPTS: "prava_question_attempts_v1",
};

function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("prava-storage-changed"));
  } catch {
    // ignore
  }
}

export const storageService = {
  // ── WRONG ANSWERS ──
  getWrongAnswers(): { question: StoredQuestion; date: string; wrongCount?: number }[] {
    return safeGet<{ question: StoredQuestion; date: string; wrongCount?: number }[]>(STORAGE_KEYS.WRONG_ANSWERS, []);
  },

  addWrongAnswer(question: StoredQuestion): void {
    const list = this.getWrongAnswers();
    const existingIndex = list.findIndex((w) => w.question.id === question.id);
    if (existingIndex >= 0) {
      list[existingIndex].date = new Date().toISOString();
      list[existingIndex].question = question;
      list[existingIndex].wrongCount = (list[existingIndex].wrongCount || 1) + 1;
    } else {
      list.unshift({ question, date: new Date().toISOString(), wrongCount: 1 });
    }
    safeSet(STORAGE_KEYS.WRONG_ANSWERS, list);
  },

  removeWrongAnswer(questionId: number): void {
    const list = this.getWrongAnswers().filter((w) => w.question.id !== questionId);
    safeSet(STORAGE_KEYS.WRONG_ANSWERS, list);
  },

  hasWrongAnswer(questionId: number): boolean {
    return this.getWrongAnswers().some((w) => w.question.id === questionId);
  },

  // ── SAVED QUESTIONS (BOOKMARKS) ──
  getSavedQuestions(): { question: StoredQuestion; date: string }[] {
    return safeGet<{ question: StoredQuestion; date: string }[]>(STORAGE_KEYS.SAVED_QUESTIONS, []);
  },

  isSaved(questionId: number): boolean {
    return this.getSavedQuestions().some((s) => s.question.id === questionId);
  },

  toggleSavedQuestion(question: StoredQuestion): boolean {
    const list = this.getSavedQuestions();
    const idx = list.findIndex((s) => s.question.id === question.id);
    if (idx >= 0) {
      list.splice(idx, 1);
      safeSet(STORAGE_KEYS.SAVED_QUESTIONS, list);
      return false;
    } else {
      list.unshift({ question, date: new Date().toISOString() });
      safeSet(STORAGE_KEYS.SAVED_QUESTIONS, list);
      return true;
    }
  },

  removeSavedQuestion(questionId: number): void {
    const list = this.getSavedQuestions().filter((s) => s.question.id !== questionId);
    safeSet(STORAGE_KEYS.SAVED_QUESTIONS, list);
  },

  // ── QUESTION ATTEMPTS ──
  recordQuestionAttempt(questionId: number, isCorrect: boolean): void {
    const map = safeGet<Record<number, { correct: number; total: number }>>(
      STORAGE_KEYS.QUESTION_ATTEMPTS,
      {}
    );
    const prev = map[questionId] || { correct: 0, total: 0 };
    map[questionId] = {
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    };
    safeSet(STORAGE_KEYS.QUESTION_ATTEMPTS, map);
  },

  getQuestionAttempts(): Record<number, { correct: number; total: number }> {
    return safeGet<Record<number, { correct: number; total: number }>>(
      STORAGE_KEYS.QUESTION_ATTEMPTS,
      {}
    );
  },

  // ── TICKET STATS ──
  getTicketStats(): Record<number, StoredTicketStat> {
    return safeGet<Record<number, StoredTicketStat>>(STORAGE_KEYS.TICKET_STATS, {});
  },

  saveTicketStat(
    ticketId: number,
    duration: number,
    correct: number,
    score: number,
    isPassed: boolean
  ): void {
    const map = this.getTicketStats();
    const prev = map[ticketId] || {
      ticketId,
      timesDone: 0,
      timesPassed: 0,
      bestCorrect: 0,
      lastScore: 0,
      lastDuration: 0,
      fastPerfectCount: 0,
    };

    const isFastPerfect = correct >= 20 && duration <= 600;

    map[ticketId] = {
      ticketId,
      timesDone: prev.timesDone + 1,
      timesPassed: prev.timesPassed + (isPassed ? 1 : 0),
      bestCorrect: Math.max(prev.bestCorrect, correct),
      lastScore: score,
      lastDuration: duration,
      fastPerfectCount: Math.min(5, prev.fastPerfectCount + (isFastPerfect ? 1 : 0)),
    };
    safeSet(STORAGE_KEYS.TICKET_STATS, map);
  },

  // ── EXAM HISTORY ──
  getExamHistory(): StoredExamResult[] {
    return safeGet<StoredExamResult[]>(STORAGE_KEYS.EXAM_HISTORY, []);
  },

  saveExamResult(data: {
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    durationSeconds: number;
    examType: string;
  }): StoredExamResult {
    const list = this.getExamHistory();
    const entry: StoredExamResult = {
      id: Date.now(),
      ...data,
      createdAt: new Date().toISOString(),
    };
    list.unshift(entry);
    safeSet(STORAGE_KEYS.EXAM_HISTORY, list);
    return entry;
  },

  // ── RESET ALL STATS ──
  resetAllStats(): void {
    localStorage.removeItem(STORAGE_KEYS.WRONG_ANSWERS);
    localStorage.removeItem(STORAGE_KEYS.SAVED_QUESTIONS);
    localStorage.removeItem(STORAGE_KEYS.EXAM_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.TICKET_STATS);
    localStorage.removeItem(STORAGE_KEYS.QUESTION_ATTEMPTS);
    window.dispatchEvent(new Event("prava-storage-changed"));
  },
};

export default storageService;
