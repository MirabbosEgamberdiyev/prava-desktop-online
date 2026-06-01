/**
 * JWT token management — localStorage'da saqlanadi.
 */

const ACCESS_KEY  = "prava_access_token";
const REFRESH_KEY = "prava_refresh_token";
const USER_KEY    = "prava_user";

export function saveTokens(accessToken: string, refreshToken: string, user: object) {
  localStorage.setItem(ACCESS_KEY,  accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY,    JSON.stringify(user));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getSavedUser(): object | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
