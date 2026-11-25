import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { recognizeImages } from "@/lib/ocr/provider";
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

function photoFilesFromFormData(formData: FormData): File[] {
  const files: File[] = [];
  for (const value of formData.values()) {
    if (value instanceof File && value.size > 0) {
      files.push(value);
    }
  }
  return files;
}

export async function POST(request: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid multipart" }, { status: 400 });
  }

  const uploaded = photoFilesFromFormData(formData);
  const oversized = findOversizedPhoto(uploaded);
  if (oversized) {
    return NextResponse.json(
      {
        error: `photo exceeds ${MAX_PHOTO_BYTES} bytes`,
      },
      { status: 413 },
    );
  }

  const files = await buffersFromFormData(formData);
  if (files.length === 0) {
    return NextResponse.json({ error: "no photos" }, { status: 400 });
  }

  try {
    const { payload, warnings } = await recognizeImages(files);
    return NextResponse.json({ payload, warnings });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "recognition failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}