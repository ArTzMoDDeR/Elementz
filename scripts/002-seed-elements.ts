import { neon } from '@neondatabase/serverless'
import { getAllElements } from '../lib/game-data'

const sql = neon(process.env.DATABASE_URL!)

async function seedElements() {
  try {
    console.log('Starting to seed elements...')
    
    const elements = getAllElements()
    console.log(`Found ${elements.size} elements to seed`)
    
    let inserted = 0
    let skipped = 0
    
    for (const [name, element] of elements) {
      try {
        await sql`
          INSERT INTO elements (name, category)
          VALUES (${name}, ${element.category})
          ON CONFLICT (name) DO NOTHING
        `
        inserted++
        
        if (inserted % 50 === 0) {
          console.log(`Inserted ${inserted} elements...`)
        }
      } catch (err) {
        console.error(`Error inserting ${name}:`, err)
        skipped++
      }
    }
    
    console.log(`✅ Seed completed! Inserted: ${inserted}, Skipped: ${skipped}`)
    
    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM elements`
    console.log(`Total elements in database: ${count[0].count}`)
    
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seedElements()
