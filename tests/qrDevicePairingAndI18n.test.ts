import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { QrAuthService } from "../src/api/qrAuthService";

describe("QR Device Pairing & i18n Parity Test Suite", () => {
  describe("1. Localization Parity (UZL, UZC, RU)", () => {
    const localesDir = path.resolve(__dirname, "../public/locales");
    const uzl = JSON.parse(fs.readFileSync(path.join(localesDir, "uzl/translation.json"), "utf8"));
    const uzc = JSON.parse(fs.readFileSync(path.join(localesDir, "uzc/translation.json"), "utf8"));
    const ru = JSON.parse(fs.readFileSync(path.join(localesDir, "ru/translation.json"), "utf8"));

    it("should have identical root key sets across all three languages", () => {
      const uzlKeys = Object.keys(uzl).sort();
      const uzcKeys = Object.keys(uzc).sort();
      const ruKeys = Object.keys(ru).sort();

      expect(uzcKeys).toEqual(uzlKeys);
      expect(ruKeys).toEqual(uzlKeys);
    });

    it("should contain mode keys with valid translations in all 3 languages", () => {
      expect(uzl.mode.online).toBe("Onlayn");
      expect(uzc.mode.online).toBe("Онлайн");
      expect(ru.mode.online).toBe("Онлайн");

      expect(uzl.mode.offline).toBe("Oflayn");
      expect(uzc.mode.offline).toBe("Офлайн");
      expect(ru.mode.offline).toBe("Офлайн");

      expect(uzl.mode.auto).toBe("Avto");
      expect(uzc.mode.auto).toBe("Авто");
      expect(ru.mode.auto).toBe("Авто");
    });

    it("should contain qr keys with valid translations in all 3 languages", () => {
      expect(uzl.qr.title).toBe("QR orqali kirish");
      expect(uzc.qr.title).toBe("QR орқали кириш");
      expect(ru.qr.title).toBe("Вход по QR-коду");

      expect(uzl.qr.scanned).toContain("Skanerlandi");
      expect(uzc.qr.scanned).toContain("Сканерланди");
      expect(ru.qr.scanned).toContain("Сканировано");

      expect(uzl.qr.approved).toContain("Tasdiqlandi");
      expect(uzc.qr.approved).toContain("Тасдиқланди");
      expect(ru.qr.approved).toContain("Подтверждено");
    });

    it("should contain pair keys with valid translations in all 3 languages", () => {
      expect(uzl.pair.title).toBe("Yangi qurilma ulanishi");
      expect(uzc.pair.title).toBe("Янги қурилма уланиши");
      expect(ru.pair.title).toBe("Подключение нового устройства");

      expect(uzl.pair.approve).toBe("Tasdiqlash");
      expect(uzc.pair.approve).toBe("Тасдиқлаш");
      expect(ru.pair.approve).toBe("Подтвердить");
    });
  });

  describe("2. QrAuthService Logic & Security", () => {
    it("should expose all required pairing protocol methods", () => {
      expect(typeof QrAuthService.initSession).toBe("function");
      expect(typeof QrAuthService.checkStatus).toBe("function");
      expect(typeof QrAuthService.cancelSession).toBe("function");
      expect(typeof QrAuthService.revokeDevice).toBe("function");
    });
  });

  describe("3. Webcam QR Scanner Data Extraction", () => {
    it("should parse token from callback URLs", async () => {
      const { parseQrData } = await import("../src/components/auth/QrWebcamScanner");
      const res = parseQrData("https://pravaonline.uz/auth/telegram-callback?token=telegram_jwt_sample_123");
      expect(res.token).toBe("telegram_jwt_sample_123");
    });

    it("should parse sessionId from pairing URLs", async () => {
      const { parseQrData } = await import("../src/components/auth/QrWebcamScanner");
      const res = parseQrData("https://pravaonline.uz/auth/pair?sessionId=session_pair_abc_789");
      expect(res.sessionId).toBe("session_pair_abc_789");
    });

    it("should parse JSON payload with token or sessionId", async () => {
      const { parseQrData } = await import("../src/components/auth/QrWebcamScanner");
      expect(parseQrData(JSON.stringify({ token: "tok_json_456" }))).toEqual({ token: "tok_json_456" });
      expect(parseQrData(JSON.stringify({ sessionId: "sid_json_789" }))).toEqual({ sessionId: "sid_json_789" });
    });

    it("should accept raw tokens >= 16 characters", async () => {
      const { parseQrData } = await import("../src/components/auth/QrWebcamScanner");
      const raw = "raw_token_value_longer_than_16";
      expect(parseQrData(raw)).toEqual({ token: raw });
    });

    it("should reject invalid/short noise strings", async () => {
      const { parseQrData } = await import("../src/components/auth/QrWebcamScanner");
      expect(parseQrData("hello")).toEqual({});
      expect(parseQrData("12345")).toEqual({});
    });
  });
});