import { describe, expect, it } from "vitest";
import { sql } from "../src/lib/db";
import { seedDefaultShiftsIfEmpty } from "../src/lib/directories";

describe("officers directory", () => {
  it("adds unique officer names", async () => {
    await sql(`DELETE FROM officers`);
    await sql(`INSERT INTO officers (full_name) VALUES ($1)`, ["Петров"]);
    const rows = await sql<{ full_name: string }>(
      `SELECT full_name FROM officers ORDER BY full_name`,
    );
    expect(rows).toEqual([{ full_name: "Петров" }]);
  });
});

describe("shifts directory", () => {
  it("adds unique shift numbers", async () => {
    await sql(`DELETE FROM shifts`);
    await sql(`INSERT INTO shifts (shift_no) VALUES ($1)`, [2]);
    const rows = await sql<{ shift_no: number }>(
      `SELECT shift_no FROM shifts ORDER BY shift_no`,
    );
    expect(rows).toEqual([{ shift_no: 2 }]);
  });

  it("seeds shifts 1–4 when empty", async () => {
    await sql(`DELETE FROM shifts`);
    await seedDefaultShiftsIfEmpty();
    const rows = await sql<{ shift_no: number }>(
      `SELECT shift_no FROM shifts ORDER BY shift_no`,
    );
    expect(rows.map((r) => r.shift_no)).toEqual([1, 2, 3, 4]);
  });

  it("does not duplicate when shifts already exist", async () => {
    await sql(`DELETE FROM shifts`);
    await sql(`INSERT INTO shifts (shift_no) VALUES ($1)`, [1]);
    await seedDefaultShiftsIfEmpty();
    const rows = await sql<{ shift_no: number }>(
      `SELECT shift_no FROM shifts ORDER BY shift_no`,
    );
    expect(rows.map((r) => r.shift_no)).toEqual([1]);
  });
});