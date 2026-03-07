-- Add email_subscribed column to users (default true = subscribed)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_subscribed BOOLEAN NOT NULL DEFAULT TRUE;

-- Table to log unsubscribes with token for one-click links
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
