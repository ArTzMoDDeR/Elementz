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
  // Always UNION with existing — never remove elements already unlocked
  await sql`
    INSERT INTO user_progress (user_id, discovered, updated_at)
    VALUES (${session.user.id}, ${discovered}, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET discovered = (
        SELECT array_agg(DISTINCT elem)
        FROM unnest(user_progress.discovered || EXCLUDED.discovered) AS elem
      ),
      updated_at = NOW()
  `
  return NextResponse.json({ ok: true })
}
