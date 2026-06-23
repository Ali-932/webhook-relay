import fs from "fs";
import os from "os";
import path from "path";

export interface Config {
  worker: string;
  token: string;
  port?: number;
}

const DIR = path.join(os.homedir(), ".webhook-relay");
export const CONFIG_PATH = path.join(DIR, "config.json");
const CURSOR_PATH = path.join(DIR, "cursor");

  export function loadConfig(): Partial<Config> {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as Partial<Config>;
    } catch { return {}; }
  }

export function saveConfig(config: Config): void {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function readCursor(): number {
  try {
    return Number(fs.readFileSync(CURSOR_PATH, "utf8"));
  } catch {
    return Date.now();
  }
}

export function writeCursor(ts: number): void {
  fs.writeFileSync(CURSOR_PATH, String(ts));
}

