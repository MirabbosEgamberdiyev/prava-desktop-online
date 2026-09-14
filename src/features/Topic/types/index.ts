import type { LocalizedText } from "../../../types";

export interface Topic {
  id: number;
  code: string;
  name: LocalizedText;
  description?: LocalizedText;
  questionCount: number;
  isActive: boolean;
}

export interface TopicsResponse {
  success: boolean;
  message: string;
  data: Topic[];
}
