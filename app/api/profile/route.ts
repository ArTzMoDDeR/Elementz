import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = neon(process.env.DATABASE_URL!)

  const rows = await sql`
    WITH rankings AS (
      SELECT
        up.user_id,
        up.username,
        up.show_in_leaderboard,
        up.haptic_feedback,
        up.avatar,
        up.theme,
        up.onboarding_done,
        COUNT(u.element_number)::int AS discovered_count,
        RANK() OVER (ORDER BY COUNT(u.element_number) DESC)::int AS rank
      FROM user_progress up
      LEFT JOIN unlocks u ON u.user_id = up.user_id
      GROUP BY up.user_id, up.username, up.show_in_leaderboard, up.haptic_feedback, up.avatar
    )
    SELECT * FROM rankings WHERE user_id = ${session.user.id}
    LIMIT 1
  `

  const lastDiscovered = await sql`
    SELECT e.name_french, e.name_english, e.img, u.discovered_at
    FROM unlocks u
    JOIN elements e ON e.number = u.element_number
    WHERE u.user_id = ${session.user.id}
    ORDER BY u.discovered_at DESC
    LIMIT 5
  `

  const totalPlayers = await sql`SELECT COUNT(*)::int AS n FROM user_progress`

  if (!rows.length) return NextResponse.json({ username: null, show_in_leaderboard: true, haptic_feedback: true, discovered_count: 0, avatar: null, rank: null, total_players: 1, last_discovered: [], is_admin: false, theme: 'dark', onboarding_done: false })
  const row = rows[0]

  const adminRow = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`

  return NextResponse.json({
    username: row.username ?? null,
    show_in_leaderboard: row.show_in_leaderboard ?? true,
    haptic_feedback: row.haptic_feedback ?? true,
    discovered_count: row.discovered_count ?? 0,
    avatar: row.avatar ?? null,
    rank: row.rank ?? null,
    total_players: totalPlayers[0]?.n ?? 1,
    last_discovered: lastDiscovered,
    is_admin: adminRow[0]?.is_admin === 1,
    theme: row.theme ?? 'dark',
    onboarding_done: row.onboarding_done ?? false,
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = neon(process.env.DATABASE_URL!)

  const body = await req.json()
  const { username, show_in_leaderboard, avatar, haptic_feedback, theme, onboarding_done } = body

  if (username !== undefined) {
    if (typeof username !== 'string') return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    const trimmed = username.trim()
    if (trimmed.length > 20) return NextResponse.json({ error: 'Username too long (max 20 chars)' }, { status: 400 })
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, spaces, _ and -' }, { status: 400 })
    }
    // Enforce unique username (case-insensitive), ignoring the user's own current username
    if (trimmed.length > 0) {
      const conflict = await sql`
        SELECT 1 FROM user_progress
        WHERE LOWER(username) = LOWER(${trimmed}) AND user_id != ${session.user.id}
        LIMIT 1
      `
      if (conflict.length) return NextResponse.json({ error: 'Ce pseudo est déjà pris' }, { status: 409 })
    }
  }

  await sql`
    INSERT INTO user_progress (user_id, username, show_in_leaderboard, avatar, haptic_feedback, theme, onboarding_done)
    VALUES (${session.user.id}, ${username?.trim() ?? null}, ${show_in_leaderboard ?? true}, ${avatar ?? null}, ${haptic_feedback ?? true}, ${theme ?? 'dark'}, ${onboarding_done ?? false})
    ON CONFLICT (user_id) DO UPDATE SET
      username = CASE WHEN ${username !== undefined} THEN EXCLUDED.username ELSE user_progress.username END,
      show_in_leaderboard = CASE WHEN ${show_in_leaderboard !== undefined} THEN EXCLUDED.show_in_leaderboard ELSE user_progress.show_in_leaderboard END,
      avatar = CASE WHEN ${avatar !== undefined} THEN EXCLUDED.avatar ELSE user_progress.avatar END,
      haptic_feedback = CASE WHEN ${haptic_feedback !== undefined} THEN EXCLUDED.haptic_feedback ELSE user_progress.haptic_feedback END,
      theme = CASE WHEN ${theme !== undefined} THEN EXCLUDED.theme ELSE user_progress.theme END,
      onboarding_done = CASE WHEN ${onboarding_done !== undefined} THEN EXCLUDED.onboarding_done ELSE user_progress.onboarding_done END
  `
  return NextResponse.json({ ok: true })
}
