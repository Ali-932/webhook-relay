export interface WebhookRecord {
  id: string;
  token: string;
  method: string;
  headers: string;
  body: string;
  received_at: number;
}

export type Env = {
  DB: D1Database;
};

function generateId(): string {
  return crypto.randomUUID();
}

// The Worker creates its own table, so a freshly-provisioned D1 (e.g. from the
// "Deploy to Cloudflare" button) works with no migration step. CREATE ... IF NOT
// EXISTS is idempotent; `ready` skips it after the first request per isolate.
let ready = false;
async function ensureSchema(db: D1Database): Promise<void> {
  if (ready) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS webhooks (
         id TEXT PRIMARY KEY, token TEXT NOT NULL, method TEXT NOT NULL,
         headers TEXT NOT NULL, body TEXT NOT NULL, received_at INTEGER NOT NULL
       )`
    )
    .run();
  ready = true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await ensureSchema(env.DB);
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path.startsWith("/webhook/")) {
      const token = path.split("/")[2];
      if (!token) return new Response("missing token", { status: 400 });

      const body = await request.text();
      const headers = JSON.stringify(Object.fromEntries(request.headers));

      const id = generateId();
      const received_at = Date.now();

      await env.DB.prepare(
        `INSERT INTO webhooks (id, token, method, headers, body, received_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(id, token, request.method, headers, body, received_at)
        .run();

      return Response.json({ id, received_at });
    }

    // GET /webhooks?token=&since=  — poll for new webhooks
    if (request.method === "GET" && path === "/webhooks") {
      const token = url.searchParams.get("token");
      const since = Number(url.searchParams.get("since") ?? "0");

      if (!token) return new Response("missing token", { status: 400 });

      const result = await env.DB.prepare(
        `SELECT * FROM webhooks WHERE token = ? AND received_at > ? ORDER BY received_at ASC LIMIT 50`
      )
        .bind(token, since)
        .all<WebhookRecord>();

      return Response.json(result.results);
    }

    // DELETE /webhooks?token=  — purge only this token's webhooks
    if (request.method === "DELETE" && path === "/webhooks") {
      const token = url.searchParams.get("token");
      if (!token) return new Response("missing token", { status: 400 });

      const result = await env.DB.prepare(`DELETE FROM webhooks WHERE token = ?`)
        .bind(token)
        .run();
      return Response.json({ deleted: result.meta.changes ?? 0 });
    }

    // GET /webhook/:id  — fetch one webhook by ID (used by replay)
    if (request.method === "GET" && path.startsWith("/webhook/")) {
      const id = path.split("/")[2];
      if (!id) return new Response("missing id", { status: 400 });

      const record = await env.DB.prepare(
        `SELECT * FROM webhooks WHERE id = ?`
      )
        .bind(id)
        .first<WebhookRecord>();

      if (!record) return new Response("not found", { status: 404 });
      return Response.json(record);
    }

    return new Response("not found", { status: 404 });
  },
};