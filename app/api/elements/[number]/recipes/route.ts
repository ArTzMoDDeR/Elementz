import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!rows[0]?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { sql }
}

// GET: open to authenticated users (used by admin panel)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = await context.params
  const elementNumber = parseInt(params.number)
  if (isNaN(elementNumber) || elementNumber < 1) {
    return NextResponse.json({ error: 'Invalid element number' }, { status: 400 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
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
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST: admin-only — add a new recipe
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  const check = await requireAdmin()
  if (check.error) return check.error

  const params = await context.params
  const resultNumber = parseInt(params.number)
  if (isNaN(resultNumber) || resultNumber < 1) {
    return NextResponse.json({ error: 'Invalid element number' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const ing1 = parseInt(body.ingredient1_number)
    const ing2 = parseInt(body.ingredient2_number)
    if (isNaN(ing1) || isNaN(ing2) || ing1 < 1 || ing2 < 1) {
      return NextResponse.json({ error: 'Invalid ingredient numbers' }, { status: 400 })
    }

    const sql = check.sql!
    const [recipe] = await sql`
      INSERT INTO recipes (ingredient1_number, ingredient2_number, result_number)
      VALUES (${ing1}, ${ing2}, ${resultNumber})
      RETURNING id
    `
    return NextResponse.json({ success: true, id: recipe.id })
  } catch {
    return NextResponse.json({ error: 'Failed to add recipe' }, { status: 500 })
  }
}
