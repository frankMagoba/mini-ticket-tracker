import "dotenv/config";

const DEFAULT_DATABASE_URL =
  "postgresql://tickets:tickets@localhost:5433/tickets";

export const ADMIN_DATABASE_URL =
  process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  withDatabaseName(ADMIN_DATABASE_URL, "tickets_test");

export function databaseNameOf(url: string): string {
  return new URL(url).pathname.slice(1);
}

function withDatabaseName(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${name}`;
  return parsed.toString();
}
