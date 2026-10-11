import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createTicket,
  getStats,
  listTickets,
  updateTicketStatus,
} from "./api";
import type {
  Ticket,
  TicketPriority,
  TicketStats,
  TicketStatus,
} from "./types";
import "./App.css";

const STATUSES: TicketStatus[] = ["open", "in_progress", "closed"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high"];

interface Board {
  tickets: Ticket[];
  stats: TicketStats;
  total: number;
  totalPages: number;
}

async function loadBoard(
  page: number,
  status?: TicketStatus,
): Promise<Board> {
  const [list, stats] = await Promise.all([
    listTickets(page, status),
    getStats(),
  ]);

  return {
    tickets: list.data,
    stats,
    total: list.total,
    totalPages: list.total_pages,
  };
}

function formatStatus(status: TicketStatus): string {
  return status.replace("_", " ");
}

function describeError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

interface LoadResult {
  key: string;
  board: Board | null;
  error: string | null;
}

export default function App() {
  const [filter, setFilter] = useState<TicketStatus | "">("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // drop responses that don't match the latest request
  const requestKey = `${filter}|${page}|${reloadCount}`;
  const loading = result?.key !== requestKey;
  const board = result?.board ?? null;
  const error = actionError ?? result?.error ?? null;

  const reload = () => setReloadCount((count) => count + 1);

  useEffect(() => {
    let cancelled = false;

    loadBoard(page, filter || undefined)
      .then((next) => {
        if (cancelled) return;
        setResult({ key: requestKey, board: next, error: null });
        // last item left this page — go back
        if (next.tickets.length === 0 && page > 1) {
          setPage(Math.max(1, next.totalPages));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setResult((previous) => ({
          key: requestKey,
          board: previous?.board ?? null,
          error: describeError(err, "Failed to load tickets"),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [filter, page, reloadCount, requestKey]);

  function onFilterChange(next: TicketStatus | "") {
    setFilter(next);
    setPage(1);
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setActionError(null);

    try {
      await createTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setPage(1);
      reload();
    } catch (err) {
      setActionError(describeError(err, "Failed to create ticket"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onStatusChange(id: number, status: TicketStatus) {
    setUpdatingId(id);
    setActionError(null);

    try {
      await updateTicketStatus(id, status);
      reload();
    } catch (err) {
      setActionError(describeError(err, "Failed to update ticket"));
    } finally {
      setUpdatingId(null);
    }
  }

  const tickets = board?.tickets ?? [];
  const totalPages = board?.totalPages ?? 0;

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Mini Ticket Tracker</h1>
          <p>Create, list, and update ticket status.</p>
        </div>
        {board && (
          <dl className="stats">
            <div>
              <dt>Open</dt>
              <dd>{board.stats.open}</dd>
            </div>
            <div>
              <dt>In progress</dt>
              <dd>{board.stats.in_progress}</dd>
            </div>
            <div>
              <dt>Closed</dt>
              <dd>{board.stats.closed}</dd>
            </div>
          </dl>
        )}
      </header>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      <section className="panel">
        <h2>New ticket</h2>
        <form className="create-form" onSubmit={onCreate}>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="Short summary"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Optional details"
            />
          </label>
          <label>
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
            >
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Creating…" : "Create ticket"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="list-header">
          <h2>
            Tickets
            {board && <span className="count">{board.total}</span>}
          </h2>
          <label className="filter">
            Status
            <select
              value={filter}
              onChange={(e) =>
                onFilterChange(e.target.value as TicketStatus | "")
              }
            >
              <option value="">All</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {formatStatus(value)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {board === null ? (
          loading && <p className="muted">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="muted">No tickets yet.</p>
        ) : (
          <ul className="ticket-list" aria-busy={loading}>
            {tickets.map((ticket) => (
              <li key={ticket.id} className="ticket">
                <div className="ticket-main">
                  <div className="ticket-title-row">
                    <strong>{ticket.title}</strong>
                    <span className={`pill priority-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  {ticket.description && (
                    <p className="ticket-description">{ticket.description}</p>
                  )}
                  <time dateTime={ticket.created_at}>
                    {new Date(ticket.created_at).toLocaleString()}
                  </time>
                </div>
                <label className="status-control">
                  Status
                  <select
                    value={ticket.status}
                    disabled={updatingId === ticket.id}
                    onChange={(e) =>
                      onStatusChange(ticket.id, e.target.value as TicketStatus)
                    }
                  >
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {formatStatus(value)}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Ticket pages">
            <button
              type="button"
              className="secondary"
              onClick={() => setPage((current) => current - 1)}
              disabled={loading || page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="secondary"
              onClick={() => setPage((current) => current + 1)}
              disabled={loading || page >= totalPages}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
