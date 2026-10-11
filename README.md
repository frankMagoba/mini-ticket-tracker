# Mini Ticket Tracker

Small support-ticket app for the Lodwar Services take-home: Express + PostgreSQL API and a React UI.

## Stack

- Backend: Node.js, Express 5, TypeScript, Zod, `pg`
- Database: PostgreSQL 16 (Docker Compose)
- Frontend: React 19 + Vite
- Tests: Vitest + Supertest against a real Postgres database

## Prerequisites

- Node.js 20+
- Docker (for Postgres)

Compose publishes the app database on **5433**, so a local Postgres already on `5432` doesn't get in the way.

## Setup

```bash
# 1. Start Postgres and wait until it is healthy
docker compose up -d --wait

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev               # http://localhost:3001

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/tickets` and `/health` to the API, so the UI needs no extra config.

## API

| Method | Path | Notes |
|---|---|---|
| `POST` | `/tickets` | Create. `title` required; `description`, `status`, `priority` optional |
| `GET` | `/tickets` | List with `?status=` and `?page=&limit=` (defaults page 1, limit 20, max 100) |
| `PATCH` | `/tickets/:id` | Update `status` and/or `priority`; `404` if the ticket doesn't exist |
| `GET` | `/tickets/stats` | Counts for `open`, `in_progress`, `closed` (zeros included) |

Defaults on create: `status=open`, `priority=medium`. A blank description is stored as `null`.

Errors are always JSON: `400` with `{ error, details[] }` for validation and malformed JSON bodies, `404 { error }` for missing tickets or unknown routes, `500` for anything unexpected.

Example:

```bash
curl -X POST localhost:3001/tickets -H 'content-type: application/json' \
  -d '{"title":"Printer jam","priority":"high"}'
curl 'localhost:3001/tickets?status=open&page=1&limit=10'
curl -X PATCH localhost:3001/tickets/1 -H 'content-type: application/json' \
  -d '{"status":"in_progress"}'
curl localhost:3001/tickets/stats
```

## Tests and checks

```bash
cd backend
npm test            # integration tests
npm run typecheck   # tsc over src and tests

cd ../frontend
npm run build       # type-checks and bundles
npm run lint
```

Tests run against a separate `tickets_test` database that is created automatically on first run, so `npm test` never touches the data behind the dev server. Set `TEST_DATABASE_URL` to point somewhere else.

The suite covers: create with defaults, blank description → `null`, missing title, malformed JSON, status filter + pagination, empty query values falling back to defaults, status update + stats with zeros, priority-only update, `404` on a missing ticket, out-of-range ids, and JSON `404`s for unknown routes.

## Assumptions

- Integer IDs (`SERIAL`) rather than UUIDs; simpler to read while debugging.
- List responses are paginated envelopes: `data`, `page`, `limit`, `total`, `total_pages`.
- The UI pages 10 tickets at a time and keeps the list visible while the next page loads.
- `GET /tickets/stats` is registered before `/:id` so `stats` is never parsed as an id.
- No auth; out of scope for the assignment window.

## Decisions & Tradeoffs

I went with Express + TypeScript + Zod because it let me ship typed validation and predictable error shapes quickly without pulling in an ORM. Raw SQL behind a small repository module keeps the schema obvious and easy to walk through in an interview. The schema lives in one `CREATE TABLE IF NOT EXISTS` script shared by the migrate command and the test setup; a real project would use a migration tool with versioned files. Postgres runs in Docker on 5433 so it doesn't collide with a local install. The tests hit a real database rather than mocks because pagination, filters, and the stats grouping are exactly the places where SQL behaviour matters, and they use their own database so running them never wipes dev data. The UI is a single React page covering the three required interactions plus a stats readout and simple pagination; I skipped routing, auth, optimistic updates, and design-system polish on purpose. With more time I'd add versioned migrations, an OpenAPI spec, a `updated_at` column, and component tests for the form and status change.
