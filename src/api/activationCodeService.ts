import api from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivationCodeStatus = "ACTIVE" | "EXPIRED" | "DEACTIVATED";
export type ActivationCodeGroup  = "ACTIVE" | "EXPIRING" | "EXPIRED" | "DEACTIVATED";

export interface ActivationCodeResponse {
  id: number;
  clientFirstName?: string;   // optional — absent from JSON when not provided
  clientLastName?: string;    // optional — absent from JSON when not provided
  clientFullName: string;     // always present — "—" when both names are absent
  clientPhone?: string;       // optional — absent from JSON when not provided
  learningCenter?: string;
  machineId: string;
  startDate: string;       // ISO date "YYYY-MM-DD"
  endDate: string;         // ISO date "YYYY-MM-DD"
  licenseKey: string;
  status: ActivationCodeStatus;
  displayGroup: ActivationCodeGroup;
  daysUntilExpiry: number;
  notes?: string;
  generatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivationCodeStats {
  totalAll: number;
  totalActive: number;
  totalExpiring: number;
  totalExpired: number;
  totalDeactivated: number;
}

export interface GenerateRequest {
  clientFirstName?: string;   // optional
  clientLastName?: string;    // optional
  clientPhone?: string;       // optional
  learningCenter?: string;
  machineId: string;
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // "YYYY-MM-DD"
  notes?: string;
}

export interface ListParams {
  search?: string;
  group?: string;
  status?: string;
  generatedBy?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface PageData<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

class ActivationCodeService {
  private readonly base = "/api/v1/admin/activation-codes";

  async generate(req: GenerateRequest): Promise<ActivationCodeResponse> {
    const res = await api.post(this.base, req);
    return res.data.data as ActivationCodeResponse;
  }

  async list(params: ListParams = {}): Promise<PageData<ActivationCodeResponse>> {
    const res = await api.get(this.base, { params: { size: 20, ...params } });
    return res.data.data as PageData<ActivationCodeResponse>;
  }

  async getStats(): Promise<ActivationCodeStats> {
    const res = await api.get(`${this.base}/stats`);
    return res.data.data as ActivationCodeStats;
  }

  async getById(id: number): Promise<ActivationCodeResponse> {
    const res = await api.get(`${this.base}/${id}`);
    return res.data.data as ActivationCodeResponse;
  }

  async deactivate(id: number, reason?: string): Promise<ActivationCodeResponse> {
    const res = await api.patch(`${this.base}/${id}/deactivate`, { reason: reason ?? "" });
    return res.data.data as ActivationCodeResponse;
  }

  async reactivate(id: number): Promise<ActivationCodeResponse> {
    const res = await api.patch(`${this.base}/${id}/reactivate`);
    return res.data.data as ActivationCodeResponse;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`${this.base}/${id}`);
  }
}

export const activationCodeService = new ActivationCodeService();
export default activationCodeService;
