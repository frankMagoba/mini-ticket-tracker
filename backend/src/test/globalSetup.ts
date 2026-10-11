import pg from "pg";
import { createPool } from "../db/pool.js";
import { SCHEMA_SQL } from "../db/schema.js";
import {
  ADMIN_DATABASE_URL,
  TEST_DATABASE_URL,
  databaseNameOf,
} from "./database.js";

// own DB — tests TRUNCATE between cases
export default async function setup(): Promise<void> {
  const testDbName = databaseNameOf(TEST_DATABASE_URL);
  const admin = createPool(ADMIN_DATABASE_URL);

  try {
    const existing = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [testDbName],
    );

    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${pg.escapeIdentifier(testDbName)}`);
    }
  } finally {
    await admin.end();
  }

  const testDb = createPool(TEST_DATABASE_URL);
  try {
    await testDb.query(SCHEMA_SQL);
  } finally {
    await testDb.end();
  }
}
