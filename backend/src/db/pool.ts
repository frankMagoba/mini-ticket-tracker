import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export function createPool(connectionString?: string): pg.Pool {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({ connectionString: url });
}

export const pool = createPool();
