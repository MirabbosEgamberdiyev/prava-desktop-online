import { describe, it, expect } from "vitest";
import { normalizeServerQuestion } from "../src/sync/syncEngine";

describe("SyncEngine Data Normalizer", () => {
  it("normalizes backend question with localized object texts", () => {
    const serverQ = {
      id: 101,
      ticket_id: 5,
      topic_id: 2,
      order_num: 1,
      text: {
        uzl: "Qaysi belgi to'xtashni taqiqlaydi?",
        uzc: "Қайси белги тўхташни тақиқлайди?",
        ru: "Какой знак запрещает остановку?",
      },
      explanation: {
        uzl: "3.27 belgisi to'xtashni taqiqlaydi.",
        ru: "Знак 3.27 запрещает остановку.",
      },
      image_path: "/uploads/sign.png",
      options: [
        { index: 0, text: { uzl: "1-belgi", ru: "Знак 1" } },
        { index: 1, text: { uzl: "2-belgi", ru: "Знак 2" } },
      ],
      correct_option: 0,
    };

    const dbQ = normalizeServerQuestion(serverQ);
    expect(dbQ.id).toBe(101);
    expect(dbQ.ticket_id).toBe(5);
    expect(dbQ.topic_id).toBe(2);
    expect(dbQ.text_uzl).toBe("Qaysi belgi to'xtashni taqiqlaydi?");
    expect(dbQ.text_uzc).toBe("Қайси белги тўхташни тақиқлайди?");
    expect(dbQ.text_ru).toBe("Какой знак запрещает остановку?");
    expect(dbQ.image_url).toBe("/uploads/sign.png");
    expect(dbQ.correct_option).toBe(0);

    const parsedOptions = JSON.parse(dbQ.options_json);
    expect(parsedOptions).toHaveLength(2);
    expect(parsedOptions[0].uzl).toBe("1-belgi");
    expect(parsedOptions[0].is_correct).toBe(true);
    expect(parsedOptions[1].is_correct).toBe(false);
  });

  it("handles fallback to default ticketId when question has no ticketId", () => {
    const rawQ = {
      id: 202,
      text: "Oddiy savol matni",
      options: [],
      correct_option: 0,
    };
    const dbQ = normalizeServerQuestion(rawQ, 12);
    expect(dbQ.ticket_id).toBe(12);
  });
});