import { describe, expect, it } from "vitest";
import { sql } from "../src/lib/db";

describe("sql helper", () => {
  it("inserts and reads officers", async () => {
    await sql(`DELETE FROM officers`);
    await sql(`INSERT INTO officers (full_name) VALUES ($1)`, ["Иванов"]);
    const rows = await sql<{ full_name: string }>(
      `SELECT full_name FROM officers`,
    );
    expect(rows.map((r) => r.full_name)).toEqual(["Иванов"]);
  });
});