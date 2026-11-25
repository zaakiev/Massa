import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sql } from "./db";

export const SESSION_COOKIE = "post_session";
const SESSION_VALUE = "ok";

export async function verifyPostCode(code: string): Promise<boolean> {
  const rows = await sql<{ code_hash: string }>(
    `SELECT code_hash FROM post_settings WHERE id = 1`,
  );
  if (rows.length === 0) return false;
  return bcrypt.compare(code, rows[0].code_hash);
}

export async function setSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export async function bootstrapPostCode(code: string): Promise<boolean> {
  const rows = await sql<{ id: number }>(`SELECT id FROM post_settings LIMIT 1`);
  if (rows.length > 0) return false;
  const hash = await bcrypt.hash(code, 10);
  await sql(`INSERT INTO post_settings (id, code_hash) VALUES (1, $1)`, [hash]);
  return true;
}