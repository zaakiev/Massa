import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "./db";
import { deriveRisks } from "./risks";
import type { ReportPayload } from "./types";

export type ReportListRow = {
  id: number;
  report_date: string;
  shift_no: number;
  officer_name: string;
  has_risks: boolean;
  created_at: string;
};

export type ReportPhotoRow = {
  page_no: number;
  file_path: string;
};

export type ReportDetail = ReportListRow & {
  payload: ReportPayload;
  photos: ReportPhotoRow[];
  updated_at: string;
};

export async function createReport(input: {
  reportDate: string;
  shiftNo: number;
  officerName: string;
  payload: ReportPayload;
  photoPaths: string[];
}): Promise<number> {
  const risks = deriveRisks(input.payload, input.reportDate);
  const rows = await sql<{ id: number }>(
    `INSERT INTO reports (report_date, shift_no, officer_name, payload, has_risks)
     VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id`,
    [
      input.reportDate,
      input.shiftNo,
      input.officerName,
      JSON.stringify(input.payload),
      risks.length > 0,
    ],
  );
  const id = rows[0].id;
  for (let i = 0; i < input.photoPaths.length; i++) {
    await sql(
      `INSERT INTO report_photos (report_id, page_no, file_path) VALUES ($1,$2,$3)`,
      [id, i + 1, input.photoPaths[i]],
    );
  }
  return id;
}

export async function listReports(): Promise<ReportListRow[]> {
  return sql<ReportListRow>(
    `SELECT id, report_date::text AS report_date, shift_no, officer_name, has_risks, created_at::text AS created_at
     FROM reports
     ORDER BY report_date DESC, created_at DESC`,
  );
}

export async function getReport(id: number): Promise<ReportDetail | null> {
  const rows = await sql<{
    id: number;
    report_date: string;
    shift_no: number;
    officer_name: string;
    has_risks: boolean;
    payload: ReportPayload;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, report_date::text AS report_date, shift_no, officer_name, has_risks, payload,
            created_at::text AS created_at, updated_at::text AS updated_at
     FROM reports WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  const photos = await sql<ReportPhotoRow>(
    `SELECT page_no, file_path FROM report_photos WHERE report_id = $1 ORDER BY page_no`,
    [id],
  );
  const row = rows[0];
  return {
    id: row.id,
    report_date: row.report_date,
    shift_no: row.shift_no,
    officer_name: row.officer_name,
    has_risks: row.has_risks,
    created_at: row.created_at,
    updated_at: row.updated_at,
    payload: row.payload,
    photos,
  };
}

export async function updateReport(
  id: number,
  input: {
    reportDate?: string;
    shiftNo?: number;
    officerName?: string;
    payload?: ReportPayload;
  },
): Promise<boolean> {
  const existing = await getReport(id);
  if (!existing) return false;

  const reportDate = input.reportDate ?? existing.report_date;
  const shiftNo = input.shiftNo ?? existing.shift_no;
  const officerName = input.officerName ?? existing.officer_name;
  const payload = input.payload ?? existing.payload;
  const hasRisks = deriveRisks(payload, reportDate).length > 0;

  const rows = await sql<{ id: number }>(
    `UPDATE reports
     SET report_date = $2, shift_no = $3, officer_name = $4, payload = $5::jsonb,
         has_risks = $6, updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [
      id,
      reportDate,
      shiftNo,
      officerName,
      JSON.stringify(payload),
      hasRisks,
    ],
  );
  return rows.length > 0;
}

export async function writeReportPhotos(
  reportId: number,
  files: Buffer[],
): Promise<string[]> {
  const dir = path.join(process.cwd(), "uploads", String(reportId));
  await mkdir(dir, { recursive: true });
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const rel = `uploads/${reportId}/page-${i + 1}.jpg`;
    await writeFile(path.join(process.cwd(), rel), files[i]);
    paths.push(rel);
  }
  return paths;
}

export async function attachReportPhotos(
  reportId: number,
  photoPaths: string[],
): Promise<void> {
  for (let i = 0; i < photoPaths.length; i++) {
    await sql(
      `INSERT INTO report_photos (report_id, page_no, file_path) VALUES ($1,$2,$3)`,
      [reportId, i + 1, photoPaths[i]],
    );
  }
}