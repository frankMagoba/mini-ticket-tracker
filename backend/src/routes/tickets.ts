import { Router } from "express";
import type { Pool } from "pg";
import {
  createTicket,
  getTicketStats,
  listTickets,
  updateTicket,
} from "../db/tickets.js";
import { HttpError } from "../middleware/errorHandler.js";
import {
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  updateTicketSchema,
} from "../validation/tickets.js";

export function createTicketsRouter(db: Pool): Router {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const body = createTicketSchema.parse(req.body);
      const ticket = await createTicket(db, body);
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  });

  // Register /stats before /:id so "stats" is not treated as an id.
  router.get("/stats", async (_req, res, next) => {
    try {
      const stats = await getTicketStats(db);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const query = listTicketsQuerySchema.parse(req.query);
      const result = await listTickets(db, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const { id } = ticketIdParamSchema.parse(req.params);
      const body = updateTicketSchema.parse(req.body);
      const ticket = await updateTicket(db, id, body);

      if (!ticket) {
        throw new HttpError(404, "Ticket not found");
      }

      res.json(ticket);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
