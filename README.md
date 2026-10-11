# Mini Ticket Tracker

Small support-ticket app for the Lodwar Services take-home: Express + PostgreSQL API and a React UI.

## Stack

- Backend: Node.js, Express, TypeScript, Zod, `pg`
- Database: PostgreSQL 16 (Docker Compose)
- Frontend: React + Vite
- Tests: Vitest + Supertest

## Prerequisites

- Node.js 20+
- Docker (for Postgres)

Local Postgres already bound to `5432` is fine — Compose publishes the app DB on **5433**.

## Setup

```bash
# 1. Start Postgres
docker compose up -d

# 2. Backend
cd backend
cp ../.env.example .env   # if needed
npm install
npm run migrate
npm run dev               # http://localhost:3001

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/tickets` and `/health` to the API.

## API

| Method | Path | Notes |
|---|---|---|
| `POST` | `/tickets` | Create (`title` required; `description`, `status`, `priority` optional) |
| `GET` | `/tickets` | List with `?status=` and `?page=&limit=` (default page 1, limit 20, max 100) |
| `PATCH` | `/tickets/:id` | Update `status` and/or `priority` |
| `GET` | `/tickets/stats` | Counts for `open`, `in_progress`, `closed` (zeros included) |

Defaults on create: `status=open`, `priority=medium`.

## Tests

```bash
cd backend
npm test
```

Integration tests cover create, validation failure, list filter/pagination, stats (including zeros), and 404 on patch.

## Assumptions

- Integer IDs (`SERIAL`) instead of UUIDs.
- List responses are paginated envelopes (`data`, `page`, `limit`, `total`, `total_pages`).
- `GET /tickets/stats` is registered before `/:id` routes so `stats` is never parsed as an id.
- No auth — out of scope for the assignment window.

## Decisions & Tradeoffs

I chose Express + TypeScript + Zod because I can ship typed validation and clear error shapes quickly without an ORM. Raw SQL with a small repository layer keeps the schema obvious and easy to explain in an interview. Postgres runs in Docker on port 5433 so it does not collide with a local Postgres install. The UI is a single Vite React page that covers the three required interactions and shows stats as a light readout; I skipped routing, auth, and design-system polish on purpose. Tests hit a real database rather than mocks so pagination, filters, and stats reflect actual SQL behavior. With more time I would add migrations tooling (e.g. node-pg-migrate), auth, optimistic UI updates, and tighter OpenAPI docs — none of that was worth the risk of over-building for a 3–4 hour exercise.
