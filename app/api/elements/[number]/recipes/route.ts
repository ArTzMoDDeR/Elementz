import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const params = await context.params
    const elementNumber = parseInt(params.number)
    const sql = neon(process.env.DATABASE_URL)

    const recipes = await sql`
      SELECT 
        r.id,
        e1.number as ingredient1_number,
        e1.name_french as ingredient1_name,
        e2.number as ingredient2_number,
        e2.name_french as ingredient2_name
      FROM recipes r
      JOIN elements e1 ON r.ingredient1_number = e1.number
      JOIN elements e2 ON r.ingredient2_number = e2.number
      WHERE r.result_number = ${elementNumber}
      ORDER BY r.id
    `
    return NextResponse.json(recipes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const params = await context.params
    const resultNumber = parseInt(params.number)
    const body = await request.json()
    const sql = neon(process.env.DATABASE_URL)

    const [recipe] = await sql`
      INSERT INTO recipes (ingredient1_number, ingredient2_number, result_number)
      VALUES (${body.ingredient1_number}, ${body.ingredient2_number}, ${resultNumber})
      RETURNING id
    `
    return NextResponse.json({ success: true, id: recipe.id })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add recipe' }, { status: 500 })
  }
}
