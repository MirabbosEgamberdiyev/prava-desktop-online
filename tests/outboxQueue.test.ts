import { describe, it, expect } from "vitest";
import { generateUUID } from "../src/sync/outboxQueue";

describe("Outbox Queue Engine", () => {
  describe("generateUUID", () => {
    it("generates valid UUID v4 format", () => {
      const id = generateUUID();
      expect(typeof id).toBe("string");
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("generates unique values on subsequent calls", () => {
      const set = new Set<string>();
      for (let i = 0; i < 100; i++) {
        set.add(generateUUID());
      }
      expect(set.size).toBe(100);
    });
  });
});