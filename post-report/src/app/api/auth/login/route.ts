import { NextResponse } from "next/server";
import { setSession, verifyPostCode } from "@/lib/auth";
import { seedDefaultShiftsIfEmpty } from "@/lib/directories";

export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const code = body.code?.trim() ?? "";
  if (code === "") {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }
  if (!(await verifyPostCode(code))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await setSession();
  await seedDefaultShiftsIfEmpty();
  return NextResponse.json({ ok: true });
}