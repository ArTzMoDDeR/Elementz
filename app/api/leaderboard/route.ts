import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!)

  const rows = await sql`
    SELECT
      up.user_id,
      up.username,
      up.avatar,
      e.img        AS avatar_img,
      COUNT(u.element_number)::int AS count,
      MAX(u.discovered_at) AS updated_at,
      up.created_at AS joined_at
    FROM user_progress up
    JOIN unlocks u ON u.user_id = up.user_id
    LEFT JOIN elements e
      ON up.avatar IS NOT NULL
      AND (e.name_french = up.avatar OR e.name_english = up.avatar)
    WHERE (up.show_in_leaderboard IS NULL OR up.show_in_leaderboard = TRUE)
    GROUP BY up.user_id, up.username, up.avatar, e.img, up.created_at
    ORDER BY count DESC
    LIMIT 50
  `

  // Fetch last 3 unlocked elements per user
  const userIds = rows.map((r: any) => r.user_id)
  let lastElements: Record<string, Array<{ img: string | null; name: string }>> = {}

  if (userIds.length > 0) {
    const recents = await sql`
      SELECT DISTINCT ON (u.user_id)
        u.user_id,
        array_agg(e.img ORDER BY u.discovered_at DESC) FILTER (WHERE e.img IS NOT NULL) AS imgs,
        array_agg(COALESCE(e.name_french, e.name_english) ORDER BY u.discovered_at DESC) AS names
      FROM (
        SELECT user_id, element_number, discovered_at
        FROM unlocks
        WHERE user_id = ANY(${userIds})
        ORDER BY discovered_at DESC
      ) u
      JOIN elements e ON e.number = u.element_number
      GROUP BY u.user_id
    `
    for (const r of recents) {
      lastElements[r.user_id] = (r.imgs ?? []).slice(0, 3).map((img: string, i: number) => ({
        img,
        name: r.names?.[i] ?? '',
      }))
    }
  }

  const leaderboard = rows.map((r: any) => ({
    ...r,
    last_elements: lastElements[r.user_id] ?? [],
  }))

  return NextResponse.json({ leaderboard })
}
