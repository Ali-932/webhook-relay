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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
      const token = url.searchParams.get("token");  // returns string|null
      const since = Number(url.searchParams.get("since") ?? "0");

      if (!token) return new Response("missing token", { status: 400 });

      const result = await env.DB.prepare(
        `SELECT * FROM webhooks WHERE token = ? AND received_at > ? ORDER BY received_at ASC LIMIT 50`
      )
        .bind(token, since)
        .all<WebhookRecord>();

      return Response.json(result.results);
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