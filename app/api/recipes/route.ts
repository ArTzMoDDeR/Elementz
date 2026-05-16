import { NextResponse } from 'next/server'
import { elements as localElements } from '@/lib/data/elements'
import { recipes as localRecipes } from '@/lib/data/recipes'

// Build element lookup by id for fast joins
const elemById = new Map(localElements.map(e => [e.id, e]))

// Pre-build the joined recipe list at module load (static data — no DB needed)
const recipesList = localRecipes.map(r => {
  const e1 = elemById.get(r.ingredient1)
  const e2 = elemById.get(r.ingredient2)
  const e3 = elemById.get(r.result)
  return {
    ingredient1_number: r.ingredient1,
    ingredient2_number: r.ingredient2,
    result_number: r.result,
    ingredient1: e1?.name_fr ?? '',
    ingredient2: e2?.name_fr ?? '',
    result: e3?.name_fr ?? '',
    ingredient1_en: e1?.name_en ?? e1?.name_fr ?? '',
    ingredient2_en: e2?.name_en ?? e2?.name_fr ?? '',
    result_en: e3?.name_en ?? e3?.name_fr ?? '',
  }
})

export async function GET() {
  return NextResponse.json(recipesList, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}
