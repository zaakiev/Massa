import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SummaryPanel } from "@/components/SummaryPanel";
import { LABELS } from "@/lib/labels";
import type { ReportPayload } from "@/lib/types";

function minimalPayload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    reportDate: "2026-11-25",
    asOfTime: "08:00",
    roadstead: [],
    waitingDeparture: [],
    downtime: [],
    downtimeYtdHours: null,
    downtimeYtdDays: null,
    vhRows: [],
    vhSummary: {
      totalBatches: 3,
      byGoods: [{ name: "цемент", count: 2 }],
      releasedDt: 5,
    },
    pdtRows: [],
    berthOperations: [],
    shiftOps: {
      do1: 1,
      do2: 2,
      customsWatch: 3,
      dtImport: 4,
      dtExport: 5,
      pdtCumulative: 6,
    },
    otherGoodsPztk: [],
    nshsTp: { present: false, description: "" },
    ...overrides,
  };
}

function listItemTexts(html: string): string[] {
  return [...html.matchAll(/<li[^>]*>([^<]*)<\/li>/g)].map((m) => m[1]);
}

describe("acceptance: SummaryPanel markup", () => {
  it("uses Выпущено ДТ and one li per shift operation", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryPanel, { payload: minimalPayload() }),
    );
    const items = listItemTexts(html);

    expect(html).toContain(LABELS.releasedDt);
    const releasedLines = items.filter((t) => t.includes(LABELS.releasedDt));
    expect(releasedLines).toHaveLength(1);
    expect(releasedLines[0]).toBe(`${LABELS.releasedDt} — 5`);

    const shiftPrefixes = [
      LABELS.do1,
      LABELS.do2,
      LABELS.customsWatch,
      LABELS.dtImport,
      LABELS.dtExport,
      "ПДТ с начала года",
    ];
    for (const prefix of shiftPrefixes) {
      const matching = items.filter((t) => t.startsWith(prefix));
      expect(matching, `expected single <li> for ${prefix}`).toHaveLength(1);
    }
  });
});