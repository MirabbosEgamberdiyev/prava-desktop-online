import api from "./api";

class FileService {
  private baseUrl = "/api/v1/files";

  async downloadByName(fileName: string, folder?: string) {
    const params = new URLSearchParams({ fileName });
    if (folder) params.append("folder", folder);
    const res = await api.get(`${this.baseUrl}/download/by-name?${params}`, {
      responseType: "blob",
      timeout: 60000,
    });
    return res.data;
  }

  async downloadByUrl(fileUrl: string) {
    const res = await api.get(
      `${this.baseUrl}/download/by-url?fileUrl=${encodeURIComponent(fileUrl)}`,
      { responseType: "blob", timeout: 60000 },
    );
    return res.data;
  }

  async existsByName(fileName: string, folder?: string) {
    const params = new URLSearchParams({ fileName });
    if (folder) params.append("folder", folder);
    const res = await api.get(`${this.baseUrl}/exists/by-name?${params}`);
    return res.data;
  }

  async existsByUrl(fileUrl: string) {
    const res = await api.get(`${this.baseUrl}/exists/by-url?fileUrl=${encodeURIComponent(fileUrl)}`);
    return res.data;
  }

  async getStorageType() {
    const res = await api.get(`${this.baseUrl}/storage-type`);
    return res.data;
  }

  getQuestionImageUrl(filename: string) {
    return `${this.baseUrl}/questions/${filename}`;
  }

  getProfileImageUrl(filename: string) {
    return `${this.baseUrl}/profiles/${filename}`;
  }

  getGeneralFileUrl(filename: string) {
    return `${this.baseUrl}/general/${filename}`;
  }
}

export const fileService = new FileService();
export default fileService;
