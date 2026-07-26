/**
 * JWT token management.
 *
 * ⚠️ XAVFSIZLIK ESLATMASI
 * ─────────────────────────────────────────────────────────────────────────────
 * Tokenlar hozir localStorage'da (WebView diskdagi ochiq DB fayli) saqlanadi.
 * Bu quyidagilarni anglatadi:
 *   • kompyuterga kirgan istalgan dastur/foydalanuvchi fayldan access va
 *     refresh token'ni o'qib, boshqa qurilmadan sessiyani egallashi mumkin;
 *   • ilovaga in'ektsiya qilingan istalgan skript (masalan uchinchi tomon
 *     Google/Telegram skriptlari buzilsa) tokenlarni o'qiy oladi.
 *
 * To'g'ri yechim — refresh token'ni OS kalit omboriga ko'chirish:
 *   `tauri-plugin-stronghold` yoki `keyring` (Windows Credential Manager /
 *   macOS Keychain / libsecret) orqali Rust tomonida saqlash va faqat qisqa
 *   muddatli access token'ni xotirada (React state) ushlab turish.
 * Bu alohida ish sifatida rejalashtirilgan — hozircha eng kamida
 * XSS yuzasi CSP bilan toraytirildi (src-tauri/tauri.conf.json).
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
  if (!raw) return null;
  // Buzilgan JSON butun ilovani ishga tushmay qoldirmasin
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
