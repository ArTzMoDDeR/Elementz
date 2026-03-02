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

  // Double-write: 1) unlocks table (new source of truth), 2) user_progress (kept in sync)

  // 1) Insert new unlocks — one row per element, skip existing (ON CONFLICT DO NOTHING)
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

  // 2) Keep user_progress in sync (legacy — will be removed once fully migrated)
  await sql`
    INSERT INTO user_progress (user_id, discovered, updated_at)
    VALUES (
      ${session.user.id},
      (
        SELECT array_agg(DISTINCT el.name_french ORDER BY el.name_french)
        FROM unnest(${discovered}::text[]) AS d(name)
        JOIN elements el ON el.name_french = d.name OR el.name_english = d.name
      ),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
      SET discovered = (
        SELECT array_agg(DISTINCT el.name_french ORDER BY el.name_french)
        FROM (
          SELECT unnest(user_progress.discovered) AS name
          UNION ALL
          SELECT unnest(${discovered}::text[]) AS name
        ) combined
        JOIN elements el ON el.name_french = combined.name OR el.name_english = combined.name
      ),
      updated_at = NOW()
  `

  return NextResponse.json({ ok: true })
}
