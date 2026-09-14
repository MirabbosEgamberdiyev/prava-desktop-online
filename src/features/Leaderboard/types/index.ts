export interface LeaderboardEntry {
  rank: number;
  userId: number;
  fullName: string;
  bestScore: number;
  averageScore: number;
  totalExams: number;
  currentStreak: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  success: boolean;
  message: string;
  data: {
    content: LeaderboardEntry[];
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface TopicItem {
  id: number;
  name: string;
  questionCount: number;
}

export interface TopicsResponse {
  success: boolean;
  message: string;
  data: TopicItem[];
}
