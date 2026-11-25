import { NextResponse } from "next/server";
import { requireSession, updatePostCode } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
  if (!(await updatePostCode(code))) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}