import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  attachReportPhotos,
  createReport,
  listReports,
  writeReportPhotos,
} from "@/lib/reports";
import type { ReportPayload } from "@/lib/types";
import { findOversizedPhoto, MAX_PHOTO_BYTES } from "@/lib/uploads";

async function buffersFromFormData(formData: FormData): Promise<Buffer[]> {
  const files: Buffer[] = [];
  for (const value of formData.values()) {
    if (!(value instanceof File) || value.size === 0) {
      continue;
    }
    files.push(Buffer.from(await value.arrayBuffer()));
  }
  return files;
}

function parseCreateBody(
  body: Record<string, unknown>,
): {
  reportDate: string;
  shiftNo: number;
  officerName: string;
  payload: ReportPayload;
} | null {
  const reportDate = body.report_date;
  const shiftNo = body.shift_no;
  const officerName = body.officer_name;
  const payload = body.payload;
  if (typeof reportDate !== "string" || reportDate.length === 0) return null;
  if (
    typeof shiftNo !== "number" ||
    !Number.isInteger(shiftNo) ||
    shiftNo < 1
  ) {
    return null;
  }
  if (typeof officerName !== "string" || officerName.trim().length === 0) {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  return {
    reportDate,
    shiftNo,
    officerName: officerName.trim(),
    payload: payload as ReportPayload,
  };
}

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const reports = await listReports();
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let fields: ReturnType<typeof parseCreateBody>;
  let photoBuffers: Buffer[] = [];

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "invalid multipart" }, { status: 400 });
    }
    const payloadRaw = formData.get("payload");
    let parsedPayload: unknown = payloadRaw;
    if (typeof payloadRaw === "string") {
      try {
        parsedPayload = JSON.parse(payloadRaw) as ReportPayload;
      } catch {
        return NextResponse.json({ error: "invalid payload" }, { status: 400 });
      }
    }
    const shiftRaw = formData.get("shift_no");
    const shiftNo =
      typeof shiftRaw === "string"
        ? Number.parseInt(shiftRaw, 10)
        : typeof shiftRaw === "number"
          ? shiftRaw
          : undefined;
    fields = parseCreateBody({
      report_date:
        typeof formData.get("report_date") === "string"
          ? formData.get("report_date")
          : undefined,
      shift_no: shiftNo,
      officer_name:
        typeof formData.get("officer_name") === "string"
          ? formData.get("officer_name")
          : undefined,
      payload: parsedPayload,
    });
    const uploaded: File[] = [];
    for (const value of formData.values()) {
      if (value instanceof File && value.size > 0) {
        uploaded.push(value);
      }
    }
    const oversized = findOversizedPhoto(uploaded);
    if (oversized) {
      return NextResponse.json(
        { error: `photo exceeds ${MAX_PHOTO_BYTES} bytes` },
        { status: 413 },
      );
    }
    photoBuffers = await buffersFromFormData(formData);
  } else {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    fields = parseCreateBody(body);
  }

  if (!fields) {
    return NextResponse.json({ error: "invalid fields" }, { status: 400 });
  }

  const id = await createReport({
    reportDate: fields.reportDate,
    shiftNo: fields.shiftNo,
    officerName: fields.officerName,
    payload: fields.payload,
    photoPaths: [],
  });

  if (photoBuffers.length > 0) {
    const paths = await writeReportPhotos(id, photoBuffers);
    await attachReportPhotos(id, paths);
  }

  return NextResponse.json({ id }, { status: 201 });
}