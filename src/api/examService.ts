import api from "./api";

class ExamService {
  // ===== V2 Endpoints =====
  private v2Base = "/api/v2/exams";

  async startVisible(data: { packageId: number }) {
    const res = await api.post(`${this.v2Base}/start-visible`, data);
    return res.data;
  }

  async startSecure(data: { packageId: number }) {
    const res = await api.post(`${this.v2Base}/start-secure`, data);
    return res.data;
  }

  async marathonStartVisible(data: { questionCount: number; durationMinutes?: number; topicId?: number }) {
    const res = await api.post(`${this.v2Base}/marathon/start-visible`, data);
    return res.data;
  }

  async marathonStartSecure(data: { questionCount: number; durationMinutes?: number; topicId?: number }) {
    const res = await api.post(`${this.v2Base}/marathon/start-secure`, data);
    return res.data;
  }

  async submit(data: { sessionId: number; answers: Record<string, { optionIndex: number; timeSpentSeconds: number }> }) {
    const res = await api.post(`${this.v2Base}/submit`, data);
    return res.data;
  }

  async checkAnswer(data: { questionId: number; selectedOptionIndex: number }) {
    const res = await api.post(`${this.v2Base}/check-answer`, data);
    return res.data;
  }

  async getResult(sessionId: number) {
    const res = await api.get(`${this.v2Base}/${sessionId}/result`);
    return res.data;
  }

  async getStatistics(sessionId: number) {
    const res = await api.get(`${this.v2Base}/${sessionId}/statistics`);
    return res.data;
  }

  async getHistory(params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "startedAt", direction = "DESC" } = params || {};
    const res = await api.get(`${this.v2Base}/history?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }

  async getHistoryByStatus(status: string, params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "startedAt", direction = "DESC" } = params || {};
    const res = await api.get(`${this.v2Base}/history/status/${status}?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }

  async abandon(sessionId: number) {
    const res = await api.delete(`${this.v2Base}/${sessionId}/abandon`);
    return res.data;
  }

  async autosave(sessionId: number, answers: Record<string, { optionIndex: number; timeSpentSeconds: number }>) {
    const res = await api.put(`${this.v2Base}/${sessionId}/autosave`, { answers });
    return res.data;
  }

  async getActive() {
    const res = await api.get(`${this.v2Base}/active`);
    return res.data;
  }

  async getPackageStatistics(packageId: number) {
    const res = await api.get(`${this.v2Base}/packages/${packageId}/statistics`);
    return res.data;
  }

  // ===== V1 Endpoints =====
  private v1Base = "/api/v1/exams";

  async v1Start(data: { packageId: number }) {
    const res = await api.post(`${this.v1Base}/start`, data);
    return res.data;
  }

  async v1Marathon(data: { questionCount: number; topicId?: number }) {
    const res = await api.post(`${this.v1Base}/marathon`, data);
    return res.data;
  }

  async v1Submit(data: { sessionId: number; answers: Record<string, { optionIndex: number; timeSpentSeconds: number }> }) {
    const res = await api.post(`${this.v1Base}/submit`, data);
    return res.data;
  }

  async v1GetResult(sessionId: number) {
    const res = await api.get(`${this.v1Base}/${sessionId}/result`);
    return res.data;
  }

  async v1GetHistory(params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "startedAt", direction = "DESC" } = params || {};
    const res = await api.get(`${this.v1Base}/history?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }

  async v1GetHistoryByStatus(status: string, params?: { page?: number; size?: number }) {
    const { page = 0, size = 20 } = params || {};
    const res = await api.get(`${this.v1Base}/history/status/${status}?page=${page}&size=${size}`);
    return res.data;
  }

  async v1GetHistorySummary() {
    const res = await api.get(`${this.v1Base}/history/summary`);
    return res.data;
  }

  async v1GetActive() {
    const res = await api.get(`${this.v1Base}/active`);
    return res.data;
  }

  async v1HasActive() {
    const res = await api.get(`${this.v1Base}/has-active`);
    return res.data;
  }

  async v1Abandon(sessionId: number) {
    const res = await api.delete(`${this.v1Base}/${sessionId}/abandon`);
    return res.data;
  }

  async v1GetStatistics(sessionId: number) {
    const res = await api.get(`${this.v1Base}/${sessionId}/statistics`);
    return res.data;
  }
}

export const examService = new ExamService();
export default examService;
