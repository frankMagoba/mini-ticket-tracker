export type TicketStatus = "open" | "in_progress" | "closed";
export type TicketPriority = "low" | "medium" | "high";

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
}

export interface TicketListResponse {
  data: Ticket[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface TicketStats {
  open: number;
  in_progress: number;
  closed: number;
}
