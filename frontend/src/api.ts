import type {
  Ticket,
  TicketListResponse,
  TicketPriority,
  TicketStats,
  TicketStatus,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body as T;
}

export function listTickets(status?: TicketStatus): Promise<TicketListResponse> {
  const params = new URLSearchParams({ page: "1", limit: "50" });
  if (status) {
    params.set("status", status);
  }
  return request(`/tickets?${params}`);
}

export function createTicket(input: {
  title: string;
  description?: string;
  priority: TicketPriority;
}): Promise<Ticket> {
  return request("/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTicketStatus(
  id: number,
  status: TicketStatus,
): Promise<Ticket> {
  return request(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getStats(): Promise<TicketStats> {
  return request("/tickets/stats");
}
