import { randomBytes } from "crypto";
import { loadConfig, saveConfig } from "./config.js";
import { prompt } from "./utils.js";

export async function init(): Promise<void> {
  const worker = await prompt("Worker URL: ");
  // To rotate: delete ~/.webhook-relay/config.json and re-run. Add `init --rotate` if anyone asks.
  const token = loadConfig().token ?? randomBytes(16).toString("hex");
  saveConfig({ worker, token });
  console.log(`\nConfig saved to ~/.webhook-relay/config.json`);
  console.log(`  worker: ${worker}`);
  console.log(`  token:  ${token}`);
}