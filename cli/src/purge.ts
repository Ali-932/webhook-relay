import { loadConfig } from "./config.js";
import { getFlag, prompt } from "./utils.js";

export async function purge(args: string[]): Promise<void> {
  const config = loadConfig();
  const worker = getFlag(args, "--worker", config.worker);

  const skip = args.includes("--yes") || args.includes("-y");
  if (!skip) {
    const ans = (await prompt("Delete ALL webhooks (every token)? (y/N) ")).trim().toLowerCase();
    if (ans !== "y" && ans !== "yes") {
      console.log("Aborted.");
      return;
    }
  }

  const res = await fetch(`${worker}/webhooks`, { method: "DELETE" });
  if (!res.ok) {
    console.error(`Worker responded ${res.status}`);
    process.exit(1);
  }
  const { deleted } = (await res.json()) as { deleted: number };
  console.log(`Deleted ${deleted} webhooks.`);
}