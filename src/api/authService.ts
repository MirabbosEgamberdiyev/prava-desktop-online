import api from "./api";

class AuthService {
  private baseUrl = "/api/v1/auth";

  async login(identifier: string, password: string) {
    const res = await api.post(`${this.baseUrl}/login`, { identifier, password });
    return res.data;
  }

  async registerInit(data: { phoneNumber?: string; email?: string }) {
    const res = await api.post(`${this.baseUrl}/register/init`, data);
    return res.data;
  }

  async registerComplete(data: { identifier: string; code: string; firstName: string; lastName?: string; password: string }) {
    const res = await api.post(`${this.baseUrl}/register/complete`, data);
    return res.data;
  }

  async logout(refreshToken: string) {
    const res = await api.post(`${this.baseUrl}/logout`, { refreshToken });
    return res.data;
  }

  async refresh(refreshToken: string) {
    const res = await api.post(`${this.baseUrl}/refresh`, { refreshToken });
    return res.data;
  }

  async getMe() {
    const res = await api.get(`${this.baseUrl}/me`);
    return res.data;
  }

  async getConfig() {
    const res = await api.get(`${this.baseUrl}/config`);
    return res.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await api.post(`${this.baseUrl}/change-password`, { currentPassword, newPassword });
    return res.data;
  }

  async forgotPassword(identifier: string) {
    const res = await api.post(`${this.baseUrl}/forgot-password`, { identifier });
    return res.data;
  }

  async resetPassword(identifier: string, code: string, newPassword: string) {
    const res = await api.post(`${this.baseUrl}/reset-password`, { identifier, code, newPassword });
    return res.data;
  }

  async googleLogin(data: { idToken: string }) {
    const res = await api.post(`${this.baseUrl}/google`, data);
    return res.data;
  }

  async telegramLogin(data: Record<string, unknown>) {
    const res = await api.post(`${this.baseUrl}/telegram`, data);
    return res.data;
  }

  async telegramTokenLogin(data: { token: string }) {
    const res = await api.post(`${this.baseUrl}/telegram/token-login`, data);
    return res.data;
  }
}

export const authService = new AuthService();
export default authService;
