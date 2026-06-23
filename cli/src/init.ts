import { saveConfig } from "./config.js";
import { prompt } from "./utils.js";

export async function init(): Promise<void> {
  const worker = await prompt("Worker URL: ");
  const token = await prompt("Token: ");
  saveConfig({ worker, token });
  console.log(`\nConfig saved to ~/.webhook-relay/config.json`);
  console.log(`  worker: ${worker}`);
  console.log(`  token:  ${token}`);
}