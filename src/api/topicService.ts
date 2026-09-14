import api from "./api";

class TopicService {
  private baseUrl = "/api/v1/admin/topics";

  async getWithQuestions() {
    const res = await api.get(`${this.baseUrl}/with-questions`);
    return res.data;
  }

  async getActive() {
    const res = await api.get(`${this.baseUrl}/active`);
    return res.data;
  }

  async getSimple() {
    const res = await api.get(`${this.baseUrl}/simple`);
    return res.data;
  }

  async getByCode(code: string) {
    const res = await api.get(`${this.baseUrl}/code/${code}`);
    return res.data;
  }
}

export const topicService = new TopicService();
export default topicService;
