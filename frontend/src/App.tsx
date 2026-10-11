import { useCallback, useEffect, useState } from "react";
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

function formatStatus(status: TicketStatus): string {
  return status.replace("_", " ");
}

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [filter, setFilter] = useState<TicketStatus | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [list, nextStats] = await Promise.all([
      listTickets(filter || undefined),
      getStats(),
    ]);
    setTickets(list.data);
    setStats(nextStats);
  }, [filter]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tickets");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      setTitle("");
      setDescription("");
      setPriority("medium");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  async function onStatusChange(id: number, status: TicketStatus) {
    setUpdatingId(id);
    setError(null);

    try {
      await updateTicketStatus(id, status);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ticket");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Mini Ticket Tracker</h1>
          <p>Create tickets, filter by status, and move work forward.</p>
        </div>
        {stats && (
          <dl className="stats">
            <div>
              <dt>Open</dt>
              <dd>{stats.open}</dd>
            </div>
            <div>
              <dt>In progress</dt>
              <dd>{stats.in_progress}</dd>
            </div>
            <div>
              <dt>Closed</dt>
              <dd>{stats.closed}</dd>
            </div>
          </dl>
        )}
      </header>

      {error && <div className="banner error">{error}</div>}

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
          <h2>Tickets</h2>
          <label className="filter">
            Status
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as TicketStatus | "")}
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

        {loading ? (
          <p className="muted">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="muted">No tickets yet.</p>
        ) : (
          <ul className="ticket-list">
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
      </section>
    </div>
  );
}
