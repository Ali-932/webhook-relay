const [, , command, ...rest] = process.argv;

if (command === "init") {
  const { init } = await import("./init.js");
  await init();
} else if (command === "listen") {
  const { listen } = await import("./listen.js");
  await listen(rest);
} else if (command === "replay") {
  const { replay } = await import("./replay.js");
  await replay(rest);
} else if (command === "list") {
  const { list } = await import("./list.js");
  await list(rest);
} else {
  console.log("Usage:");
  console.log("  relay init");
  console.log("  relay list [--token <token>] [--worker <url>]");
  console.log("  relay listen --port <port> [--token <token>] [--worker <url>]");
  console.log("  relay replay <id> --port <port> [--worker <url>]");
  process.exit(1);
}