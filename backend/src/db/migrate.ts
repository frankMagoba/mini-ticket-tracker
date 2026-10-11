import "dotenv/config";
import { createPool } from "./pool.js";
import { SCHEMA_SQL } from "./schema.js";

const pool = createPool();

try {
  await pool.query(SCHEMA_SQL);
  console.log("Migrations applied.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
