import React, { useEffect, useRef, useState } from "react";
import { render, Box, Text, useApp, useInput, useWindowSize } from "ink";
import { loadConfig, readCursor, writeCursor, saveConfig } from "./config.js";
import { forwardToLocal, getFlag } from "./utils.js";
import type { WebhookRecord } from "./types.js";

interface TuiArgs {
  token: string;
  port: number;
  worker: string;
}

function parseArgs(args: string[]): TuiArgs {
  const config = loadConfig();
  return {
    token: getFlag(args, "--token", config.token),
    worker: getFlag(args, "--worker", config.worker),
    port: Number(
      getFlag(args, "--port", config.port !== undefined ? String(config.port) : undefined),
    ),
  };
}

export function prettyBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function mergeRecords(
  existing: WebhookRecord[],
  incoming: WebhookRecord[],
): WebhookRecord[] {
  const byId = new Map(existing.map(r => [r.id, r]));
  for (const r of incoming) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => b.received_at - a.received_at);
}

export function maxReceivedAt(cursor: number, records: WebhookRecord[]): number {
  return records.reduce((m, r) => Math.max(m, r.received_at), cursor);
}

// Apply one keypress to a text field. Append printable input, or drop the last
// char on backspace/delete. Caller routes nav/save keys elsewhere first.
// ponytail: append/backspace only — no mid-string cursor. Fine for a URL + token.
export function editField(
  value: string,
  input: string,
  key: { backspace?: boolean; delete?: boolean },
): string {
  if (key.backspace || key.delete) return value.slice(0, -1);
  if (input) return value + input;
  return value;
}

function Detail({ record, scroll, height }: { record: WebhookRecord; scroll: number; height: number }) {
  let headers: Record<string, string> = {};
  try {
    headers = JSON.parse(record.headers) as Record<string, string>;
  } catch {
    headers = {};
  }

  const lines: string[] = [
    record.method,
    ...Object.entries(headers).map(([k, v]) => `${k}: ${String(v)}`),
    "",
    ...prettyBody(record.body).split("\n"),
  ];

  const visible = lines.slice(scroll, scroll + height);
  const hasMore = scroll + height < lines.length;

  return (
    <Box flexDirection="column">
      {visible.map((line, i) => (
        <Text key={i}>{line || " "}</Text>
      ))}
      {hasMore && <Text dimColor>↓ more (j)</Text>}
    </Box>
  );
}

// Chrome rows: 1 header + 1 top-border + 1 panel-title + 1 bottom-border + 1 status = 5
const CHROME = 5;

function App({ token: initToken, worker: initWorker, port }: TuiArgs) {
  const { exit } = useApp();
  const { rows = 24 } = useWindowSize();

  const [records, setRecords] = useState<WebhookRecord[]>([]);
  const [selected, setSelected] = useState(0);
  const [forwarding, setForwarding] = useState(true);
  const [marks, setMarks] = useState<Record<string, "ok" | "err">>({});
  const [status, setStatus] = useState("");
  const [detailScroll, setDetailScroll] = useState(0);
  const [listOffset, setListOffset] = useState(0);
  const [worker, setWorker] = useState(initWorker);
  const [token, setToken] = useState(initToken);
  const [mode, setMode] = useState<"list" | "settings">("list");
  const [draft, setDraft] = useState({ worker: initWorker, token: initToken });
  const [field, setField] = useState<"worker" | "token">("worker");

  const cursorRef = useRef(readCursor());
  const forwardingRef = useRef(true);
  const busyRef = useRef(false); // ponytail: skip overlapping ticks if a poll/forward runs long

  const contentRows = Math.max(4, rows - CHROME);

  // Reset detail scroll when selection changes
  useEffect(() => { setDetailScroll(0); }, [selected]);

  // Keep selected item visible in list panel
  useEffect(() => {
    setListOffset(prev => {
      if (selected < prev) return selected;
      if (selected >= prev + contentRows) return selected - contentRows + 1;
      return prev;
    });
  }, [selected, contentRows]);

  useEffect(() => {
    const tick = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const res = await fetch(
          `${worker}/webhooks?token=${token}&since=${cursorRef.current}`,
        );
        if (!res.ok) {
          setStatus(`poll error ${res.status}`);
          return;
        }
        const incoming = (await res.json()) as WebhookRecord[];
        if (incoming.length === 0) return;

        setRecords(prev => mergeRecords(prev, incoming));
        cursorRef.current = maxReceivedAt(cursorRef.current, incoming);
        writeCursor(cursorRef.current);

        if (forwardingRef.current) {
          for (const r of incoming) {
            try {
              const st = await forwardToLocal(r, port);
              setMarks(m => ({ ...m, [r.id]: "ok" }));
              setStatus(`→ forwarded ${r.id.slice(0, 8)} (${st})`);
            } catch {
              setMarks(m => ({ ...m, [r.id]: "err" }));
              setStatus(`forward failed ${r.id.slice(0, 8)} — local down?`);
            }
          }
        }
      } catch {
        setStatus("poll error");
      } finally {
        busyRef.current = false;
      }
    };

    const iv = setInterval(tick, 2000);
    void tick();
    return () => clearInterval(iv);
  }, [token, worker, port]);

  const replaySelected = async () => {
    const r = records[selected];
    if (!r) return;
    setStatus(`replaying ${r.id.slice(0, 8)}...`);
    try {
      const st = await forwardToLocal(r, port);
      setMarks(m => ({ ...m, [r.id]: "ok" }));
      setStatus(`replayed ${r.id.slice(0, 8)} → ${st}`);
    } catch {
      setMarks(m => ({ ...m, [r.id]: "err" }));
      setStatus(`replay failed ${r.id.slice(0, 8)} — local down?`);
    }
  };

  useInput((input, key) => {
    if (mode === "settings") {
      if (key.escape) {
        setMode("list");
      } else if (key.return) {
        setWorker(draft.worker);
        setToken(draft.token);
        saveConfig({ worker: draft.worker, token: draft.token });
        setStatus("config saved");
        setMode("list");
      } else if (key.tab || key.upArrow || key.downArrow) {
        setField(f => (f === "worker" ? "token" : "worker"));
      } else {
        setDraft(d => ({ ...d, [field]: editField(d[field], input, key) }));
      }
      return;
    }

    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    } else if (key.upArrow) {
      setSelected(s => Math.max(0, s - 1));
    } else if (key.downArrow) {
      setSelected(s => Math.min(records.length - 1, s + 1));
    } else if (input === "j") {
      setDetailScroll(s => s + 1);
    } else if (input === "k") {
      setDetailScroll(s => Math.max(0, s - 1));
    } else if (input === "f") {
      forwardingRef.current = !forwardingRef.current;
      setForwarding(forwardingRef.current);
    } else if (input === "r") {
      void replaySelected();
    } else if (input === "s") {
      setDraft({ worker, token });
      setField("worker");
      setMode("settings");
    }
  });

  const visibleRecords = records.slice(listOffset, listOffset + contentRows);
  const sel = records[Math.min(selected, records.length - 1)];

  if (mode === "settings") {
    return (
      <Box flexDirection="column" height={rows}>
        <Box paddingX={1}>
          <Text bold>settings</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} borderStyle="round" paddingX={1}>
          <Text>
            {field === "worker" ? "›" : " "} worker: {draft.worker}
            {field === "worker" ? "▎" : ""}
          </Text>
          <Text>
            {field === "token" ? "›" : " "} token:  {draft.token}
            {field === "token" ? "▎" : ""}
          </Text>
        </Box>
        <Box>
          <Text> ↑↓/Tab field · type to edit · ⏎ save · Esc cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={rows}>
      <Box paddingX={1}>
        <Text dimColor>{worker}/webhook/{token} </Text>
      </Box>
      <Box flexGrow={1}>
        <Box flexDirection="column" width={34} borderStyle="round" paddingX={1}>
          <Text bold>webhooks ({records.length})</Text>
          {records.length === 0 && <Text dimColor>waiting…</Text>}
          {visibleRecords.map((r, i) => {
            const absIdx = listOffset + i;
            const mark =
              marks[r.id] === "ok" ? " ✔" : marks[r.id] === "err" ? " ✗" : "";
            const time = new Date(r.received_at).toISOString().slice(11, 19);
            return (
              <Text key={r.id} inverse={absIdx === selected}>
                {absIdx === selected ? "›" : " "} {r.id.slice(0, 4)} {r.method.padEnd(4)} {time}
                {mark}
              </Text>
            );
          })}
        </Box>
        <Box flexDirection="column" flexGrow={1} borderStyle="round" paddingX={1}>
          <Text bold>detail</Text>
          {sel ? (
            <Detail record={sel} scroll={detailScroll} height={contentRows - 1} />
          ) : (
            <Text dimColor>no selection</Text>
          )}
        </Box>
      </Box>
      <Box>
        <Text backgroundColor={forwarding ? "green" : "red"} color="black">
          {forwarding ? ` FORWARD ON →:${port} ` : " FORWARD OFF "}
        </Text>
        <Text> ↑↓ list  j/k detail  r replay  f fwd  s settings  q quit{status && `  · ${status}`}</Text>
      </Box>
    </Box>
  );
}

export async function tui(args: string[]): Promise<void> {
  const parsed = parseArgs(args);
  const app = render(<App {...parsed} />);
  await app.waitUntilExit();
}