import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sql } from "./db";

export const SESSION_COOKIE = "post_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  return "post-report-dev-session-secret";
}

async function getCodeHash(): Promise<string | null> {
  const rows = await sql<{ code_hash: string }>(
    `SELECT code_hash FROM post_settings WHERE id = 1`,
  );
  if (rows.length === 0) return null;
  return rows[0].code_hash;
}

/** HMAC-SHA256 hex of code_hash — used as cookie value and in tests. */
export function signSessionCookie(codeHash: string): string {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(codeHash)
    .digest("hex");
}

export function verifySessionCookie(
  cookieValue: string,
  codeHash: string,
): boolean {
  const expected = signSessionCookie(codeHash);
  try {
    const a = Buffer.from(cookieValue, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isPostConfigured(): Promise<boolean> {
  const rows = await sql<{ id: number }>(`SELECT id FROM post_settings LIMIT 1`);
  return rows.length > 0;
}

export async function verifyPostCode(code: string): Promise<boolean> {
  const rows = await sql<{ code_hash: string }>(
    `SELECT code_hash FROM post_settings WHERE id = 1`,
  );
  if (rows.length === 0) return false;
  return bcrypt.compare(code, rows[0].code_hash);
}

export async function setSession(): Promise<void> {
  const codeHash = await getCodeHash();
  if (!codeHash) return;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSessionCookie(codeHash), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<boolean> {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (!cookie) return false;
  const codeHash = await getCodeHash();
  if (!codeHash) return false;
  return verifySessionCookie(cookie, codeHash);
}

export async function bootstrapPostCode(code: string): Promise<boolean> {
  const rows = await sql<{ id: number }>(`SELECT id FROM post_settings LIMIT 1`);
  if (rows.length > 0) return false;
  const hash = await bcrypt.hash(code, 10);
  await sql(`INSERT INTO post_settings (id, code_hash) VALUES (1, $1)`, [hash]);
  return true;
}

export async function updatePostCode(code: string): Promise<boolean> {
  const rows = await sql<{ id: number }>(`SELECT id FROM post_settings WHERE id = 1`);
  if (rows.length === 0) return false;
  const hash = await bcrypt.hash(code, 10);
  await sql(`UPDATE post_settings SET code_hash = $1 WHERE id = 1`, [hash]);
  return true;
}