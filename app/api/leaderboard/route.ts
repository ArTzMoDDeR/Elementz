import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)

  const rows = await sql`
    SELECT
      up.user_id,
      up.username,
      up.avatar,
      e.img           AS avatar_img,
      COUNT(u.element_number)::int AS count,
      MAX(u.discovered_at)  AS updated_at,
      us.created_at   AS joined_at
    FROM user_progress up
    JOIN unlocks u ON u.user_id = up.user_id
    JOIN users   us ON us.id    = up.user_id
    LEFT JOIN elements e
      ON up.avatar IS NOT NULL
      AND (e.name_french = up.avatar OR e.name_english = up.avatar)
    WHERE (up.show_in_leaderboard IS NULL OR up.show_in_leaderboard = TRUE)
    GROUP BY up.user_id, up.username, up.avatar, e.img, us.created_at
    ORDER BY count DESC
    LIMIT 50
  `

  const userIds = rows.map((r: any) => r.user_id)
  let lastElements: Record<string, Array<{ img: string | null; name: string }>> = {}

  if (userIds.length > 0) {
    // Get last 3 discovered elements per user via a ranked subquery
    const recents = await sql`
      SELECT r.user_id, r.img, r.name
      FROM (
        SELECT
          u.user_id,
          e.img,
          COALESCE(e.name_french, e.name_english) AS name,
          ROW_NUMBER() OVER (PARTITION BY u.user_id ORDER BY u.discovered_at DESC) AS rn
        FROM unlocks u
        JOIN elements e ON e.number = u.element_number
        WHERE u.user_id = ANY(${userIds})
          AND e.img IS NOT NULL
      ) r
      WHERE r.rn <= 3
    `
    for (const r of recents) {
      if (!lastElements[r.user_id]) lastElements[r.user_id] = []
      lastElements[r.user_id].push({ img: r.img, name: r.name })
    }
  }

  const leaderboard = rows.map((r: any) => ({
    ...r,
    last_elements: lastElements[r.user_id] ?? [],
  }))

  return NextResponse.json({ leaderboard })
}
