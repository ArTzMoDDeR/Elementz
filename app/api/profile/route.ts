import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT username, show_in_leaderboard, discovered, avatar
    FROM user_progress
    WHERE user_id = ${session.user.id}
    LIMIT 1
  `
  if (!rows.length) return NextResponse.json({ username: null, show_in_leaderboard: true, discovered_count: 0, avatar: null, discovered: [] })
  const row = rows[0]
  return NextResponse.json({
    username: row.username ?? null,
    show_in_leaderboard: row.show_in_leaderboard ?? true,
    discovered_count: Array.isArray(row.discovered) ? row.discovered.length : 0,
    avatar: row.avatar ?? null,
    discovered: Array.isArray(row.discovered) ? row.discovered : [],
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { username, show_in_leaderboard, avatar } = body

  if (username !== undefined) {
    if (typeof username !== 'string') return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    const trimmed = username.trim()
    if (trimmed.length > 20) return NextResponse.json({ error: 'Username too long (max 20 chars)' }, { status: 400 })
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, spaces, _ and -' }, { status: 400 })
    }
  }

  await sql`
    INSERT INTO user_progress (user_id, username, show_in_leaderboard, avatar)
    VALUES (${session.user.id}, ${username?.trim() ?? null}, ${show_in_leaderboard ?? true}, ${avatar ?? null})
    ON CONFLICT (user_id) DO UPDATE SET
      username = CASE WHEN ${username !== undefined} THEN EXCLUDED.username ELSE user_progress.username END,
      show_in_leaderboard = CASE WHEN ${show_in_leaderboard !== undefined} THEN EXCLUDED.show_in_leaderboard ELSE user_progress.show_in_leaderboard END,
      avatar = CASE WHEN ${avatar !== undefined} THEN EXCLUDED.avatar ELSE user_progress.avatar END
  `
  return NextResponse.json({ ok: true })
}
