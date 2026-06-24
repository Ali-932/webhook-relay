import test from "node:test";
import assert from "node:assert/strict";
import { prettyBody, mergeRecords, maxReceivedAt } from "./tui.js";
import { getFlag } from "./utils.js";
import type { WebhookRecord } from "./types.js";

const rec = (id: string, received_at: number): WebhookRecord => ({
  id, token: "t", method: "POST", headers: "{}", body: "", received_at,
});

test("prettyBody indents valid JSON", () => {
  assert.equal(prettyBody('{"a":1}'), '{\n  "a": 1\n}');
});

test("prettyBody passes through invalid JSON untouched", () => {
  assert.equal(prettyBody("not json"), "not json");
});

test("mergeRecords dedupes by id and sorts newest-first", () => {
  const existing = [rec("a", 100)];
  const incoming = [rec("a", 100), rec("b", 200), rec("c", 50)];
  const out = mergeRecords(existing, incoming);
  assert.deepEqual(out.map(r => r.id), ["b", "a", "c"]);
});

test("maxReceivedAt returns the latest timestamp, never below the cursor", () => {
  assert.equal(maxReceivedAt(150, [rec("a", 100), rec("b", 200)]), 200);
  assert.equal(maxReceivedAt(300, [rec("a", 100), rec("b", 200)]), 300);
  assert.equal(maxReceivedAt(50, []), 50);
});

test("getFlag returns the value after the flag", () => {
  assert.equal(getFlag(["--port", "3000"], "--port"), "3000");
});

test("getFlag falls back when the flag is absent", () => {
  assert.equal(getFlag([], "--worker", "http://w"), "http://w");
});

test("getFlag throws when neither flag nor fallback is present", () => {
  assert.throws(() => getFlag([], "--port"), /missing --port/);
});
