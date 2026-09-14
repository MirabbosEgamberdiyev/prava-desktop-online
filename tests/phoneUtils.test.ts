import { describe, it, expect } from "vitest";
import {
  formatUzPhone,
  normalizeUzPhone,
  isValidUzPhone,
} from "../src/utils/phoneUtils";

describe("Phone Utilities", () => {
  describe("normalizeUzPhone", () => {
    it("normalizes digits starting with 998", () => {
      expect(normalizeUzPhone("998901234567")).toBe("+998901234567");
    });

    it("normalizes 9-digit local phone number", () => {
      expect(normalizeUzPhone("901234567")).toBe("+998901234567");
    });

    it("strips parentheses, spaces, and dashes", () => {
      expect(normalizeUzPhone("+998 (90) 123-45-67")).toBe("+998901234567");
    });
  });

  describe("isValidUzPhone", () => {
    it("returns true for valid Uzbekistan numbers", () => {
      expect(isValidUzPhone("+998901234567")).toBe(true);
      expect(isValidUzPhone("998901234567")).toBe(true);
      expect(isValidUzPhone("901234567")).toBe(true);
    });

    it("returns false for incomplete or invalid numbers", () => {
      expect(isValidUzPhone("12345")).toBe(false);
      expect(isValidUzPhone("")).toBe(false);
      expect(isValidUzPhone("+99890123456")).toBe(false); // 11 digits
      expect(isValidUzPhone("+9989012345678")).toBe(false); // 13 digits
    });
  });

  describe("formatUzPhone", () => {
    it("formats 9 digits into Uzbekistan display format", () => {
      const formatted = formatUzPhone("901234567");
      expect(formatted).toBe("+998 90 123 45 67");
    });
  });
});