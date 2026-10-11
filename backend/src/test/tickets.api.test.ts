import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import { createApp } from "../app.js";
import { createPool } from "../db/pool.js";
import { TEST_DATABASE_URL } from "./database.js";

describe("Tickets API", () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    pool = createPool(TEST_DATABASE_URL);
    app = createApp(pool);
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

  it("stores a blank description as null", async () => {
    const res = await request(app)
      .post("/tickets")
      .send({ title: "No details", description: "   " })
      .expect(201);

    expect(res.body.description).toBeNull();
  });

  it("rejects create when title is missing", async () => {
    const res = await request(app).post("/tickets").send({}).expect(400);

    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("rejects malformed JSON with a 400", async () => {
    const res = await request(app)
      .post("/tickets")
      .set("Content-Type", "application/json")
      .send("{bad")
      .expect(400);

    expect(res.body.error).toBe("Malformed JSON body");
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

  it("falls back to defaults when query values are empty", async () => {
    const res = await request(app)
      .get("/tickets?status=&page=&limit=")
      .expect(200);

    expect(res.body).toMatchObject({ page: 1, limit: 20 });
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

  it("updates priority on its own", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Reprioritise" })
      .expect(201);

    const res = await request(app)
      .patch(`/tickets/${created.body.id}`)
      .send({ priority: "low" })
      .expect(200);

    expect(res.body).toMatchObject({ status: "open", priority: "low" });
  });

  it("returns 404 when patching a missing ticket", async () => {
    const res = await request(app)
      .patch("/tickets/999")
      .send({ status: "closed" })
      .expect(404);

    expect(res.body.error).toBe("Ticket not found");
  });

  it("rejects ids beyond the integer range instead of erroring", async () => {
    const res = await request(app)
      .patch("/tickets/99999999999")
      .send({ status: "closed" })
      .expect(400);

    expect(res.body.details[0]).toMatchObject({
      path: "id",
      message: "id is out of range",
    });
  });

  it("returns JSON for unknown routes", async () => {
    const res = await request(app).delete("/tickets/1").expect(404);

    expect(res.body).toEqual({ error: "Not found" });
  });
});
