import { describe, expect, it } from "vitest";
import { sql } from "../src/lib/db";
import {
  createReport,
  getReport,
  listReports,
  updateReport,
  writeReportPhotos,
} from "../src/lib/reports";
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

async function clearReports(): Promise<void> {
  await sql(`DELETE FROM report_photos`);
  await sql(`DELETE FROM reports`);
}

describe("createReport + listReports", () => {
  it("lists created reports with shared post visibility", async () => {
    await clearReports();
    const payload = minimalPayload();
    const id = await createReport({
      reportDate: "2026-11-25",
      shiftNo: 2,
      officerName: "Петров",
      payload,
      photoPaths: ["uploads/99/page-1.jpg"],
    });
    const secondId = await createReport({
      reportDate: "2026-11-24",
      shiftNo: 1,
      officerName: "Сидоров",
      payload: minimalPayload({ reportDate: "2026-11-24" }),
      photoPaths: [],
    });

    const list = await listReports();
    expect(list.map((r) => r.id)).toEqual([id, secondId]);
    expect(list[0]).toMatchObject({
      report_date: "2026-11-25",
      shift_no: 2,
      officer_name: "Петров",
      has_risks: false,
    });
    expect(list[1]).toMatchObject({
      report_date: "2026-11-24",
      officer_name: "Сидоров",
    });
  });

  it("stores photo rows linked to the report", async () => {
    await clearReports();
    const id = await createReport({
      reportDate: "2026-11-25",
      shiftNo: 1,
      officerName: "Иванов",
      payload: minimalPayload(),
      photoPaths: ["uploads/1/page-1.jpg", "uploads/1/page-2.jpg"],
    });
    const report = await getReport(id);
    expect(report?.photos).toEqual([
      { page_no: 1, file_path: "uploads/1/page-1.jpg" },
      { page_no: 2, file_path: "uploads/1/page-2.jpg" },
    ]);
  });
});

describe("updateReport", () => {
  it("updates payload and recomputes has_risks", async () => {
    await clearReports();
    const id = await createReport({
      reportDate: "2026-11-25",
      shiftNo: 1,
      officerName: "Иванов",
      payload: minimalPayload(),
      photoPaths: [],
    });
    const patched = minimalPayload({
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
    const ok = await updateReport(id, { payload: patched });
    expect(ok).toBe(true);
    const report = await getReport(id);
    expect(report?.has_risks).toBe(true);
    expect(report?.payload.vhRows).toHaveLength(1);
  });
});

describe("writeReportPhotos", () => {
  it("writes files under uploads/{reportId}/", async () => {
    await clearReports();
    const id = await createReport({
      reportDate: "2026-11-25",
      shiftNo: 1,
      officerName: "Иванов",
      payload: minimalPayload(),
      photoPaths: [],
    });
    const paths = await writeReportPhotos(id, [
      Buffer.from("page-one"),
      Buffer.from("page-two"),
    ]);
    expect(paths).toEqual([
      `uploads/${id}/page-1.jpg`,
      `uploads/${id}/page-2.jpg`,
    ]);
  });
});