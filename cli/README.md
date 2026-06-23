# webhook-relay-cli

Pull webhooks from your self-hosted Cloudflare Worker down to your local app —
no public tunnel. Includes a live terminal UI to watch, inspect, replay, and
auto-forward them.

```bash
npm i -g webhook-relay-cli
relay init                 # paste your Worker URL + a token
relay tui --port 3000      # live UI; auto-forwards to localhost:3000
```

You must first deploy the companion Worker on your own Cloudflare account — see
the [full setup guide](https://github.com/ali-932/webhook-relay#readme) for the
`wrangler` steps.

## Commands

| Command | What it does |
|---------|--------------|
| `relay init` | Save Worker URL + token |
| `relay status` | Print current config |
| `relay tui --port <n>` | Live TUI (press `s` to edit worker/token) |
| `relay listen --port <n>` | Poll + forward, no UI |
| `relay list` | List stored webhooks |
| `relay replay <id> --port <n>` | Re-send one webhook to localhost |
| `relay purge [--yes]` | Delete all stored webhooks (irreversible) |

MIT