import type { Pool } from "pg";
import type {
  Ticket,
  TicketPriority,
  TicketStats,
  TicketStatus,
} from "../types/ticket.js";

export interface CreateTicketInput {
  title: string;
  description?: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface ListTicketsOptions {
  status?: TicketStatus;
  page: number;
  limit: number;
}

export interface PaginatedTickets {
  data: Ticket[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

function mapRow(row: Record<string, unknown>): Ticket {
  return {
    id: row.id as number,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    status: row.status as TicketStatus,
    priority: row.priority as TicketPriority,
    created_at: row.created_at as Date,
  };
}

export async function createTicket(
  db: Pool,
  input: CreateTicketInput,
): Promise<Ticket> {
  const result = await db.query(
    `INSERT INTO tickets (title, description, status, priority)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, description, status, priority, created_at`,
    [
      input.title,
      input.description ?? null,
      input.status ?? "open",
      input.priority ?? "medium",
    ],
  );

  return mapRow(result.rows[0]);
}

export async function listTickets(
  db: Pool,
  options: ListTicketsOptions,
): Promise<PaginatedTickets> {
  const { status, page, limit } = options;
  const offset = (page - 1) * limit;
  const params: unknown[] = [];
  let where = "";

  if (status) {
    params.push(status);
    where = `WHERE status = $${params.length}`;
  }

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM tickets ${where}`,
    params,
  );
  const total = countResult.rows[0].total as number;

  params.push(limit, offset);
  const result = await db.query(
    `SELECT id, title, description, status, priority, created_at
     FROM tickets
     ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    data: result.rows.map(mapRow),
    page,
    limit,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export async function getTicketById(
  db: Pool,
  id: number,
): Promise<Ticket | null> {
  const result = await db.query(
    `SELECT id, title, description, status, priority, created_at
     FROM tickets WHERE id = $1`,
    [id],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}

export async function updateTicket(
  db: Pool,
  id: number,
  input: UpdateTicketInput,
): Promise<Ticket | null> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }

  if (input.priority !== undefined) {
    params.push(input.priority);
    fields.push(`priority = $${params.length}`);
  }

  if (fields.length === 0) {
    return getTicketById(db, id);
  }

  params.push(id);
  const result = await db.query(
    `UPDATE tickets
     SET ${fields.join(", ")}
     WHERE id = $${params.length}
     RETURNING id, title, description, status, priority, created_at`,
    params,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRow(result.rows[0]);
}

export async function getTicketStats(db: Pool): Promise<TicketStats> {
  const result = await db.query(
    `SELECT status, COUNT(*)::int AS count
     FROM tickets
     GROUP BY status`,
  );

  const stats: TicketStats = {
    open: 0,
    in_progress: 0,
    closed: 0,
  };

  for (const row of result.rows) {
    const status = row.status as keyof TicketStats;
    stats[status] = row.count as number;
  }

  return stats;
}
