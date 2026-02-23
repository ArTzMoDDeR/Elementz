import { neon } from '@neondatabase/serverless'
import { RAW_RECIPES } from '../lib/recipes-raw'

const sql = neon(process.env.DATABASE_URL!)

async function seedRecipes() {
  console.log('Starting recipe seeding...')
  
  // Get all elements with their IDs
  const elements = await sql`SELECT name, element_id FROM elements`
  const nameToId = new Map(elements.map(e => [e.name, e.element_id]))
  
  console.log(`Found ${elements.length} elements`)
  
  // Parse recipes from raw text
  const lines = RAW_RECIPES.split('\n')
  const recipes: Array<{ ing1: number; ing2: number; result: number }> = []
  
  for (const line of lines) {
    if (!line.trim() || !line.includes('=')) continue
    
    const [resultName, recipePart] = line.split('=').map(s => s.trim())
    
    // Skip if it's a base element description
    if (recipePart.includes('fondamental')) continue
    
    // Split by "ou" to handle multiple recipes
    const recipeParts = recipePart.split(' ou ')
    
    for (const part of recipeParts) {
      if (part.includes('fondamental')) continue
      if (!part.includes('+')) continue
      
      const [ing1Name, ing2Name] = part.split('+').map(s => s.trim())
      
      const resultId = nameToId.get(resultName)
      const ing1Id = nameToId.get(ing1Name)
      const ing2Id = nameToId.get(ing2Name)
      
      if (resultId && ing1Id && ing2Id) {
        recipes.push({ ing1: ing1Id, ing2: ing2Id, result: resultId })
      }
    }
  }
  
  console.log(`Found ${recipes.length} valid recipes`)
  
  // Clear existing recipes
  await sql`DELETE FROM recipes`
  
  // Insert recipes in batches
  const batchSize = 100
  for (let i = 0; i < recipes.length; i += batchSize) {
    const batch = recipes.slice(i, i + batchSize)
    
    for (const recipe of batch) {
      await sql`
        INSERT INTO recipes (ingredient1_id, ingredient2_id, result_id)
        VALUES (${recipe.ing1}, ${recipe.ing2}, ${recipe.result})
      `
    }
    
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recipes.length / batchSize)}`)
  }
  
  console.log('Recipe seeding complete!')
}

seedRecipes().catch(console.error)
