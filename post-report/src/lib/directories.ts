import { sql } from "./db";

export async function seedDefaultShiftsIfEmpty(): Promise<void> {
  const existing = await sql<{ id: number }>(`SELECT id FROM shifts LIMIT 1`);
  if (existing.length > 0) return;
  for (const shiftNo of [1, 2, 3, 4]) {
    await sql(`INSERT INTO shifts (shift_no) VALUES ($1)`, [shiftNo]);
  }
}