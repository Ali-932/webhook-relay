# webhook-relay

Receive webhooks on a Cloudflare Worker, then pull them down to your local app —
no public tunnel, no inbound ports. Includes a live terminal UI (k9s-style) to
watch, inspect, replay, and auto-forward webhooks as they arrive.

```
provider ──POST──▶ Cloudflare Worker (stores in D1)
                          ▲
                          │ poll
                     relay CLI ──forward──▶ http://localhost:<port>
```

Two parts: a **CLI** (published to npm) and a **Worker** you self-host on your
own Cloudflare account. Each user runs their own Worker, so the stored webhooks
are yours alone.

## 1. Deploy the Worker (one time)

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.

```bash
cd worker
npm i -g wrangler           # or prefix the commands below with: npx
wrangler login

# create your own D1 database
wrangler d1 create webhook-relay-db
# → copy the printed `database_id` into worker/wrangler.toml (replace the existing one)

# create the table
wrangler d1 execute webhook-relay-db --remote --file=schema.sql

# deploy
wrangler deploy
# → note the URL it prints, e.g. https://webhook-relay.<you>.workers.dev
```

> The `database_id` committed in `wrangler.toml` belongs to the original author
> and is tied to their account — you **must** replace it with your own.

## 2. Install the CLI

```bash
npm i -g webhook-relay-cli
relay init        # paste your Worker URL, then pick any token string
```

The token is just a name that separates your webhook streams — choose anything.

## 3. Point your provider at the Worker

Configure the webhook sender (GitHub, Stripe, etc.) to POST to:

```
https://webhook-relay.<you>.workers.dev/webhook/<your-token>
```

## 4. Receive locally

```bash
relay tui --port 3000      # live UI: watch, inspect, replay, auto-forward
```

## Commands

| Command | What it does |
|---------|--------------|
| `relay init` | Save Worker URL + token to `~/.webhook-relay/config.json` |
| `relay status` | Print the current config and its path |
| `relay tui --port <n>` | Live TUI — auto-forwards to `localhost:<n>`; press `s` to edit worker/token |
| `relay listen --port <n>` | Poll + forward, no UI |
| `relay list` | List stored webhooks |
| `relay replay <id> --port <n>` | Re-send one stored webhook to localhost |
| `relay purge [--yes]` | Delete **all** stored webhooks from your Worker (irreversible) |

Most commands accept `--worker <url>` / `--token <t>` to override the saved
config.

## License

MIT — see [LICENSE](LICENSE).