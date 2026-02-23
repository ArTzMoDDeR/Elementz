-- Create elements table for alchemy game
CREATE TABLE IF NOT EXISTS elements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  image_url TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_elements_name ON elements(name);
CREATE INDEX IF NOT EXISTS idx_elements_category ON elements(category);
