import { loadConfig } from "./config.js";
import { forwardToLocal, getFlag } from "./utils.js";
import type { WebhookRecord } from "./types.js";

interface ReplayArgs {
    id: string;
    port: number;
    worker: string;
}

function parseArgs(args: string[]): ReplayArgs {
    const config = loadConfig();

    const id = args[0];
    if (!id || id.startsWith("--")) throw new Error("first arg must be the webhook ID");

    return { id, port: Number(getFlag(args, "--port")), worker: getFlag(args, "--worker", config.worker) };
}

export async function replay(args: string[]): Promise<void> {
    const {id, port, worker} = parseArgs(args);

    const res = await fetch(`${worker}/webhook/${id}`);
    if (!res.ok) {
        console.error(`Webhook ${id} not found (${res.status})`);
        process.exit(1);
    }

    const record = (await res.json()) as WebhookRecord;

    console.log(`Replaying ${id} to localhost:${port}...`);
    const status = await forwardToLocal(record, port);
    console.log(`Done — local responded ${status}`);
}