import { neon } from '@neondatabase/serverless'
import { RECIPE_DATA } from '../lib/recipes-raw'
import { parseRecipes } from '../lib/game-data'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set')
  process.exit(1)
}

const sql = neon(databaseUrl)

async function main() {
  console.log('[v0] Creating elements table...')
  
  // Create table
  await sql`
    CREATE TABLE IF NOT EXISTS elements (
      name TEXT PRIMARY KEY,
      image_url TEXT,
      category TEXT NOT NULL DEFAULT 'autre',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  
  console.log('[v0] Table created successfully')
  console.log('[v0] Parsing recipes to extract all elements...')
  
  // Parse recipes to get all elements
  const { elements } = parseRecipes(RECIPE_DATA)
  const elementList = Array.from(elements.values())
  
  console.log(`[v0] Found ${elementList.length} elements`)
  console.log('[v0] Seeding database...')
  
  // Insert all elements
  let inserted = 0
  for (const element of elementList) {
    try {
      await sql`
        INSERT INTO elements (name, category)
        VALUES (${element.name}, ${element.category})
        ON CONFLICT (name) DO NOTHING
      `
      inserted++
      if (inserted % 50 === 0) {
        console.log(`[v0] Inserted ${inserted}/${elementList.length} elements...`)
      }
    } catch (error) {
      console.error(`[v0] Error inserting element ${element.name}:`, error)
    }
  }
  
  console.log(`[v0] Successfully seeded ${inserted} elements!`)
  
  // Verify
  const count = await sql`SELECT COUNT(*) as count FROM elements`
  console.log(`[v0] Total elements in database: ${count[0].count}`)
}

main().catch(console.error)
