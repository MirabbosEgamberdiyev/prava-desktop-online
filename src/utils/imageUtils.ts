import { ENV } from "../config/env";
import { normalizeMediaPath } from "../services/offlineMediaManager";

const API_BASE_URL = ENV.API_BASE_URL;

export const getImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url || url.trim() === "") return undefined;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  const cleanPath = normalizeMediaPath(url) || (url.startsWith("/") ? url : `/${url}`);
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }
  const base = API_BASE_URL.replace(/\/+$/, "");
  return `${base}${cleanPath}`;
};

