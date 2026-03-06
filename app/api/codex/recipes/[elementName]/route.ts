import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ elementName: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })

    const { elementName } = await context.params
    const decoded = decodeURIComponent(elementName)
    const session = await auth()
    const sql = neon(process.env.DATABASE_URL)

    if (!session?.user?.id) {
      // Not logged in — return all recipes for this element (no filtering)
      const recipes = await sql`
        SELECT
          e1.name_french AS ing1_name, e1.img AS ing1_img,
          e2.name_french AS ing2_name, e2.img AS ing2_img
        FROM recipes r
        JOIN elements e1 ON r.ingredient1_number = e1.number
        JOIN elements e2 ON r.ingredient2_number = e2.number
        JOIN elements er ON r.result_number = er.number
        WHERE er.name_french = ${decoded}
        ORDER BY r.id
      `
      return NextResponse.json({ recipes, filtered: false })
    }

    // Logged in — only return recipes where BOTH ingredients are unlocked by this user
    const recipes = await sql`
      SELECT
        e1.name_french AS ing1_name, e1.img AS ing1_img,
        e2.name_french AS ing2_name, e2.img AS ing2_img
      FROM recipes r
      JOIN elements e1 ON r.ingredient1_number = e1.number
      JOIN elements e2 ON r.ingredient2_number = e2.number
      JOIN elements er ON r.result_number = er.number
      -- Both ingredients must be in the user's unlocks
      JOIN unlocks u1 ON u1.element_number = e1.number AND u1.user_id = ${session.user.id}
      JOIN unlocks u2 ON u2.element_number = e2.number AND u2.user_id = ${session.user.id}
      WHERE er.name_french = ${decoded}
      ORDER BY r.id
    `
    return NextResponse.json({ recipes, filtered: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
