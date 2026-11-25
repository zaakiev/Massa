import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getReport, updateReport } from "@/lib/reports";
import type { ReportPayload } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function parseId(rawId: string): number | null {
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const report = await getReport(id);
  if (!report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ report });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const patch: {
    reportDate?: string;
    shiftNo?: number;
    officerName?: string;
    payload?: ReportPayload;
  } = {};

  if (body.report_date !== undefined) {
    if (typeof body.report_date !== "string") {
      return NextResponse.json({ error: "invalid report_date" }, { status: 400 });
    }
    patch.reportDate = body.report_date;
  }
  if (body.shift_no !== undefined) {
    const shiftNo = body.shift_no;
    if (typeof shiftNo !== "number" || !Number.isInteger(shiftNo) || shiftNo < 1) {
      return NextResponse.json({ error: "invalid shift_no" }, { status: 400 });
    }
    patch.shiftNo = shiftNo;
  }
  if (body.officer_name !== undefined) {
    if (typeof body.officer_name !== "string" || body.officer_name.trim() === "") {
      return NextResponse.json({ error: "invalid officer_name" }, { status: 400 });
    }
    patch.officerName = body.officer_name.trim();
  }
  if (body.payload !== undefined) {
    if (typeof body.payload !== "object" || body.payload === null) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    patch.payload = body.payload as ReportPayload;
  }

  if (
    patch.reportDate === undefined &&
    patch.shiftNo === undefined &&
    patch.officerName === undefined &&
    patch.payload === undefined
  ) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const ok = await updateReport(id, patch);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const report = await getReport(id);
  return NextResponse.json({ report });
}