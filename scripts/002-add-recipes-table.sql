-- Add element_id column and create recipes table
-- This migration adds unique IDs to elements and stores recipes by ID

-- Add element_id column to elements table (will be the primary identifier)
ALTER TABLE elements ADD COLUMN IF NOT EXISTS element_id INTEGER UNIQUE;

-- Populate element_id with sequential numbers based on alphabetical order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as element_id
  FROM elements
)
UPDATE elements e
SET element_id = n.element_id
FROM numbered n
WHERE e.id = n.id;

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  ingredient1_id INTEGER NOT NULL,
  ingredient2_id INTEGER NOT NULL,
  result_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipes_ingredients ON recipes(ingredient1_id, ingredient2_id);
CREATE INDEX IF NOT EXISTS idx_recipes_result ON recipes(result_id);
CREATE INDEX IF NOT EXISTS idx_elements_element_id ON elements(element_id);
