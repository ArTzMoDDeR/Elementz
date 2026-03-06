import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ elementName: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const { elementName } = await context.params
    const session = await auth()
    const sql = neon(process.env.DATABASE_URL)

    if (session?.user?.id) {
      // First, resolve the element number from the name
      const elRows = await sql`
        SELECT number FROM elements
        WHERE name_french = ${elementName} OR name_english = ${elementName}
        LIMIT 1
      `
      if (elRows.length === 0) return NextResponse.json({ recipe: null })
      const resultNumber = elRows[0].number

      // Return the first recipe where BOTH ingredients are unlocked by this user
      const rows = await sql`
        SELECT
          e1.name_french AS ing1_name,
          e1.image_url   AS ing1_img,
          e2.name_french AS ing2_name,
          e2.image_url   AS ing2_img
        FROM recipes r
        JOIN elements e1 ON e1.number = r.ingredient1_number
        JOIN elements e2 ON e2.number = r.ingredient2_number
        JOIN unlocks u1
          ON u1.element_number = r.ingredient1_number
          AND u1.user_id = ${session.user.id}
        JOIN unlocks u2
          ON u2.element_number = r.ingredient2_number
          AND u2.user_id = ${session.user.id}
        WHERE r.result_number = ${resultNumber}
        ORDER BY r.id
        LIMIT 1
      `

      return NextResponse.json({ recipe: rows[0] ?? null })
    }

    // Guest: return the first recipe regardless of unlocks
    const elRows = await sql`
      SELECT number FROM elements
      WHERE name_french = ${elementName} OR name_english = ${elementName}
      LIMIT 1
    `
    if (elRows.length === 0) return NextResponse.json({ recipe: null })
    const resultNumber = elRows[0].number

    const rows = await sql`
      SELECT
        e1.name_french AS ing1_name,
        e1.image_url   AS ing1_img,
        e2.name_french AS ing2_name,
        e2.image_url   AS ing2_img
      FROM recipes r
      JOIN elements e1 ON e1.number = r.ingredient1_number
      JOIN elements e2 ON e2.number = r.ingredient2_number
      WHERE r.result_number = ${resultNumber}
      ORDER BY r.id
      LIMIT 1
    `
    return NextResponse.json({ recipe: rows[0] ?? null })
  } catch (err) {
    console.error('[codex/recipe] error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
