import test from "node:test";
import assert from "node:assert/strict";
import { parseWorkerUrl } from "./deploy.js";

test("parseWorkerUrl finds the workers.dev URL", () => {
  const out = `Uploaded webhook-relay\n  https://webhook-relay.you.workers.dev\nVersion ID: x`;
  assert.equal(parseWorkerUrl(out), "https://webhook-relay.you.workers.dev");
});

test("parseWorkerUrl returns null when absent", () => {
  assert.equal(parseWorkerUrl("no url"), null);
});