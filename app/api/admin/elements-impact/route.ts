import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'DATABASE_URL missing' }, { status: 500 })

    const sql = neon(process.env.DATABASE_URL)

    const adminCheck = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
    if (!adminCheck[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Count how many recipes each element appears in as ingredient1 or ingredient2
    // Also count unique results it can produce, and how many players have unlocked it
    const impact = await sql`
      SELECT
        e.number,
        e.name_french                                  AS name_fr,
        e.name_english                                 AS name_en,
        e.img,
        COUNT(DISTINCT r.id)::int                      AS recipes_as_ingredient,
        COUNT(DISTINCT r.result_number)::int           AS unique_results,
        COUNT(DISTINCT ul.user_id)::int                AS discovered_by
      FROM elements e
      LEFT JOIN recipes r
        ON r.ingredient1_number = e.number OR r.ingredient2_number = e.number
      LEFT JOIN unlocks ul
        ON ul.element_number = e.number
      GROUP BY e.number, e.name_french, e.name_english, e.img
      ORDER BY unique_results DESC
      LIMIT 30
    `

    const total = await sql`SELECT COUNT(*)::int AS n FROM recipes`

    return NextResponse.json({ impact, totalRecipes: total[0].n })
  } catch (err) {
    console.error('[v0] elements-impact error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: 'Internal server error',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
