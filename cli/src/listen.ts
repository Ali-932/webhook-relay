import { loadConfig, readCursor, writeCursor } from "./config.js";
import type { WebhookRecord } from "./types.js";

interface ListenArgs {
  token: string;
  port: number;
  worker: string;
}

function parseArgs(args: string[]): ListenArgs {
  const config = loadConfig();

  const get = (flag: string, fallback?: string): string => {
    const i = args.indexOf(flag);
    if (i !== -1 && args[i + 1]) return args[i + 1];
    if (fallback !== undefined) return fallback;
    throw new Error(`missing ${flag} — run "relay init" or pass ${flag} directly`);
  };

  return {
    token: get("--token", config.token),
    port: Number(get("--port")),
    worker: get("--worker", config.worker),
  };
}

async function forward(record: WebhookRecord, port: number): Promise<void> {
  const headers = JSON.parse(record.headers) as Record<string, string>;
  delete headers["content-length"];

  const res = await fetch(`http://localhost:${port}`, {
    method: record.method,
    headers,
    body: record.body || undefined,
  });
  console.log(`→ forwarded ${record.id} — local responded ${res.status}`);
}

export async function listen(args: string[]): Promise<void> {
  const {token, port, worker} = parseArgs(args);

  console.log(`Listening for token "${token}" — forwarding to localhost:${port}`);
  console.log(`Polling ${worker} every 2 seconds...\n`);

  let since = readCursor();

  setInterval(async () => {
    const res = await fetch(`${worker}/webhooks?token=${token}&since=${since}`);
    if (!res.ok) return;
    const records = (await res.json()) as WebhookRecord[];
    for (const record of records) {
      console.log(`← received ${record.id} (${new Date(record.received_at).toISOString()})`);
      await forward(record, port);
      since = Math.max(since, record.received_at);
      writeCursor(since);
    }
  }, 2000);
}