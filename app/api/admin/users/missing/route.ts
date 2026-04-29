import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const me = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!me[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const rows = await sql`
    SELECT e.number, e.name_french, e.name_english
    FROM elements e
    WHERE NOT EXISTS (
      SELECT 1 FROM unlocks u
      WHERE u.user_id = ${userId}
      AND u.element_number = e.number
    )
    ORDER BY e.number ASC
  `

  const total = await sql`SELECT COUNT(*)::int AS count FROM elements`

  return NextResponse.json({ missing: rows, total: total[0].count })
}
