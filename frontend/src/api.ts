import type {
  Ticket,
  TicketListResponse,
  TicketPriority,
  TicketStats,
  TicketStatus,
} from "./types";

export const PAGE_SIZE = 10;

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body as T;
}

export function listTickets(
  page: number,
  status?: TicketStatus,
): Promise<TicketListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (status) {
    params.set("status", status);
  }
  return fetchJson(`/tickets?${params}`);
}

export function createTicket(input: {
  title: string;
  description?: string;
  priority: TicketPriority;
}): Promise<Ticket> {
  return fetchJson("/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTicketStatus(
  id: number,
  status: TicketStatus,
): Promise<Ticket> {
  return fetchJson(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getStats(): Promise<TicketStats> {
  return fetchJson("/tickets/stats");
}
