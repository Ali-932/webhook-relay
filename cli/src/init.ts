import readline from "readline";
import { saveConfig } from "./config.js";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

export async function init(): Promise<void> {
  const worker = await prompt("Worker URL: ");
  const token = await prompt("Token: ");
  saveConfig({ worker, token });
  console.log(`\nConfig saved to ~/.webhook-relay/config.json`);
  console.log(`  worker: ${worker}`);
  console.log(`  token:  ${token}`);
}