import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { normalizeUzPhone } from "../src/utils/phoneUtils";
import { checkPasswordRules } from "../src/components/auth/PasswordStrengthMeter";
import { normalizeLanguage } from "../src/context/LanguageContext";

describe("Production Authentication Ecosystem Verification Suite", () => {
  describe("1. Strictly 3 Languages Only (UZL, UZC, RU)", () => {
    const localesDir = path.resolve(__dirname, "../public/locales");

    it("public/locales must contain exactly uzl, uzc, and ru (no en)", () => {
      const folders = fs.readdirSync(localesDir);
      expect(folders.sort()).toEqual(["ru", "uzc", "uzl"]);
    });

    it("normalizeLanguage must map unsupported languages like en to uzl default", () => {
      expect(normalizeLanguage("en")).toBe("uzl");
      expect(normalizeLanguage("en-US")).toBe("uzl");
      expect(normalizeLanguage("fr")).toBe("uzl");
      expect(normalizeLanguage("de")).toBe("uzl");
      expect(normalizeLanguage(null)).toBe("uzl");
      expect(normalizeLanguage(undefined)).toBe("uzl");
    });

    it("normalizeLanguage correctly resolves uzl, uzc, and ru", () => {
      expect(normalizeLanguage("uzl")).toBe("uzl");
      expect(normalizeLanguage("uz-latn")).toBe("uzl");
      expect(normalizeLanguage("uz")).toBe("uzl");

      expect(normalizeLanguage("uzc")).toBe("uzc");
      expect(normalizeLanguage("uz-cyrl")).toBe("uzc");
      expect(normalizeLanguage("cyrl")).toBe("uzc");

      expect(normalizeLanguage("ru")).toBe("ru");
      expect(normalizeLanguage("ru-ru")).toBe("ru");
      expect(normalizeLanguage("russian")).toBe("ru");
    });

    it("auth translation keys exist across uzl, uzc, and ru without missing keys", () => {
      const uzl = JSON.parse(fs.readFileSync(path.join(localesDir, "uzl/translation.json"), "utf8"));
      const uzc = JSON.parse(fs.readFileSync(path.join(localesDir, "uzc/translation.json"), "utf8"));
      const ru = JSON.parse(fs.readFileSync(path.join(localesDir, "ru/translation.json"), "utf8"));

      const authKeys = [
        "welcome",
        "login",
        "register",
        "identifier",
        "password",
        "rememberMe",
        "forgotPassword",
        "loginError",
      ];

      for (const k of authKeys) {
        expect(uzl.auth[k]).toBeDefined();
        expect(uzc.auth[k]).toBeDefined();
        expect(ru.auth[k]).toBeDefined();
      }
    });
  });

  describe("2. Phone Normalization for Authentication", () => {
    it("should normalize diverse valid Uzbekistan phone input formats to +998901234567", () => {
      expect(normalizeUzPhone("901234567")).toBe("+998901234567");
      expect(normalizeUzPhone("998901234567")).toBe("+998901234567");
      expect(normalizeUzPhone("+998 90 123 45 67")).toBe("+998901234567");
      expect(normalizeUzPhone("  +998 (90) 123-45-67  ")).toBe("+998901234567");
    });
  });

  describe("3. Password Strength & Rule Verification", () => {
    it("should mark weak passwords as invalid", () => {
      const res = checkPasswordRules("short");
      expect(res.allValid).toBe(false);
      expect(res.hasMinLength).toBe(false);
      expect(res.strengthPercent).toBeLessThan(50);
    });

    it("should validate all criteria on strong passwords", () => {
      const res = checkPasswordRules("SecurePass123!");
      expect(res.allValid).toBe(true);
      expect(res.hasMinLength).toBe(true);
      expect(res.hasCaseMix).toBe(true);
      expect(res.hasNumber).toBe(true);
      expect(res.hasSpecial).toBe(true);
      expect(res.strengthPercent).toBe(100);
    });
  });

  describe("4. Security: Safe OAuth URL Detection", () => {
    const isSafeAuthUrl = (url: string): boolean => {
      if (!url.startsWith("https://") && !url.startsWith("http://")) {
        return false;
      }
      if (url.includes("\0") || url.includes("\r") || url.includes("\n") || url.includes("\"") || url.includes("'")) {
        return false;
      }
      return (
        url.startsWith("https://pravaonline.uz") ||
        url.startsWith("http://localhost") ||
        url.startsWith("https://accounts.google.com") ||
        url.startsWith("https://t.me") ||
        url.startsWith("https://telegram.me")
      );
    };

    it("should accept valid OAuth URLs", () => {
      expect(isSafeAuthUrl("https://pravaonline.uz/auth/login?oauth=google")).toBe(true);
      expect(isSafeAuthUrl("https://accounts.google.com/o/oauth2/v2/auth?client_id=123")).toBe(true);
      expect(isSafeAuthUrl("https://t.me/pravaonlineuzbot?start=desktop")).toBe(true);
    });

    it("should reject unsafe, non-HTTPS, or command injection URLs", () => {
      expect(isSafeAuthUrl("file:///C:/Windows/System32/calc.exe")).toBe(false);
      expect(isSafeAuthUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeAuthUrl("data:text/html,test")).toBe(false);
      expect(isSafeAuthUrl("https://malicious-site.com/steal")).toBe(false);
      expect(isSafeAuthUrl("https://pravaonline.uz/\" & calc.exe & \"")).toBe(false);
    });
  });
});
