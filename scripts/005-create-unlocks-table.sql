-- Create the unlocks table: one row per (user, element) with timestamp
CREATE TABLE IF NOT EXISTS unlocks (
  user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  element_number INTEGER   NOT NULL REFERENCES elements(number) ON DELETE CASCADE,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, element_number)
);

CREATE INDEX IF NOT EXISTS unlocks_user_id_idx ON unlocks (user_id);
CREATE INDEX IF NOT EXISTS unlocks_discovered_at_idx ON unlocks (discovered_at);

-- Migrate existing data from user_progress.discovered (array of FR names) into unlocks.
-- We use the timestamp from user_progress.updated_at as discovered_at.
INSERT INTO unlocks (user_id, element_number, discovered_at)
SELECT
  up.user_id,
  e.number,
  COALESCE(up.updated_at, NOW())
FROM user_progress up
CROSS JOIN LATERAL unnest(up.discovered) AS d(name)
JOIN elements e ON e.name_french = d.name OR e.name_english = d.name
ON CONFLICT (user_id, element_number) DO NOTHING;
