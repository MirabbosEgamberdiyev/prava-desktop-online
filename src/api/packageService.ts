import api from "./api";

class PackageService {
  private baseUrl = "/api/v1/packages";

  async getAll(params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "orderIndex", direction = "ASC" } = params || {};
    const res = await api.get(`${this.baseUrl}?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }

  async getFree(params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "orderIndex", direction = "ASC" } = params || {};
    const res = await api.get(`${this.baseUrl}/free?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }

  async getById(id: number) {
    const res = await api.get(`${this.baseUrl}/${id}`);
    return res.data;
  }

  async getByTopicCode(topicCode: string, params?: { page?: number; size?: number; sortBy?: string; direction?: string }) {
    const { page = 0, size = 20, sortBy = "orderIndex", direction = "ASC" } = params || {};
    const res = await api.get(`${this.baseUrl}/topic/${topicCode}?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`);
    return res.data;
  }

  async getCount() {
    const res = await api.get(`${this.baseUrl}/count`);
    return res.data;
  }
}

export const packageService = new PackageService();
export default packageService;
