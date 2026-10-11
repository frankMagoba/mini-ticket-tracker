import cors from "cors";
import express from "express";
import type { Pool } from "pg";
import { errorHandler } from "./middleware/errorHandler.js";
import { createTicketsRouter } from "./routes/tickets.js";

export function createApp(db: Pool) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/tickets", createTicketsRouter(db));
  app.use(errorHandler);

  return app;
}
