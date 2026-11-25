import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReportFromOcrText } from "../src/lib/parse/reportParser";

describe("parseReportFromOcrText", () => {
  it("parses VH summary and released DT", () => {
    const text = readFileSync("fixtures/sample-ocr.txt", "utf8");
    const p = parseReportFromOcrText(text);
    expect(p.vhSummary.totalBatches).toBe(16);
    expect(p.vhSummary.releasedDt).toBe(8);
    expect(p.vhSummary.byGoods).toEqual(
      expect.arrayContaining([
        { name: "цемент", count: 11 },
        { name: "порошок стиральный", count: 1 },
      ]),
    );
    expect(p.shiftOps).toMatchObject({
      do1: 0,
      do2: 5,
      customsWatch: 1,
      dtImport: 0,
      dtExport: 2,
      pdtCumulative: 53,
    });
    expect(p.otherGoodsPztk[0]?.name).toMatch(/Лесоматериал/i);
    expect(p.otherGoodsPztk[0]?.volumeM3).toBeCloseTo(587.25);
  });

  it("parses roadstead vessels with comma decimals", () => {
    const text = readFileSync("fixtures/sample-ocr.txt", "utf8");
    const p = parseReportFromOcrText(text);
    expect(p.roadstead).toHaveLength(2);
    expect(p.roadstead[0]).toMatchObject({
      name: "Сильвер Стар",
      goods: "цемент",
      tons: 2910,
    });
    expect(p.roadstead[1]?.tons).toBeCloseTo(2906.802);
  });

  it("parses other goods big bags and dt numbers", () => {
    const text = readFileSync("fixtures/sample-ocr.txt", "utf8");
    const p = parseReportFromOcrText(text);
    expect(p.otherGoodsPztk).toHaveLength(2);
    expect(p.otherGoodsPztk[0]?.dtNumbers).toEqual([
      "10228020/230626/5128347",
    ]);
    expect(p.otherGoodsPztk[0]?.tons).toBeCloseTo(469.8);
    expect(p.otherGoodsPztk[1]).toMatchObject({
      name: "Калий хлористый",
      bigBags: 3036,
    });
  });
});