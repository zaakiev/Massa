import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string; page: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: rawId, page: rawPage } = await params;
  const reportId = Number.parseInt(rawId, 10);
  const pageNo = Number.parseInt(rawPage, 10);
  if (
    !Number.isFinite(reportId) ||
    reportId < 1 ||
    !Number.isFinite(pageNo) ||
    pageNo < 1
  ) {
    return NextResponse.json({ error: "invalid id or page" }, { status: 400 });
  }

  const rows = await sql<{ file_path: string }>(
    `SELECT file_path FROM report_photos WHERE report_id = $1 AND page_no = $2`,
    [reportId, pageNo],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rel = rows[0].file_path;
  const abs = path.join(process.cwd(), rel);
  const resolved = path.resolve(abs);
  const uploadsRoot = path.resolve(path.join(process.cwd(), "uploads"));
  if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  try {
    const data = await readFile(resolved);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "file missing" }, { status: 404 });
  }
}