import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const sql = neon(process.env.DATABASE_URL)
    const elements = await sql`
      SELECT e.number, e.name_english, e.name_french, e.img,
        COUNT(r.id)::int AS recipe_count
      FROM elements e
      LEFT JOIN recipes r ON r.result_number = e.number
      GROUP BY e.number, e.name_english, e.name_french, e.img
      ORDER BY e.number
    `
    return NextResponse.json(elements)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Only admins can create elements
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!rows[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const nameFr = String(body.name_french ?? '').trim()
    const nameEn = String(body.name_english ?? '').trim() || null

    if (!nameFr) return NextResponse.json({ error: 'name_french required' }, { status: 400 })

    const maxResult = await sql`SELECT COALESCE(MAX(number), 0)::int as max FROM elements`
    const nextNumber = Number(maxResult[0].max) + 1

    const result = await sql`
      INSERT INTO elements (number, name_french, name_english)
      VALUES (${nextNumber}, ${nameFr}, ${nameEn})
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Create failed', detail: msg }, { status: 500 })
  }
}
