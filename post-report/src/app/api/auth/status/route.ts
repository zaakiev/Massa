import { NextResponse } from "next/server";
import { isPostConfigured } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ configured: await isPostConfigured() });
}