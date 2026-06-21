import http from "http";

interface ListenArgs {
  token: string;
  port: number;
  worker: string;
}

function parseArgs(args: string[]): ListenArgs {
  const get = (flag: string): string => {
    const i = args.indexOf(flag);
    if (i === -1 || !args[i + 1]) throw new Error(`missing ${flag}`);
    return args[i + 1];
  };
  return {
    token: get("--token"),
    port: Number(get("--port")),
    worker: get("--worker"),
  };
}

interface WebhookRecord {
  id: string;
  token: string;
  method: string;
  headers: string;
  body: string;
  received_at: number;
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

  let since = 0;

  setInterval(async () => {
    const res = await fetch(`${worker}/webhooks?token=${token}&since=${since}`);
    if (!res.ok) return;
    const records = (await res.json()) as WebhookRecord[];
    for (const record of records) {
      console.log(`← received ${record.id} (${new Date(record.received_at).toISOString()})`);
      await forward(record, port);
      since = Math.max(since, record.received_at);
    }
  }, 2000);
}

// ponytail: inline self-test, remove when full integration test added
if (process.argv[2] === "--self-test") {
  const parsed = parseArgs(["--token", "abc", "--port", "3000", "--worker", "http://x"]);
  console.assert(parsed.token === "abc", "token parse failed");
  console.assert(parsed.port === 3000, "port parse failed");
  console.assert(parsed.worker === "http://x", "worker parse failed");
  console.log("self-test passed");
}