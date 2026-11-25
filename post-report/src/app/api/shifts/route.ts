import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await sql<{ id: number; shift_no: number }>(
    `SELECT id, shift_no FROM shifts ORDER BY shift_no`,
  );
  return NextResponse.json({ shifts: rows });
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { shift_no?: number };
  try {
    body = (await request.json()) as { shift_no?: number };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const shiftNo = body.shift_no;
  if (
    typeof shiftNo !== "number" ||
    !Number.isInteger(shiftNo) ||
    shiftNo < 1
  ) {
    return NextResponse.json({ error: "shift_no required" }, { status: 400 });
  }
  try {
    const rows = await sql<{ id: number; shift_no: number }>(
      `INSERT INTO shifts (shift_no) VALUES ($1) RETURNING id, shift_no`,
      [shiftNo],
    );
    return NextResponse.json({ shift: rows[0] }, { status: 201 });
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