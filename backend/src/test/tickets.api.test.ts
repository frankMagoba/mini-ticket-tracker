import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import { createApp } from "../app.js";
import { createPool } from "../db/pool.js";

describe("Tickets API", () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = createPool();
    app = createApp(pool);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'open'
          CHECK (status IN ('open', 'in_progress', 'closed')),
        priority TEXT NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('low', 'medium', 'high')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE tickets RESTART IDENTITY");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates a ticket with defaults", async () => {
    const res = await request(app)
      .post("/tickets")
      .send({ title: "Printer jam", description: "Floor 2" })
      .expect(201);

    expect(res.body).toMatchObject({
      id: 1,
      title: "Printer jam",
      description: "Floor 2",
      status: "open",
      priority: "medium",
    });
    expect(res.body.created_at).toBeTruthy();
  });

  it("rejects create when title is missing", async () => {
    const res = await request(app).post("/tickets").send({}).expect(400);

    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("filters by status and paginates", async () => {
    await request(app)
      .post("/tickets")
      .send({ title: "Open A", status: "open" });
    await request(app)
      .post("/tickets")
      .send({ title: "Open B", status: "open" });
    await request(app)
      .post("/tickets")
      .send({ title: "Closed", status: "closed" });

    const filtered = await request(app)
      .get("/tickets")
      .query({ status: "open", page: 1, limit: 1 })
      .expect(200);

    expect(filtered.body.total).toBe(2);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.total_pages).toBe(2);
    expect(filtered.body.data[0].status).toBe("open");
  });

  it("updates status and returns stats for all statuses including zeros", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Needs work", priority: "high" })
      .expect(201);

    await request(app)
      .patch(`/tickets/${created.body.id}`)
      .send({ status: "in_progress" })
      .expect(200);

    await request(app)
      .post("/tickets")
      .send({ title: "Done", status: "closed" })
      .expect(201);

    const stats = await request(app).get("/tickets/stats").expect(200);

    expect(stats.body).toEqual({
      open: 0,
      in_progress: 1,
      closed: 1,
    });
  });

  it("returns 404 when patching a missing ticket", async () => {
    const res = await request(app)
      .patch("/tickets/999")
      .send({ status: "closed" })
      .expect(404);

    expect(res.body.error).toBe("Ticket not found");
  });
});
