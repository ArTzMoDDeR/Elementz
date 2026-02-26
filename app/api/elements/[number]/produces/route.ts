import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

// Returns all recipes where this element is an ingredient, with the result element
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const params = await context.params
    const elementNumber = parseInt(params.number)
    const sql = neon(process.env.DATABASE_URL)

    const produces = await sql`
      SELECT
        r.id,
        -- the other ingredient
        CASE WHEN r.ingredient1_number = ${elementNumber}
          THEN e2.number ELSE e1.number END AS other_number,
        CASE WHEN r.ingredient1_number = ${elementNumber}
          THEN e2.name_french ELSE e1.name_french END AS other_name,
        CASE WHEN r.ingredient1_number = ${elementNumber}
          THEN e2.img ELSE e1.img END AS other_img,
        -- the result
        er.number  AS result_number,
        er.name_french AS result_name,
        er.img     AS result_img
      FROM recipes r
      JOIN elements e1 ON r.ingredient1_number = e1.number
      JOIN elements e2 ON r.ingredient2_number = e2.number
      JOIN elements er ON r.result_number      = er.number
      WHERE r.ingredient1_number = ${elementNumber}
         OR r.ingredient2_number = ${elementNumber}
      ORDER BY other_name
    `
    return NextResponse.json(produces)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
