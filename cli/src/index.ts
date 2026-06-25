#!/usr/bin/env node
// Bare `relay` or a leading flag (`relay --port 3000`) defaults to the TUI.
const rest = process.argv.slice(2);
const command = !rest[0] || rest[0].startsWith("-") ? "tui" : rest.shift()!;

if (command === "init") {
  const { init } = await import("./init.js");
  await init();
} else if (command === "deploy") {
  const { deploy } = await import("./deploy.js");
  await deploy();
} else if (command === "status") {
  const { status } = await import("./status.js");
  status();
} else if (command === "listen") {
  const { listen } = await import("./listen.js");
  await listen(rest);
} else if (command === "replay") {
  const { replay } = await import("./replay.js");
  await replay(rest);
} else if (command === "list") {
  const { list } = await import("./list.js");
  await list(rest);
} else if (command === "purge") {
  const { purge } = await import("./purge.js");
  await purge(rest);
} else if (command === "tui") {
  const { tui } = await import("./tui.js");
  await tui(rest);
} else {
  console.log("Usage:");
  console.log("  relay deploy");
  console.log("  relay init");
  console.log("  relay status");
  console.log("  relay list [--token <token>] [--worker <url>]");
  console.log("  relay purge [--yes] [--worker <url>]");
  console.log("  relay listen --port <port> [--token <token>] [--worker <url>]");
  console.log("  relay replay <id> --port <port> [--worker <url>]");
  console.log("  relay tui --port <port> [--token <token>] [--worker <url>]");
  process.exit(1);
}