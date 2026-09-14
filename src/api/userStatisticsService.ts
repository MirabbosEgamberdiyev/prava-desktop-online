import api from "./api";

class UserStatisticsService {
  private baseUrl = "/api/v2/my-statistics";

  async getAll() {
    const res = await api.get(this.baseUrl);
    return res.data;
  }

  async filter(data: Record<string, unknown>) {
    const res = await api.post(`${this.baseUrl}/filter`, data);
    return res.data;
  }

  async getByPackage(packageId: number) {
    const res = await api.get(`${this.baseUrl}/package/${packageId}`);
    return res.data;
  }

  async getByTicket(ticketId: number) {
    const res = await api.get(`${this.baseUrl}/ticket/${ticketId}`);
    return res.data;
  }

  async getByTopic(topicId: number) {
    const res = await api.get(`${this.baseUrl}/topic/${topicId}`);
    return res.data;
  }

  async getMarathon() {
    const res = await api.get(`${this.baseUrl}/marathon`);
    return res.data;
  }

  async getToday() {
    const res = await api.get(`${this.baseUrl}/today`);
    return res.data;
  }

  async getThisWeek() {
    const res = await api.get(`${this.baseUrl}/this-week`);
    return res.data;
  }

  async getThisMonth() {
    const res = await api.get(`${this.baseUrl}/this-month`);
    return res.data;
  }

  async getDevices() {
    const res = await api.get(`${this.baseUrl}/devices`);
    return res.data;
  }
}

export const userStatisticsService = new UserStatisticsService();
export default userStatisticsService;
