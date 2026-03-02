import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ discovered: null })

  const sql = neon(process.env.DATABASE_URL!)

  // Read from unlocks table — join elements to get FR name for store compatibility
  const rows = await sql`
    SELECT e.name_french
    FROM unlocks u
    JOIN elements e ON e.number = u.element_number
    WHERE u.user_id = ${session.user.id}
    ORDER BY u.discovered_at ASC
  `
  return NextResponse.json({ discovered: rows.map(r => r.name_french) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { discovered } = await req.json()
  if (!Array.isArray(discovered)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)

  // Insert new unlocks — one row per element, skip existing (ON CONFLICT DO NOTHING)
  if (discovered.length > 0) {
    await sql`
      INSERT INTO unlocks (user_id, element_number, discovered_at)
      SELECT
        ${session.user.id},
        e.number,
        NOW()
      FROM unnest(${discovered}::text[]) AS d(name)
      JOIN elements e ON e.name_french = d.name OR e.name_english = d.name
      ON CONFLICT DO NOTHING
    `
  }

  return NextResponse.json({ ok: true })
}
