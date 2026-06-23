import { loadConfig } from "./config.js";
import { getFlag } from "./utils.js";
import type { WebhookRecord } from "./types.js";

export async function list(args: string[]): Promise<void> {
  const config = loadConfig();

  const worker = getFlag(args, "--worker", config.worker);
  const token = getFlag(args, "--token", config.token);

  const res = await fetch(`${worker}/webhooks?token=${token}&since=0`);
  if (!res.ok) {
    console.error(`Worker responded ${res.status}`);
    process.exit(1);
  }

  const records = (await res.json()) as WebhookRecord[];
  if (records.length === 0) {
    console.log("No webhooks found.");
    return;
  }

  for (const r of records) {
    const time = new Date(r.received_at).toISOString().replace("T", " ").slice(0, 19);
    const preview = r.body.slice(0, 60).replace(/\n/g, " ");
    console.log(`${r.id}  ${r.method.padEnd(6)} ${time}  ${preview}`);
  }
}