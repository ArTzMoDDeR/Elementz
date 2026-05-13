import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const sql = neon(process.env.DATABASE_URL)
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() ?? ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '0') || 0, 50)

    if (q) {
      const pattern = `%${q}%`
      const rows = await sql`
        SELECT number, name_english, name_french, img
        FROM elements
        WHERE name_french ILIKE ${pattern} OR name_english ILIKE ${pattern}
        ORDER BY length(name_french) ASC, number ASC
        LIMIT ${limit > 0 ? limit : 10}
      `
      return NextResponse.json({ elements: rows }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const elements = await sql`
      SELECT number, name_english, name_french, img
      FROM elements
      ORDER BY number
      ${limit > 0 ? sql`LIMIT ${limit}` : sql``}
    `
    return NextResponse.json(elements, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[v0] /api/elements error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sql = neon(process.env.DATABASE_URL)
    const adminRow = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
    if (!adminRow[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
