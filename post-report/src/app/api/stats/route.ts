import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { computeStats, type ReportForStats } from "@/lib/stats";
import type { ReportPayload } from "@/lib/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseRange(request: Request): { from: string; to: string } | null {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) return null;
  if (from > to) return null;
  return { from, to };
}

export async function GET(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const range = parseRange(request);
  if (!range) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  const rows = await sql<{
    report_date: string;
    shift_no: number;
    payload: ReportPayload;
  }>(
    `SELECT report_date::text AS report_date, shift_no, payload
     FROM reports
     WHERE report_date >= $1::date AND report_date <= $2::date
     ORDER BY report_date`,
    [range.from, range.to],
  );

  const reports: ReportForStats[] = rows.map((row) => ({
    reportDate: row.report_date,
    shiftNo: row.shift_no,
    payload: row.payload,
  }));

  const stats = computeStats(reports, range.from, range.to);
  return NextResponse.json({ stats });
}