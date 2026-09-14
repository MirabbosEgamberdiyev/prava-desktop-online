// Ma'lumotlar strukturasini loyihangizga qarab moslang
export interface Package {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  actualQuestionCount: number;
  questionCount: number;
  generationType: "MANUAL" | "AUTO"; // yoki string
  isActive: boolean;
  isFree: boolean;
  orderIndex: number;
  passingScore: number;
  price: number;
  topicName: string | null;
}

export interface PackageResponse {
  data: {
    content: Package[];
    totalElements: number;
    totalPages: number;
  };
}
