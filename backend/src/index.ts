import "dotenv/config";
import { createApp } from "./app.js";
import { pool } from "./db/pool.js";

const port = Number(process.env.PORT ?? 3001);

const app = createApp(pool);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
