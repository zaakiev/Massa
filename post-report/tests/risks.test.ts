import { describe, expect, it } from "vitest";
import { LABELS } from "../src/lib/labels";
import { deriveRisks } from "../src/lib/risks";
import type { ReportPayload } from "../src/lib/types";

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

describe("deriveRisks", () => {
  it("flags VH batches past expiry", () => {
    const payload = minimalPayload({
      vhRows: [
        {
          vessel: "МАЛА",
          berth: "П-1",
          do1: "",
          statusOnVh: "",
          expiresAt: "2026-11-20",
          goods: "цемент",
          tons: 100,
          places: null,
          goodsStatus: "",
          orderNo: "",
          removedPlaces: null,
          remainingPlaces: null,
        },
      ],
    });
    const risks = deriveRisks(payload, "2026-11-25");
    expect(risks).toContainEqual({
      kind: "vh",
      title: "ВХ",
      detail: "МАЛА — срок ВХ до 2026-11-20",
    });
  });

  it("includes every downtime row", () => {
    const payload = minimalPayload({
      downtime: [
        {
          reason: "Туман",
          startedAt: "02:00",
          endedAt: "06:00",
        },
      ],
    });
    const risks = deriveRisks(payload, "2026-11-25");
    expect(risks).toContainEqual({
      kind: "downtime",
      title: "Простой",
      detail: "Туман 02:00–06:00",
    });
  });

  it("flags berth operations with started status", () => {
    const payload = minimalPayload({
      berthOperations: [
        {
          kind: "погрузка",
          vessel: "Сильвер Стар",
          berth: "П-2",
          startedAt: "10:00",
          endedAt: "",
          goods: "цемент",
          quantity: "1000 т",
          status: "начата",
        },
      ],
    });
    const risks = deriveRisks(payload, "2026-11-25");
    expect(risks).toContainEqual({
      kind: "operation",
      title: "Операция",
      detail: "Сильвер Стар — погрузка, статус: начата",
    });
  });

  it("adds NSHS when present", () => {
    const payload = minimalPayload({
      nshsTp: { present: true, description: "задержка оформления" },
    });
    const risks = deriveRisks(payload, "2026-11-25");
    expect(risks).toContainEqual({
      kind: "nshs",
      title: LABELS.nshsTp,
      detail: "задержка оформления",
    });
  });

  it("uses default NSHS detail when description empty", () => {
    const payload = minimalPayload({
      nshsTp: { present: true, description: "" },
    });
    const risks = deriveRisks(payload, "2026-11-25");
    expect(risks.some((r) => r.kind === "nshs" && r.detail === LABELS.nshsTpFull)).toBe(
      true,
    );
  });
});