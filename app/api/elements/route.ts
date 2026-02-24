import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'No DB' }, { status: 500 })
    const sql = neon(process.env.DATABASE_URL)
    const elements = await sql`SELECT number, name_english, name_french, img FROM elements ORDER BY number`
    return NextResponse.json(elements)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('[v0] POST /api/elements: no DATABASE_URL')
      return NextResponse.json({ error: 'No DB' }, { status: 500 })
    }

    const body = await request.json()
    console.log('[v0] POST /api/elements body:', JSON.stringify(body))

    const nameFr = String(body.name_french ?? '').trim()
    const nameEn = String(body.name_english ?? body.name_french ?? '').trim() || nameFr
    console.log('[v0] POST /api/elements nameFr:', nameFr, 'nameEn:', nameEn)

    if (!nameFr) return NextResponse.json({ error: 'name_french required' }, { status: 400 })

    const sql = neon(process.env.DATABASE_URL)

    const maxResult = await sql`SELECT COALESCE(MAX(number), 0)::int as max FROM elements`
    console.log('[v0] POST /api/elements maxResult:', JSON.stringify(maxResult))
    const nextNumber = Number(maxResult[0].max) + 1
    console.log('[v0] POST /api/elements nextNumber:', nextNumber)

    const result = await sql`
      INSERT INTO elements (number, name_french, name_english)
      VALUES (${nextNumber}, ${nameFr}, ${nameEn})
      RETURNING *
    `
    console.log('[v0] POST /api/elements inserted:', JSON.stringify(result))
    return NextResponse.json(result[0])
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[v0] POST /api/elements CATCH:', msg)
    return NextResponse.json({ error: 'Create failed', detail: msg }, { status: 500 })
  }
}
