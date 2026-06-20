const [, , command, ...rest] = process.argv;

if (command === "listen") {
  const { listen } = await import("./listen.js");
  await listen(rest);
} else if (command === "replay") {
  const { replay } = await import("./replay.js");
  await replay(rest);
} else {
  console.log("Usage:");
  console.log("  relay listen --token <token> --port <port> --worker <url>");
  console.log("  relay replay <id> --port <port> --worker <url>");
  process.exit(1);
}