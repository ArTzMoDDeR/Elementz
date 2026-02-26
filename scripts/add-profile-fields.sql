-- Add username and leaderboard visibility to user_progress
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS show_in_leaderboard BOOLEAN NOT NULL DEFAULT TRUE;
