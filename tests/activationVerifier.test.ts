import { describe, it, expect } from "vitest";

function isActivationCode(s: string): boolean {
  return s.includes(".");
}

function cleanActivationCode(tokenWithDots: string): string {
  return tokenWithDots.replace(/[\s.]/g, "");
}

describe("Activation Code Formatter & Validator", () => {
  it("detects dot-separated Ed25519 activation tokens", () => {
    const validDotToken = "ABCD1234.EFGH5678.IJKL9012";
    const legacyAesKey = "PrAvA-SeCrEt-KeY-2024-OfFlInE";

    expect(isActivationCode(validDotToken)).toBe(true);
    expect(isActivationCode(legacyAesKey)).toBe(false);
  });

  it("cleans activation code for base64url decoding", () => {
    const input = "AAAA.BBBB.CCCC.DDDD";
    expect(cleanActivationCode(input)).toBe("AAAABBBBCCCCDDDD");
  });
});