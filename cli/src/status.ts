import { loadConfig, CONFIG_PATH } from "./config.js";

export function status(): void {
  const c = loadConfig();
  if (!c.worker && !c.token) {
    console.error('not configured — run "relay init"');
    process.exit(1);
  }
  console.log(`worker: ${c.worker ?? "(unset)"}`);
  console.log(`token:  ${c.token ?? "(unset)"}`);
  if (c.port !== undefined) console.log(`port:   ${c.port}`);
  console.log(`config: ${CONFIG_PATH}`);
}