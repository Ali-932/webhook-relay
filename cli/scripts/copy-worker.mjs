// Bundle the Worker source into the CLI so `relay deploy` can deploy it from
// anywhere (the npm-installed CLI has no repo checkout). Runs before tsc.
import { cpSync, mkdirSync, rmSync } from "fs";

rmSync("worker-template", { recursive: true, force: true });
mkdirSync("worker-template/src", { recursive: true });
cpSync("../worker/src/index.ts", "worker-template/src/index.ts");
cpSync("../worker/wrangler.toml", "worker-template/wrangler.toml");