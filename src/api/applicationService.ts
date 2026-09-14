import api from "./api";
import { ENV } from "../config/env";
import type { AppReleaseResponse } from "../features/Downloads/types";

// Public API — autentifikatsiya talab qilinmaydi
const PUBLIC_BASE = "/api/v1/public/app-releases";

interface ApiResponse<T> {
  success: boolean;
  data:    T;
  message?: string;
}

/**
 * Barcha platformalar uchun eng so'nggi (isLatest=true, ACTIVE) relizlar.
 * Foydalanuvchi panelining "Ilovalar yuklab olish" sahifasida ishlatiladi.
 */
export const getLatestReleases = async (lang = "uzl"): Promise<AppReleaseResponse[]> => {
  const res = await api.get<ApiResponse<AppReleaseResponse[]>>(PUBLIC_BASE + "/latest", {
    params: { lang },
  });
  return res.data.data ?? [];
};

/**
 * Yangilanish tekshiruvi — desktop ilova chaqiradi.
 */
export const checkUpdate = async (
  platform: string,
  appType:  string,
  currentVersionCode: number,
  lang = "uzl"
) => {
  const res = await api.get(PUBLIC_BASE + "/check-update", {
    params: { platform, appType, currentVersionCode, lang },
  });
  return res.data.data;
};

/**
 * Yuklab olish URL ini qaytaradi va download_count ni oshiradi.
 * Backend 302 redirect qaytaradi — brauzer to'g'ridan-to'g'ri faylga boradi.
 * Bu funksiya to'g'ridan-to'g'ri URL yaratadi (redirect uchun).
 */
export const getDownloadUrl = (id: number): string =>
  `${ENV.API_BASE_URL}${PUBLIC_BASE}/download/${id}`;
