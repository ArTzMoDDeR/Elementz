import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ discovered: null })

  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT discovered FROM user_progress WHERE user_id = ${session.user.id}`
  return NextResponse.json({ discovered: rows[0]?.discovered ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { discovered } = await req.json()
  if (!Array.isArray(discovered)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)

  // Translate every incoming name (FR or EN) to canonical French name before storing.
  // This prevents the DB accumulating both "eau" and "water" for the same element.
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
