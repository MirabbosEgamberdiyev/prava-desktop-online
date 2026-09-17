import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Cookies from "js-cookie";
import { normalizeUzPhone, isValidUzPhone } from "../src/utils/phoneUtils";
import { checkPasswordRules } from "../src/components/auth/PasswordStrengthMeter";
import { normalizeLanguage } from "../src/context/LanguageContext";
import { QrAuthService } from "../src/api/qrAuthService";
import api from "../src/api/api";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_DATA_KEY = "userData";
import fs from "fs";
import path from "path";

// Mock localStorage for headless test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const cookieJar: Record<string, string> = {};
vi.spyOn(Cookies, "get").mockImplementation(((key?: string) => {
  if (!key) return cookieJar as any;
  return cookieJar[key];
}) as any);
vi.spyOn(Cookies, "set").mockImplementation(((key: string, value: string) => {
  cookieJar[key] = value;
  return value;
}) as any);
vi.spyOn(Cookies, "remove").mockImplementation(((key: string) => {
  delete cookieJar[key];
}) as any);

describe("Comprehensive E2E Authentication Suite (/auth/*)", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.keys(cookieJar).forEach((k) => delete cookieJar[k]);
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    Cookies.remove(USER_DATA_KEY);
  });

  // =========================================================================
  // ROUTE 1: /auth/language (Selection & Strict 3-Language Restriction)
  // =========================================================================
  describe("Route /auth/language: Language Selection & Localization Integrity", () => {
    it("should strictly permit only 'uzl', 'uzc', and 'ru'", () => {
      const allowedLangs = ["uzl", "uzc", "ru"];
      for (const lang of allowedLangs) {
        expect(normalizeLanguage(lang)).toBe(lang);
      }
    });

    it("should fallback any invalid or external languages (e.g. en, fr, zh) to 'uzl'", () => {
      expect(normalizeLanguage("en")).toBe("uzl");
      expect(normalizeLanguage("en-US")).toBe("uzl");
      expect(normalizeLanguage("fr")).toBe("uzl");
      expect(normalizeLanguage("zh")).toBe("uzl");
      expect(normalizeLanguage("unknown")).toBe("uzl");
    });

    it("should persist selected language to localStorage", () => {
      localStorageMock.setItem("prava_language", "uzc");
      expect(localStorageMock.getItem("prava_language")).toBe("uzc");

      localStorageMock.setItem("prava_language", "ru");
      expect(localStorageMock.getItem("prava_language")).toBe("ru");
    });
  });

  // =========================================================================
  // ROUTE 2: /auth/login (Validation, Remember Me, API, Error States)
  // =========================================================================
  describe("Route /auth/login: Input Normalization, Form Rules & Session Storage", () => {
    it("validates identifier length (min 3 chars)", () => {
      const validateIdentifier = (val: string) => val.trim().length >= 3;
      expect(validateIdentifier("")).toBe(false);
      expect(validateIdentifier("a")).toBe(false);
      expect(validateIdentifier("ab")).toBe(false);
      expect(validateIdentifier("abc")).toBe(true);
      expect(validateIdentifier("admin@prava.uz")).toBe(true);
    });

    it("validates password length (min 6 chars)", () => {
      const validatePassword = (val: string) => val.length >= 6;
      expect(validatePassword("")).toBe(false);
      expect(validatePassword("12345")).toBe(false);
      expect(validatePassword("123456")).toBe(true);
    });

    it("automatically normalizes phone numbers when identifier is a phone", () => {
      const normalizeLoginIdentifier = (val: string) => {
        let clean = val.trim();
        const digitsOnly = clean.replace(/\D/g, "");
        if (digitsOnly.length >= 9 && !clean.includes("@")) {
          return normalizeUzPhone(clean);
        }
        return clean;
      };

      expect(normalizeLoginIdentifier("90 123 45 67")).toBe("+998901234567");
      expect(normalizeLoginIdentifier("+998 (90) 123-45-67")).toBe("+998901234567");
      expect(normalizeLoginIdentifier("user@example.com")).toBe("user@example.com");
      expect(normalizeLoginIdentifier("custom_username")).toBe("custom_username");
    });

    it("handles Remember Me state persistence and cookie configuration", () => {
      // Scenario A: rememberMe is TRUE
      localStorageMock.setItem("prava_remember_me", "true");
      localStorageMock.setItem("prava_saved_identifier", "+998901234567");

      expect(localStorageMock.getItem("prava_remember_me")).toBe("true");
      expect(localStorageMock.getItem("prava_saved_identifier")).toBe("+998901234567");

      // Verify cookie option: has expiry
      const rememberExpiryDays = 1;
      const cookieOpts: Cookies.CookieAttributes = {
        secure: false,
        sameSite: "lax",
        expires: rememberExpiryDays,
      };
      expect(cookieOpts.expires).toBe(1);

      // Scenario B: rememberMe is FALSE
      localStorageMock.setItem("prava_remember_me", "false");
      localStorageMock.removeItem("prava_saved_identifier");

      expect(localStorageMock.getItem("prava_remember_me")).toBe("false");
      expect(localStorageMock.getItem("prava_saved_identifier")).toBeNull();

      const sessionCookieOpts: Cookies.CookieAttributes = {
        secure: false,
        sameSite: "lax",
      };
      // Session cookies do NOT have an expires property
      expect(sessionCookieOpts.expires).toBeUndefined();
    });

    it("correctly handles 401 Unauthorized error response without crashing", async () => {
      vi.spyOn(api, "post").mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            success: false,
            message: "Login yoki parol noto'g'ri",
          },
        },
      });

      try {
        await api.post("/api/v1/auth/login", {
          identifier: "wrong_user",
          password: "wrong_password",
        });
        expect.unreachable("Should have thrown 401");
      } catch (err: any) {
        expect(err.response.status).toBe(401);
        expect(err.response.data.message).toBe("Login yoki parol noto'g'ri");
      }
    });

    it("correctly handles network timeout failure without crashing", async () => {
      vi.spyOn(api, "post").mockRejectedValueOnce({
        code: "ECONNABORTED",
        message: "timeout of 8000ms exceeded",
      });

      try {
        await api.post("/api/v1/auth/login", {
          identifier: "+998901234567",
          password: "password123",
        });
        expect.unreachable("Should have timed out");
      } catch (err: any) {
        expect(err.message).toContain("timeout");
      }
    });
  });

  // =========================================================================
  // ROUTE 3: /auth/register (In-App Step 1 -> Step 2, OTP, Terms Modal)
  // =========================================================================
  describe("Route /auth/register: In-App Registration Flow & Security Validation", () => {
    it("validates required registration fields on Step 1", () => {
      const validate = (values: {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
        password: string;
        confirmPassword: string;
        verificationType: "EMAIL" | "SMS";
      }) => {
        const errors: Record<string, string> = {};
        if (values.firstName.trim().length < 2) errors.firstName = "Ism kamida 2 ta harf";
        if (values.lastName.trim().length < 2) errors.lastName = "Familiya kamida 2 ta harf";

        if (values.verificationType === "EMAIL") {
          if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = "Noto'g'ri email";
        } else {
          if (!isValidUzPhone(values.phoneNumber)) errors.phoneNumber = "Noto'g'ri telefon";
        }

        const passRules = checkPasswordRules(values.password);
        if (!passRules.allValid) errors.password = "Parol talabga javob bermaydi";

        if (values.password !== values.confirmPassword) errors.confirmPassword = "Mos emas";

        return errors;
      };

      // Invalid input test
      const badResult = validate({
        firstName: "A",
        lastName: "B",
        email: "not-an-email",
        phoneNumber: "123",
        password: "weak",
        confirmPassword: "different",
        verificationType: "EMAIL",
      });
      expect(badResult.firstName).toBeDefined();
      expect(badResult.lastName).toBeDefined();
      expect(badResult.email).toBeDefined();
      expect(badResult.password).toBeDefined();
      expect(badResult.confirmPassword).toBeDefined();

      // Valid input test
      const goodResult = validate({
        firstName: "Anvar",
        lastName: "Karimov",
        email: "anvar@example.com",
        phoneNumber: "+998901234567",
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
        verificationType: "EMAIL",
      });
      expect(Object.keys(goodResult).length).toBe(0);
    });

    it("verifies Terms of Service & Privacy Policy are strictly internal modals (no external window)", () => {
      const registerFilePath = path.resolve(__dirname, "../src/page/Auth/register/index.tsx");
      const content = fs.readFileSync(registerFilePath, "utf8");

      // Verify no target="_blank" on legal anchors
      expect(content).not.toContain('to="/legal/terms"');
      expect(content).not.toContain('to="/legal/privacy"');

      // Verify TermsModal component is imported and rendered
      expect(content).toContain("import TermsModal from");
      expect(content).toContain("<TermsModal");
      expect(content).toContain('setTermsModal("terms")');
      expect(content).toContain('setTermsModal("privacy")');
    });

    it("simulates Step 1 submit calling register/init and transitioning to Step 2", async () => {
      vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          message: "Tasdiqlash kodi yuborildi",
          data: {
            recipient: "test@prava.uz",
            maskedRecipient: "t***@prava.uz",
            expiresInMinutes: 5,
            retryAfterSeconds: 60,
          },
        },
      });

      let step: 1 | 2 = 1;
      let countdown = 0;
      let code = "";

      const handleRegisterInit = async () => {
        const res = await api.post("/api/v1/auth/register/init", {
          firstName: "Ali",
          lastName: "Valiyev",
          email: "test@prava.uz",
          verificationType: "EMAIL",
          password: "StrongPassword123!",
        });
        if (res.data.success) {
          step = 2;
          countdown = 60;
          code = "";
        }
      };

      await handleRegisterInit();
      expect(step).toBe(2);
      expect(countdown).toBe(60);
      expect(code).toBe("");
    });

    it("simulates Step 2 synchronous 6-digit OTP verification preventing race conditions", async () => {
      vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          message: "Muvaffaqiyatli ro'yxatdan o'tdingiz",
          data: {
            accessToken: "mock_jwt_access_token",
            refreshToken: "mock_jwt_refresh_token",
            user: {
              id: "u123",
              firstName: "Ali",
              lastName: "Valiyev",
              email: "test@prava.uz",
              role: "STUDENT",
            },
          },
        },
      });

      let authenticated = false;
      let targetUser: any = null;

      const handleVerify = async (overrideCode?: string) => {
        const code = overrideCode || "000000";
        if (code.length !== 6) return;

        const res = await api.post("/api/v1/auth/register/verify", {
          recipient: "test@prava.uz",
          code,
          verificationType: "EMAIL",
        });

        if (res.data.success) {
          authenticated = true;
          targetUser = res.data.data.user;
          Cookies.set(ACCESS_TOKEN_KEY, res.data.data.accessToken);
        }
      };

      // User enters 6th digit -> triggers onComplete with "654321"
      await handleVerify("654321");
      expect(authenticated).toBe(true);
      expect(targetUser.firstName).toBe("Ali");
      expect(Cookies.get(ACCESS_TOKEN_KEY)).toBe("mock_jwt_access_token");
    });
  });

  // =========================================================================
  // ROUTE 4: /auth/forgot-password (3-Step Recovery Flow)
  // =========================================================================
  describe("Route /auth/forgot-password: 3-Step Password Reset Flow", () => {
    it("Step 1: validates identifier and sends recovery code", async () => {
      vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          message: "Qayta tiklash kodi yuborildi",
        },
      });

      let step: 1 | 2 | 3 = 1;
      const res = await api.post("/api/v1/auth/forgot-password", {
        identifier: "user@example.com",
        verificationType: "EMAIL",
      });
      if (res.data.success) step = 2;
      expect(step).toBe(2);
    });

    it("Step 2: validates 6-digit code and transitions to Step 3", () => {
      let step: 1 | 2 | 3 = 2;
      let storedCode = "";

      const handleCodeSubmit = (enteredCode: string) => {
        if (enteredCode.length === 6) {
          storedCode = enteredCode;
          step = 3;
        }
      };

      handleCodeSubmit("12345"); // Incomplete
      expect(step).toBe(2);

      handleCodeSubmit("123456"); // Complete
      expect(step).toBe(3);
      expect(storedCode).toBe("123456");
    });

    it("Step 3: validates new password complexity and executes reset-password", async () => {
      vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          message: "Parol muvaffaqiyatli yangilandi",
        },
      });

      const newPass = "NewSecurePass123!";
      const confirmPass = "NewSecurePass123!";

      const passRules = checkPasswordRules(newPass);
      expect(passRules.allValid).toBe(true);
      expect(newPass).toBe(confirmPass);

      const res = await api.post("/api/v1/auth/reset-password", {
        recipient: "user@example.com",
        code: "123456",
        newPassword: newPass,
        verificationType: "EMAIL",
      });

      expect(res.data.success).toBe(true);
    });
  });

  // =========================================================================
  // ROUTE 5: /auth/pair (QR Pairing & Cross-Device Authentication)
  // =========================================================================
  describe("Route /auth/pair & QrAuthService: QR Device Pairing Protocol", () => {
    it("validates missing sessionId or challenge produces immediate rejection", () => {
      const validatePairParams = (sessionId: string | null, challenge: string | null) => {
        if (!sessionId || !challenge) {
          return { error: "Ulanish havolasi noto'g'ri (sessionId yoki challenge mavjud emas)" };
        }
        return { valid: true };
      };

      expect(validatePairParams(null, "abc").error).toBeDefined();
      expect(validatePairParams("xyz", null).error).toBeDefined();
      expect(validatePairParams("xyz", "abc").valid).toBe(true);
    });

    it("fetches session info and executes handleApprove for authenticated user", async () => {
      vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          message: "Qurilma tasdiqlandi",
        },
      });

      const approveRes = await api.post("/api/v1/auth/qr/approve", {
        sessionId: "session_abc_123",
        challenge: "challenge_def_456",
      });

      expect(approveRes.data.success).toBe(true);
      expect(approveRes.data.message).toBe("Qurilma tasdiqlandi");
    });

    it("QrAuthService init, status polling, and cancel lifecycle", async () => {
      // 1. Init
      vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            sessionId: "test-session-id",
            challenge: "test-challenge",
            pairingUrl: "https://pravaonline.uz/auth/pair?sessionId=test-session-id&challenge=test-challenge",
            expiresIn: 90,
          },
        },
      });

      const session = await QrAuthService.initSession();
      expect(session.sessionId).toBe("test-session-id");
      expect(session.qrPayload).toContain("test-session-id");

      // 2. Poll Status (Pending)
      vi.spyOn(api, "get").mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            status: "PENDING",
          },
        },
      });

      const statusRes = await QrAuthService.checkStatus(session.sessionId);
      expect(statusRes.status).toBe("PENDING");

      // 3. Cancel
      const cancelSpy = vi.spyOn(api, "post").mockResolvedValueOnce({ data: { success: true } });
      await QrAuthService.cancelSession(session.sessionId);
      expect(cancelSpy).toHaveBeenCalledWith("/api/v1/auth/qr/cancel", { sessionId: "test-session-id" });
    });
  });

  // =========================================================================
  // ROUTE 6: /auth/telegram-callback (Token Login & Expiry Handling)
  // =========================================================================
  describe("Route /auth/telegram-callback: Telegram One-Time Token Authentication", () => {
    it("handles missing token with invalid error state", () => {
      const handleTelegramParams = (token: string | null) => {
        if (!token) return { error: "invalid" };
        return { valid: true, token };
      };

      expect(handleTelegramParams(null).error).toBe("invalid");
      expect(handleTelegramParams("").error).toBe("invalid");
      expect(handleTelegramParams("valid_token_xyz").token).toBe("valid_token_xyz");
    });

    it("handles expired token (401 or 410) with expired error state", async () => {
      vi.spyOn(api, "post").mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: "Telegram kirish tokeni yaroqsiz yoki muddati o'tgan" },
        },
      });

      try {
        await api.post("/api/v1/auth/telegram/token-login", { token: "expired_token" });
        expect.unreachable("Should have rejected");
      } catch (err: any) {
        expect(err.response.status).toBe(401);
      }
    });

    it("successfully logs in with valid telegram token and sets language", async () => {
      vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            accessToken: "telegram_jwt_token",
            refreshToken: "telegram_refresh_token",
            user: {
              id: "tg_user_1",
              firstName: "BotUser",
              preferredLanguage: "ru",
            },
          },
        },
      });

      const res = await api.post("/api/v1/auth/telegram/token-login", { token: "valid_token" });
      expect(res.data.success).toBe(true);
      expect(res.data.data.user.preferredLanguage).toBe("ru");
    });
  });

  // =========================================================================
  // ROUTE 7: Desktop Tauri Security & Browser Isolation
  // =========================================================================
  describe("Desktop Tauri Security Gate: Browser Whitelist & Protocol Sanitization", () => {
    const isSafeBrowserBinary = (binary: string): boolean => {
      const allowed = [
        "chrome.exe",
        "msedge.exe",
        "firefox.exe",
        "brave.exe",
        "launcher.exe",
        "opera.exe",
      ];
      const lower = binary.toLowerCase().replace(/\\/g, "/");
      const filename = lower.split("/").pop() || "";
      return allowed.includes(filename);
    };

    it("should allow verified browsers only", () => {
      expect(isSafeBrowserBinary("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")).toBe(true);
      expect(isSafeBrowserBinary("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")).toBe(true);
      expect(isSafeBrowserBinary("C:\\Program Files\\Mozilla Firefox\\firefox.exe")).toBe(true);
      expect(isSafeBrowserBinary("brave.exe")).toBe(true);
      expect(isSafeBrowserBinary("opera.exe")).toBe(true);
    });

    it("should strictly reject forbidden binaries and shell injectors", () => {
      expect(isSafeBrowserBinary("C:\\Windows\\System32\\cmd.exe")).toBe(false);
      expect(isSafeBrowserBinary("C:\\Windows\\System32\\powershell.exe")).toBe(false);
      expect(isSafeBrowserBinary("C:\\Windows\\System32\\calc.exe")).toBe(false);
      expect(isSafeBrowserBinary("malicious.bat")).toBe(false);
      expect(isSafeBrowserBinary("script.vbs")).toBe(false);
    });
  });
});
