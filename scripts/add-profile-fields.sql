-- Add username and leaderboard visibility to user_progress table
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN DEFAULT TRUE;

-- Create index on discovered array length for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_progress_discovered_count 
ON user_progress ((array_length(discovered, 1)));
