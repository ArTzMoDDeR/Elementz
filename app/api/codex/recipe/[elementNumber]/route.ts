import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ elementNumber: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const { elementNumber } = await context.params
    const resultNumber = parseInt(elementNumber, 10)
    if (!Number.isInteger(resultNumber) || resultNumber <= 0) {
      return NextResponse.json({ recipe: null })
    }

    const session = await auth()
    const sql = neon(process.env.DATABASE_URL)

    if (session?.user?.id) {
      // Return first recipe where BOTH ingredients are unlocked by this user
      const rows = await sql`
        SELECT
          r.ingredient1_number AS ing1_number,
          r.ingredient2_number AS ing2_number
        FROM recipes r
        JOIN unlocks u1 ON u1.element_number = r.ingredient1_number AND u1.user_id = ${session.user.id}
        JOIN unlocks u2 ON u2.element_number = r.ingredient2_number AND u2.user_id = ${session.user.id}
        WHERE r.result_number = ${resultNumber}
        ORDER BY r.id
        LIMIT 1
      `
      return NextResponse.json({ recipe: rows[0] ?? null })
    }

    // Guest: return first available recipe
    const rows = await sql`
      SELECT
        ingredient1_number AS ing1_number,
        ingredient2_number AS ing2_number
      FROM recipes
      WHERE result_number = ${resultNumber}
      ORDER BY id
      LIMIT 1
    `
    return NextResponse.json({ recipe: rows[0] ?? null })
  } catch (err) {
    console.error('[codex/recipe]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
