import { NextRequest, NextResponse } from 'next/server'
import { elements as localElements } from '@/lib/data/elements'
import { recipes as localRecipes } from '@/lib/data/recipes'

// Build fast lookups
const elemById = new Map(localElements.map((e: any) => [e.id, e]))

// Build recipe map keyed by "a|b" (a <= b) for fast lookup
const recipeMap = new Map<string, number[]>()
for (const r of localRecipes as any[]) {
  const a = Math.min(r.ingredient1, r.ingredient2)
  const b = Math.max(r.ingredient1, r.ingredient2)
  const key = `${a}|${b}`
  if (!recipeMap.has(key)) recipeMap.set(key, [])
  recipeMap.get(key)!.push(r.result)
}

function findReward(discoveredIds: number[]): { result: number; ing1: number; ing2: number } | null {
  const discovered = new Set(discoveredIds)
  const arr = discoveredIds

  const candidates: Array<{ result: number; ing1: number; ing2: number }> = []

  for (let i = 0; i < arr.length; i++) {
    for (let j = i; j < arr.length; j++) {
      const a = Math.min(arr[i], arr[j])
      const b = Math.max(arr[i], arr[j])
      const results = recipeMap.get(`${a}|${b}`) ?? []
      for (const res of results) {
        if (!discovered.has(res)) {
          candidates.push({ result: res, ing1: arr[i], ing2: arr[j] })
        }
      }
    }
  }

  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const discoveredIds: number[] = Array.isArray(body.discovered) ? body.discovered : []

  const hint = findReward(discoveredIds)
  if (!hint) {
    return NextResponse.json({ error: 'no_recipe_found' }, { status: 404 })
  }

  const ing1El = elemById.get(hint.ing1) as any
  const ing2El = elemById.get(hint.ing2) as any
  const resultEl = elemById.get(hint.result) as any

  return NextResponse.json({
    result: hint.result,
    ing1: hint.ing1,
    ing2: hint.ing2,
    ing1_name_fr: ing1El?.name_fr ?? '',
    ing1_name_en: ing1El?.name_en ?? ing1El?.name_fr ?? '',
    ing1_img: ing1El ? `/elements/${ing1El.id}.webp` : null,
    ing2_name_fr: ing2El?.name_fr ?? '',
    ing2_name_en: ing2El?.name_en ?? ing2El?.name_fr ?? '',
    ing2_img: ing2El ? `/elements/${ing2El.id}.webp` : null,
    result_name_fr: resultEl?.name_fr ?? '',
    result_name_en: resultEl?.name_en ?? resultEl?.name_fr ?? '',
    result_img: resultEl ? `/elements/${resultEl.id}.webp` : null,
  })
}
