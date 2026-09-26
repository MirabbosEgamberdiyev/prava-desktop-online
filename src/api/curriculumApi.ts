/**
 * Curriculum (learning material) API — ported from the web app's services/curriculumApi.
 * Unlike the web version these calls THROW on failure, so the caching layer
 * (features/Curriculum/useCurriculum) can fall back to the last saved copy.
 */
import api from "./api";

export interface RoadSign {
  id: number;
  code: string;
  category: string;
  number_in_category?: number;
  title_uzl: string;
  title_uzc?: string;
  title_ru?: string;
  description_uzl?: string;
  description_uzc?: string;
  description_ru?: string;
  imageUrl?: string | null;
}

export interface RoadMarking {
  id: number;
  code: string;
  marking_type: string;
  title_uzl: string;
  title_uzc?: string;
  title_ru?: string;
  description_uzl?: string;
  description_uzc?: string;
  description_ru?: string;
  imageUrl?: string | null;
}

export interface ExamCenter {
  id: string | number;
  region_uzl: string;
  region_uzc?: string;
  region_ru?: string;
  address_uzl: string;
  address_uzc?: string;
  address_ru?: string;
  lat?: number;
  lng?: number;
  map_url?: string;
  phones?: string;
  work_days?: string;
  work_hours?: string;
  transport_uzl?: string;
  transport_uzc?: string;
  transport_ru?: string;
  price_theory?: number;
  price_practical?: number;
}

export interface PracticalExercise {
  id: number;
  exercise_number: number;
  title_uzl: string;
  title_uzc?: string;
  title_ru?: string;
  description_uzl?: string;
  description_uzc?: string;
  description_ru?: string;
  max_penalty_points?: number;
  image_url?: string | null;
}

export interface PracticalPenalty {
  id: number;
  penalty_number: number;
  severity?: string;
  points: number;
  text_uzl: string;
  text_uzc?: string;
  text_ru?: string;
}

export interface TrafficRule {
  id: number;
  chapter_num: number;
  title_uzl: string;
  title_uzc?: string;
  title_ru?: string;
  content_html_uzl?: string;
  content_html_uzc?: string;
  content_html_ru?: string;
}

export interface PracticalExamData {
  exercises: PracticalExercise[];
  penalties: PracticalPenalty[];
}

function unwrap(data: unknown): unknown {
  if (data && typeof data === "object" && "data" in (data as Record<string, unknown>)) {
    return (data as { data: unknown }).data;
  }
  return data;
}

async function getList<T>(url: string): Promise<T[]> {
  const res = await api.get(url);
  const payload = unwrap(res.data);
  if (!Array.isArray(payload)) throw new Error(`Unexpected payload for ${url}`);
  return payload as T[];
}

export const curriculumApi = {
  getSigns: () => getList<RoadSign>("/api/v1/curriculum/signs"),
  getMarkings: () => getList<RoadMarking>("/api/v1/curriculum/markings"),
  getExamCenters: () => getList<ExamCenter>("/api/v1/curriculum/exam-centers"),
  getPenalties: () => getList<PracticalPenalty>("/api/v1/curriculum/penalties"),
  getRules: () => getList<TrafficRule>("/api/v1/curriculum/rules"),
  async getPracticalExam(): Promise<PracticalExamData> {
    const res = await api.get("/api/v1/curriculum/practical-exam");
    const payload = unwrap(res.data) as Partial<PracticalExamData> | null;
    if (!payload || typeof payload !== "object") throw new Error("Unexpected practical-exam payload");
    return {
      exercises: Array.isArray(payload.exercises) ? payload.exercises : [],
      penalties: Array.isArray(payload.penalties) ? payload.penalties : [],
    };
  },
};
