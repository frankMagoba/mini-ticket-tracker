import "dotenv/config";
import { createApp } from "./app.js";
import { createPool } from "./db/pool.js";

const port = Number(process.env.PORT ?? 3001);
const pool = createPool();

const server = createApp(pool).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, closing server`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
