import { describe, expect, it } from "vitest";
import {
  getOcrProvider,
  recognizeImages,
  warningsForEmptySections,
} from "../src/lib/ocr/provider";
import { parseReportFromOcrText } from "../src/lib/parse/reportParser";
import { readFileSync } from "node:fs";

describe("ocr fixture provider", () => {
  it("returns parseable text and payload from fixture", async () => {
    const prev = process.env.OCR_PROVIDER;
    process.env.OCR_PROVIDER = "fixture";
    try {
      const { text, payload, warnings } = await recognizeImages([
        Buffer.from("stub-image"),
      ]);
      expect(text).toContain("Всего тов партий");
      expect(payload.vhSummary.totalBatches).toBe(16);
      expect(payload.roadstead).toHaveLength(2);
      expect(payload.otherGoodsPztk).toHaveLength(2);
      expect(warnings).toEqual(
        warningsForEmptySections(parseReportFromOcrText(text)),
      );
      expect(warnings.some((w) => /Простой/i.test(w))).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.OCR_PROVIDER;
      else process.env.OCR_PROVIDER = prev;
    }
  });

  it("fixture provider ignores image bytes", async () => {
    const provider = getOcrProvider();
    const fixture = readFileSync("fixtures/sample-ocr.txt", "utf8");
    const text = await provider.extractText([Buffer.from([0xff, 0xd8])]);
    expect(text).toBe(fixture);
  });

  it("openai provider requires API key", () => {
    const prevMode = process.env.OCR_PROVIDER;
    const prevKey = process.env.OPENAI_API_KEY;
    process.env.OCR_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    try {
      expect(() => getOcrProvider()).toThrow(/OPENAI_API_KEY/i);
    } finally {
      if (prevMode === undefined) delete process.env.OCR_PROVIDER;
      else process.env.OCR_PROVIDER = prevMode;
      if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevKey;
    }
  });
});