import api from "./api";

class StatisticsService {
  private baseUrl = "/api/v1/statistics";

  // ===== Current User (me) Endpoints =====

  async getMyStats() {
    const res = await api.get(`${this.baseUrl}/me`);
    return res.data;
  }

  async getMyTopicStats(topic: string) {
    const res = await api.get(`${this.baseUrl}/me/topic/${topic}`);
    return res.data;
  }

  async getMyDashboard() {
    const res = await api.get(`${this.baseUrl}/me/dashboard`);
    return res.data;
  }

  async getMyExams(params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "startedAt", direction = "DESC" } = params || {};
    const res = await api.get(`${this.baseUrl}/me/exams?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }

  async getMyExamsByTopic(topic: string, params?: { page?: number; size?: number }) {
    const { page = 0, size = 10 } = params || {};
    const res = await api.get(`${this.baseUrl}/me/exams/topic/${topic}?page=${page}&size=${size}`);
    return res.data;
  }

  // ===== Leaderboard =====

  async getLeaderboard(topic: string, params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "bestScore", direction = "DESC" } = params || {};
    const res = await api.get(`${this.baseUrl}/leaderboard/${topic}?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }

  async getGlobalLeaderboard(params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "bestScore", direction = "DESC" } = params || {};
    const res = await api.get(`${this.baseUrl}/leaderboard/global?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }
}

export const statisticsService = new StatisticsService();
export default statisticsService;
