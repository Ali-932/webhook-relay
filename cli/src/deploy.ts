import { spawn } from "child_process";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import path from "path";
import { loadConfig, saveConfig } from "./config.js";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

// Run `npx -y wrangler <args>` (-y auto-installs wrangler on a fresh machine).
function wrangler(
  args: string[],
  opts: { cwd: string; silent?: boolean }
): Promise<{ code: number; out: string; err: string }> {
  return new Promise(resolve => {
    const child = spawn(npx, ["-y", "wrangler", ...args], {
      cwd: opts.cwd,
      stdio: ["inherit", "pipe", "pipe"],
      // Node 22+ on Windows throws EINVAL spawning .cmd/.bat without a shell (CVE-2024-27980 fix).
      shell: process.platform === "win32",
    });
    let out = "";
    let err = "";
    child.stdout.on("data", d => { out += d; if (!opts.silent) process.stdout.write(d); });
    child.stderr.on("data", d => { err += d; if (!opts.silent) process.stderr.write(d); });
    child.on("close", code => resolve({ code: code ?? 1, out, err }));
    child.on("error", e => resolve({ code: 1, out, err: err + String(e) }));
  });
}

export function parseWorkerUrl(output: string): string | null {
  const m = output.match(/https:\/\/[^\s"]+\.workers\.dev/);
  return m ? m[0] : null;
}

// Copy the bundled Worker into ~/.webhook-relay/worker/ and run wrangler there
function ensureWorkerDir(): string {
  const template = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "worker-template");
  if (!fs.existsSync(path.join(template, "wrangler.toml"))) {
    throw new Error("bundled worker template missing — reinstall webhook-relay-cli.");
  }
  const home = path.join(os.homedir(), ".webhook-relay", "worker");
  fs.mkdirSync(path.join(home, "src"), { recursive: true });
  fs.copyFileSync(path.join(template, "src", "index.ts"), path.join(home, "src", "index.ts"));
  fs.copyFileSync(path.join(template, "wrangler.toml"), path.join(home, "wrangler.toml"));
  return home;
}

export async function deploy(): Promise<void> {
  const cwd = ensureWorkerDir();

  const who = await wrangler(["whoami"], { cwd, silent: true });
  if (who.code !== 0 || /not authenticated|not logged in/i.test(who.out + who.err)) {
    console.log("→ logging in to Cloudflare (opens your browser)…");
    await wrangler(["login"], { cwd });
  }

  console.log("→ deploying worker (creates your D1 on first run)…");
  const dep = await wrangler(["deploy"], { cwd });
  if (dep.code !== 0) throw new Error("wrangler deploy failed (see output above).");
  const url = parseWorkerUrl(dep.out + dep.err);
  if (!url) throw new Error("deployed, but could not parse the worker URL from the output above.");

  const token = loadConfig().token ?? randomBytes(16).toString("hex");
  saveConfig({ worker: url, token });

  console.log(`
✓ deployed: ${url}
✓ saved worker URL + token to ~/.webhook-relay/config.json

Point your provider at:  ${url}/webhook/${token}
Receive locally:         relay tui --port 3000`);
}