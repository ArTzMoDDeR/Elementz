-- Drop existing tables
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS elements CASCADE;

-- Create elements table with new structure
CREATE TABLE elements (
  number INTEGER PRIMARY KEY,
  name_french VARCHAR(255) NOT NULL UNIQUE,
  name_english VARCHAR(255) NOT NULL UNIQUE,
  img VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipes table
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  ingredient1_number INTEGER NOT NULL REFERENCES elements(number) ON DELETE CASCADE,
  ingredient2_number INTEGER NOT NULL REFERENCES elements(number) ON DELETE CASCADE,
  result_number INTEGER NOT NULL REFERENCES elements(number) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ingredient1_number, ingredient2_number)
);

-- Create indexes for performance
CREATE INDEX idx_recipes_ing1 ON recipes(ingredient1_number);
CREATE INDEX idx_recipes_ing2 ON recipes(ingredient2_number);
CREATE INDEX idx_recipes_result ON recipes(result_number);
CREATE INDEX idx_elements_name_fr ON elements(name_french);
CREATE INDEX idx_elements_name_en ON elements(name_english);
