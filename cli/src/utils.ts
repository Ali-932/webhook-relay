import readline from "readline";
import type { WebhookRecord } from "./types.js";

// Ask one question on stdin, resolve with the typed answer.
export function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a); }));
}

// Read a `--flag value` from argv, falling back to a default (e.g. from config).
// Throws if neither is present.
export function getFlag(args: string[], flag: string, fallback?: string): string {
  const i = args.indexOf(flag);
  if (i !== -1 && args[i + 1]) return args[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`missing ${flag} — run "relay init" or pass ${flag} directly`);
}

// POST a stored webhook to the local app. Returns the local response status.
export async function forwardToLocal(record: WebhookRecord, port: number): Promise<number> {
  const headers = JSON.parse(record.headers) as Record<string, string>;
  delete headers["content-length"];
  const res = await fetch(`http://localhost:${port}`, {
    method: record.method,
    headers,
    body: record.body || undefined,
  });
  return res.status;
}
