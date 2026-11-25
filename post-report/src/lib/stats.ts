import type { ReportPayload } from "./types";

export type ReportForStats = {
  reportDate: string;
  shiftNo: number;
  payload: ReportPayload;
};

export type PeriodStats = {
  from: string;
  to: string;
  downtimeHours: number;
  vesselCount: number;
  tonnageTons: number;
  reportCount: number;
  reportsPerShift: { shiftNo: number; count: number }[];
};

function parseHm(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}

function downtimeHoursForPayload(downtime: ReportPayload["downtime"]): number {
  let total = 0;
  for (const d of downtime) {
    const start = parseHm(d.startedAt);
    const end = parseHm(d.endedAt);
    if (start !== null && end !== null && end > start) {
      total += (end - start) / 60;
    }
  }
  return Math.round(total);
}

function tonnageForPayload(payload: ReportPayload): number {
  let total = 0;
  for (const row of payload.roadstead) {
    if (row.tons !== null) total += row.tons;
  }
  for (const row of payload.waitingDeparture) {
    if (row.tons !== null) total += row.tons;
  }
  for (const row of payload.vhRows) {
    if (row.tons !== null) total += row.tons;
  }
  for (const row of payload.pdtRows) {
    if (row.tons !== null) total += row.tons;
  }
  for (const row of payload.otherGoodsPztk) {
    if (row.tons !== null) total += row.tons;
  }
  return total;
}

function vesselCountForPayload(payload: ReportPayload): number {
  return payload.roadstead.length + payload.waitingDeparture.length;
}

function inRange(reportDate: string, from: string, to: string): boolean {
  return reportDate >= from && reportDate <= to;
}

export function computeStats(
  reports: ReportForStats[],
  from: string,
  to: string,
): PeriodStats {
  const filtered = reports.filter((r) => inRange(r.reportDate, from, to));

  let downtimeHours = 0;
  let vesselCount = 0;
  let tonnageTons = 0;
  const shiftCounts = new Map<number, number>();

  for (const r of filtered) {
    downtimeHours += downtimeHoursForPayload(r.payload.downtime);
    vesselCount += vesselCountForPayload(r.payload);
    tonnageTons += tonnageForPayload(r.payload);
    shiftCounts.set(r.shiftNo, (shiftCounts.get(r.shiftNo) ?? 0) + 1);
  }

  const reportsPerShift = [...shiftCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([shiftNo, count]) => ({ shiftNo, count }));

  return {
    from,
    to,
    downtimeHours,
    vesselCount,
    tonnageTons,
    reportCount: filtered.length,
    reportsPerShift,
  };
}

export function formatTonnageDisplay(tons: number): string {
  if (tons >= 1000) {
    const thousands = tons / 1000;
    const formatted = thousands.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return `${formatted} тысячи`;
  }
  return Math.round(tons).toLocaleString("ru-RU");
}