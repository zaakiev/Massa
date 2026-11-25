import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { sql } from "../src/lib/db";
import {
  isPostConfigured,
  signSessionCookie,
  verifyPostCode,
  verifySessionCookie,
} from "../src/lib/auth";

describe("verifyPostCode", () => {
  it("accepts matching code", async () => {
    const hash = await bcrypt.hash("posta", 10);
    await sql(`DELETE FROM post_settings`);
    await sql(
      `INSERT INTO post_settings (id, code_hash) VALUES (1, $1)`,
      [hash],
    );
    expect(await verifyPostCode("posta")).toBe(true);
    expect(await verifyPostCode("wrong")).toBe(false);
  });
});

describe("isPostConfigured", () => {
  it("reflects post_settings row", async () => {
    await sql(`DELETE FROM post_settings`);
    expect(await isPostConfigured()).toBe(false);
    const hash = await bcrypt.hash("x", 10);
    await sql(
      `INSERT INTO post_settings (id, code_hash) VALUES (1, $1)`,
      [hash],
    );
    expect(await isPostConfigured()).toBe(true);
  });
});

describe("signed session cookie", () => {
  it("verifies HMAC of code_hash", () => {
    const hash = "$2a$10$abcdefghijklmnopqrstuv";
    const token = signSessionCookie(hash);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(verifySessionCookie(token, hash)).toBe(true);
    expect(verifySessionCookie("deadbeef", hash)).toBe(false);
    expect(verifySessionCookie(token, hash + "x")).toBe(false);
  });
});