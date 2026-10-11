import { z } from "zod";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../types/ticket.js";

const PG_INT_MAX = 2_147_483_647;

// ?page= shows up as ""
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "title is required")
    .max(200, "title must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .max(5000, "description must be at most 5000 characters")
    .nullish()
    .transform((value) => value || null),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
  })
  .refine((data) => data.status !== undefined || data.priority !== undefined, {
    message: "at least one of status or priority is required",
  });

export const listTicketsQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(TICKET_STATUSES).optional()),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(20),
  ),
});

export const ticketIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .max(PG_INT_MAX, "id is out of range"),
});
