

export interface WebhookRecord {
  id: string;
  token: string;
  method: string;
  headers: string;   // JSON-encoded header map
  body: string;
  received_at: number;
}

// TypeScript concept: type alias for the environment bindings Cloudflare injects
export type Env = {
  DB: D1Database;
};

// TypeScript concept: the default export must match the Workers Env type
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response("webhook-relay worker", { status: 200 });
  },
};