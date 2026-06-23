import { loadConfig, readCursor, writeCursor } from "./config.js";
import { forwardToLocal, getFlag } from "./utils.js";
import type { WebhookRecord } from "./types.js";

interface ListenArgs {
  token: string;
  port: number;
  worker: string;
}

function parseArgs(args: string[]): ListenArgs {
  const config = loadConfig();
  return {
    token: getFlag(args, "--token", config.token),
    port: Number(getFlag(args, "--port")),
    worker: getFlag(args, "--worker", config.worker),
  };
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
      const status = await forwardToLocal(record, port);
      console.log(`→ forwarded ${record.id} — local responded ${status}`);
      since = Math.max(since, record.received_at);
      writeCursor(since);
    }
  }, 2000);
}