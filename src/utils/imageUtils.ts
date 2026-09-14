import { ENV } from "../config/env";

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

  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${cleanPath}`;
};
