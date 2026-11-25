import { NextResponse } from "next/server";
import { bootstrapPostCode } from "@/lib/auth";

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
  if (!(await bootstrapPostCode(code))) {
    return NextResponse.json(
      { error: "bootstrap not allowed" },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}