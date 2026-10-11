# Mini Ticket Tracker

Ticket API on Express + Postgres, with a thin React UI.

## Stack

- Backend: Node.js, Express 5, TypeScript, Zod, `pg`
- Database: PostgreSQL 16 (Docker Compose)
- Frontend: React 19 + Vite
- Tests: Vitest + Supertest on a real Postgres database

## Prerequisites

- Node.js 20+
- Docker (for Postgres)

The Compose file maps Postgres to host port **5433**. That way a local Postgres on `5432` can stay running.

## Setup

```bash
# start db
docker compose up -d --wait

# API
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev               # http://localhost:3001

# UI (second terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/tickets` and `/health` to the API. No CORS config needed for local work.

## API

| Method | Path | Notes |
|---|---|---|
| `POST` | `/tickets` | Create. `title` required; `description`, `status`, `priority` optional |
| `GET` | `/tickets` | List. `?status=`, `?page=`, `?limit=` (default page 1, limit 20, max 100) |
| `PATCH` | `/tickets/:id` | Update `status` and/or `priority`. Missing id → `404` |
| `GET` | `/tickets/stats` | Counts for `open`, `in_progress`, `closed` (includes zeros) |

Create defaults: `status=open`, `priority=medium`. Blank description becomes `null`.

Error bodies are JSON. Validation and bad JSON → `400` with `{ error, details? }`. Missing ticket or unknown path → `404 { error }`. Unexpected failures → `500`.

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
npm test
npm run typecheck

cd ../frontend
npm run build
npm run lint
```

`npm test` talks to a `tickets_test` database (created on first run). It truncates that DB between cases, not the one your `npm run dev` uses. Override with `TEST_DATABASE_URL` if you want.

Covers create/defaults, blank description → `null`, validation failures, filter + pagination, stats zeros, priority-only patch, missing/`out-of-range` ids, and JSON 404s.

## Assumptions

- Integer `SERIAL` ids (not UUIDs).
- List payload shape: `{ data, page, limit, total, total_pages }`.
- UI shows 10 tickets per page.
- `/tickets/stats` is mounted before any `/:id` route.
- No auth.

## Decisions & Tradeoffs

Picked Express with TypeScript + Zod. Four endpoints don't need an ORM, and I wanted typed 400s without much ceremony.

DB layer is plain SQL in a small module. Fine to read in review; a query builder would mostly get in the way here.

Schema is one `CREATE TABLE IF NOT EXISTS` shared by `npm run migrate` and the test setup. That's a shortcut. A longer-lived app would get versioned migrations.

Postgres runs in Docker on 5433 so it doesn't fight whatever's already on 5432.

Tests hit real Postgres (`tickets_test`) instead of mocks. I care about the filter SQL and the stats `GROUP BY` more than about a mock matching my own stubs. Separate DB means `npm test` doesn't wipe whatever you created in the UI.

UI is one React page: create, list, change status, stats, basic paging. No auth or router. No design system either — not the point of the brief.

Given more time I'd add versioned migrations, OpenAPI, and an `updated_at` column. Maybe a couple of component tests around the form.
