import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await sql<{ id: number; full_name: string }>(
    `SELECT id, full_name FROM officers ORDER BY full_name`,
  );
  return NextResponse.json({ officers: rows });
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { full_name?: string };
  try {
    body = (await request.json()) as { full_name?: string };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const fullName = body.full_name?.trim() ?? "";
  if (fullName === "") {
    return NextResponse.json({ error: "full_name required" }, { status: 400 });
  }
  try {
    const rows = await sql<{ id: number; full_name: string }>(
      `INSERT INTO officers (full_name) VALUES ($1) RETURNING id, full_name`,
      [fullName],
    );
    return NextResponse.json({ officer: rows[0] }, { status: 201 });
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}