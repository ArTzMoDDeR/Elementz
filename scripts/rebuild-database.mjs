import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Read JSON files
const enPath = resolve('user_read_only_context/text_attachments/alchemy_EN-bOdba.json')
const frPath = resolve('user_read_only_context/text_attachments/alchemy_FR-GGdVd.json')

const enData = JSON.parse(readFileSync(enPath, 'utf-8'))
const frData = JSON.parse(readFileSync(frPath, 'utf-8'))

const enKeys = Object.keys(enData)
const frKeys = Object.keys(frData)

console.log(`EN elements: ${enKeys.length}`)
console.log(`FR elements: ${frKeys.length}`)

// Both JSONs are in the same order, so we zip them
// Build elements list with number, en name, fr name
const elements = []
const enNameToNumber = new Map()

// Also add base elements that are only used as ingredients but not as results
const allIngredients = new Set()

for (const key of enKeys) {
  const recipes = enData[key]
  for (const recipe of recipes) {
    allIngredients.add(recipe[0])
    allIngredients.add(recipe[1])
  }
}

// First pass: add all result elements (from JSON keys) with their FR translations
for (let i = 0; i < enKeys.length; i++) {
  const enName = enKeys[i]
  const frName = frKeys[i] || enName
  elements.push({ en: enName, fr: frName })
  enNameToNumber.set(enName, -1) // placeholder, will assign numbers later
}

// Second pass: find ingredients that are not results (base elements)
const baseElements = []
for (const ingredient of allIngredients) {
  if (!enNameToNumber.has(ingredient)) {
    baseElements.push(ingredient)
  }
}
baseElements.sort()

console.log(`Base elements (no recipe): ${baseElements.length}`)
console.log(`Base elements:`, baseElements)

// Build final list: base elements first, then crafted elements
const finalElements = []
let num = 1

// Add base elements (with FR = EN for now, we'll check FR JSON for translations)
// Actually base elements might exist as keys in FR json too, let's try to find them
// But they might not be keys (since they have no recipe). Let's just use EN name as FR too for base.
for (const base of baseElements) {
  finalElements.push({ number: num, en: base, fr: base })
  enNameToNumber.set(base, num)
  num++
}

// Add all result elements
for (let i = 0; i < enKeys.length; i++) {
  const enName = enKeys[i]
  const frName = frKeys[i] || enName
  finalElements.push({ number: num, en: enName, fr: frName })
  enNameToNumber.set(enName, num)
  num++
}

console.log(`Total elements: ${finalElements.length}`)

// Build recipes
const recipes = []
let skipped = 0
for (const resultEn of enKeys) {
  const resultNum = enNameToNumber.get(resultEn)
  if (!resultNum) { skipped++; continue }
  
  for (const [ing1, ing2] of enData[resultEn]) {
    const ing1Num = enNameToNumber.get(ing1)
    const ing2Num = enNameToNumber.get(ing2)
    if (!ing1Num || !ing2Num) {
      console.warn(`Skipping recipe: ${ing1} + ${ing2} = ${resultEn} (missing ingredient)`)
      skipped++
      continue
    }
    // Always store with smaller number first for consistency
    const a = Math.min(ing1Num, ing2Num)
    const b = Math.max(ing1Num, ing2Num)
    recipes.push({ a, b, result: resultNum })
  }
}

console.log(`Total recipes: ${recipes.length}, skipped: ${skipped}`)

// Generate SQL
let sql = `-- Auto-generated database rebuild script
-- Generated from alchemy_EN.json and alchemy_FR.json

-- Drop old tables
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS elements CASCADE;

-- Create elements table
CREATE TABLE elements (
  number INTEGER PRIMARY KEY,
  name_english TEXT NOT NULL UNIQUE,
  name_french TEXT NOT NULL,
  img TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create recipes table
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  ingredient1 INTEGER NOT NULL REFERENCES elements(number),
  ingredient2 INTEGER NOT NULL REFERENCES elements(number),
  result INTEGER NOT NULL REFERENCES elements(number),
  UNIQUE(ingredient1, ingredient2, result)
);

-- Create indexes
CREATE INDEX idx_recipes_ingredients ON recipes(ingredient1, ingredient2);
CREATE INDEX idx_recipes_result ON recipes(result);
CREATE INDEX idx_elements_name_en ON elements(name_english);

-- Insert elements
INSERT INTO elements (number, name_english, name_french) VALUES\n`

const elementValues = finalElements.map(el => {
  const en = el.en.replace(/'/g, "''")
  const fr = el.fr.replace(/'/g, "''")
  return `(${el.number}, '${en}', '${fr}')`
})
sql += elementValues.join(',\n') + ';\n\n'

sql += `-- Insert recipes\nINSERT INTO recipes (ingredient1, ingredient2, result) VALUES\n`
const recipeValues = recipes.map(r => `(${r.a}, ${r.b}, ${r.result})`)
sql += recipeValues.join(',\n') + ';\n\n'

sql += `-- Summary
-- Total elements: ${finalElements.length}
-- Total recipes: ${recipes.length}
`

writeFileSync(resolve('scripts/005-rebuild-database.sql'), sql)
console.log('SQL written to scripts/005-rebuild-database.sql')
