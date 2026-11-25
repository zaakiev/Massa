import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { sql } from "../src/lib/db";
import { verifyPostCode } from "../src/lib/auth";

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