import "dotenv/config";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://tickets:tickets@localhost:5432/tickets";
}
