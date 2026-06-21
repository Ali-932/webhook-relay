interface WebhookRecord {
    id: string;
    token: string;
    method: string;
    headers: string;
    body: string;
    received_at: number;
}

interface ReplayArgs {
    id: string;
    port: number;
    worker: string;
}

function parseArgs(args: string[]): ReplayArgs {
    const id = args[0];
    if (!id || id.startsWith("--")) throw new Error("first arg must be the webhook ID");

    const get = (flag: string): string => {
        const i = args.indexOf(flag);
        if (i === -1 || !args[i + 1]) throw new Error(`missing ${flag}`);
        return args[i + 1];
    };

    return {id, port: Number(get("--port")), worker: get("--worker")};
}

export async function replay(args: string[]): Promise<void> {
    const {id, port, worker} = parseArgs(args);

    const res = await fetch(`${worker}/webhook/${id}`);
    if (!res.ok) {
        console.error(`Webhook ${id} not found (${res.status})`);
        process.exit(1);
    }

    const record = (await res.json()) as WebhookRecord;
    const headers = JSON.parse(record.headers) as Record<string, string>;
    delete headers["content-length"];

    console.log(`Replaying ${id} to localhost:${port}...`);

    // TypeScript concept: optional chaining — body?.length avoids crash if body is empty string
    const localRes = await fetch(`http://localhost:${port}`, {
        method: record.method,
        headers,
        body: record.body?.length ? record.body : undefined,
    });

    console.log(`Done — local responded ${localRes.status}`);
}