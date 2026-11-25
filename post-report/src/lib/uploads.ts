export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function photoTooLarge(size: number): boolean {
  return size > MAX_PHOTO_BYTES;
}

export function findOversizedPhoto(
  files: { size: number; name?: string }[],
): { size: number; name?: string } | null {
  for (const f of files) {
    if (photoTooLarge(f.size)) return f;
  }
  return null;
}