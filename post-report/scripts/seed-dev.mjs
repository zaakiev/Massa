import bcrypt from "bcryptjs";
import pg from "pg";

const url = process.env.DATABASE_URL?.trim() ?? "";
const code = process.env.POST_CODE?.trim() || "posta";

if (url === "") {
  console.error("seed-dev: set DATABASE_URL");
  process.exit(1);
}

const hash = await bcrypt.hash(code, 10);
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(`DELETE FROM post_settings`);
  await client.query(
    `INSERT INTO post_settings (id, code_hash) VALUES (1, $1)`,
    [hash],
  );
  console.log(`seed-dev: default access code is "${code}"`);
} finally {
  await client.end();
}