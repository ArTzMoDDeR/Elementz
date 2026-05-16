import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'
import { elements as localElements } from '@/lib/data/elements'

// Map local data format to the API shape the game expects
const elementsList = localElements.map(e => ({
  number: e.id,
  name_french: e.name_fr,
  name_english: e.name_en,
  img: e.img,
}))

// Build lookup maps for fast access
const byNumber = new Map(elementsList.map(e => [e.number, e]))

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() ?? ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '0') || 0, 50)

    let results = elementsList

    if (q) {
      const lower = q.toLowerCase()
      results = elementsList
        .filter(e =>
          e.name_french.toLowerCase().includes(lower) ||
          (e.name_english ?? '').toLowerCase().includes(lower)
        )
        .sort((a, b) => a.name_french.length - b.name_french.length)
        .slice(0, limit > 0 ? limit : 10)
      return NextResponse.json({ elements: results }, {
        headers: { 'Cache-Control': 'public, max-age=86400' },
      })
    }

    if (limit > 0) results = results.slice(0, limit)

    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  } catch (err) {
    console.error('[v0] /api/elements error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Element creation still writes to DB (admin feature)
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
