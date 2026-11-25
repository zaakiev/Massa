import { describe, expect, it } from "vitest";
import { computeStats, type ReportForStats } from "../src/lib/stats";
import type { ReportPayload } from "../src/lib/types";

function payload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    reportDate: "2026-11-20",
    asOfTime: "08:00",
    roadstead: [],
    waitingDeparture: [],
    downtime: [],
    downtimeYtdHours: null,
    downtimeYtdDays: null,
    vhRows: [],
    vhSummary: { totalBatches: 0, byGoods: [], releasedDt: 0 },
    pdtRows: [],
    berthOperations: [],
    shiftOps: {
      do1: 0,
      do2: 0,
      customsWatch: 0,
      dtImport: 0,
      dtExport: 0,
      pdtCumulative: 0,
    },
    otherGoodsPztk: [],
    nshsTp: { present: false, description: "" },
    ...overrides,
  };
}

function report(
  reportDate: string,
  shiftNo: number,
  p: Partial<ReportPayload> = {},
): ReportForStats {
  return {
    reportDate,
    shiftNo,
    payload: payload({ ...p, reportDate }),
  };
}

describe("computeStats", () => {
  const weekReports: ReportForStats[] = [
    report("2026-11-20", 1, {
      downtime: [{ reason: "a", startedAt: "08:00", endedAt: "10:00" }],
      roadstead: [
        { name: "A", countryDate: "", goods: "", tons: 100 },
        { name: "B", countryDate: "", goods: "", tons: 200 },
      ],
      waitingDeparture: [{ name: "C", country: "", goods: "", tons: 50 }],
    }),
    report("2026-11-24", 2, {
      downtime: [
        { reason: "b", startedAt: "09:00", endedAt: "10:30" },
        { reason: "c", startedAt: "11:00", endedAt: "12:00" },
      ],
      roadstead: [{ name: "D", countryDate: "", goods: "", tons: 300 }],
      vhRows: [{ vessel: "V", berth: "", do1: "", statusOnVh: "", expiresAt: "", goods: "", tons: 150, places: null, goodsStatus: "", orderNo: "", removedPlaces: null, remainingPlaces: null }],
    }),
    report("2026-11-26", 1, {
      roadstead: [{ name: "E", countryDate: "", goods: "", tons: null }],
    }),
  ];

  it("aggregates downtime, vessels, tonnage, and shift counts for a week", () => {
    const stats = computeStats(weekReports, "2026-11-19", "2026-11-25");

    expect(stats.downtimeHours).toBe(5);
    expect(stats.vesselCount).toBe(4);
    expect(stats.tonnageTons).toBe(800);
    expect(stats.reportCount).toBe(2);
    expect(stats.reportsPerShift).toEqual([
      { shiftNo: 1, count: 1 },
      { shiftNo: 2, count: 1 },
    ]);
    expect(stats.from).toBe("2026-11-19");
    expect(stats.to).toBe("2026-11-25");
  });

  it("excludes reports outside the inclusive date range", () => {
    const stats = computeStats(weekReports, "2026-11-22", "2026-11-24");
    expect(stats.reportCount).toBe(1);
    expect(stats.downtimeHours).toBe(3);
    expect(stats.vesselCount).toBe(1);
    expect(stats.tonnageTons).toBe(450);
    expect(stats.reportsPerShift).toEqual([{ shiftNo: 2, count: 1 }]);
  });
});