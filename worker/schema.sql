CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    method TEXT NOT NULL,
    headers TEXT NOT NULL,
    body TEXT NOT NULL,
    received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_received ON webhooks (token, received_at);