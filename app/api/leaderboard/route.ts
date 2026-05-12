import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)

  // Top 50 with first + last unlock timestamps for duration
  const rows = await sql`
    SELECT
      up.user_id,
      up.username,
      up.avatar,
      e.img                        AS avatar_img,
      COUNT(u.element_number)::int AS count,
      MIN(u.discovered_at)         AS first_unlock,
      MAX(u.discovered_at)         AS last_unlock
    FROM user_progress up
    JOIN unlocks u ON u.user_id = up.user_id
    LEFT JOIN elements e
      ON up.avatar IS NOT NULL
      AND (e.name_french = up.avatar OR e.name_english = up.avatar)
    WHERE (up.show_in_leaderboard IS NULL OR up.show_in_leaderboard = TRUE)
    GROUP BY up.user_id, up.username, up.avatar, e.img
    ORDER BY
      count DESC,
      -- Tiebreak: shortest playtime (last - first unlock) wins
      (MAX(u.discovered_at) - MIN(u.discovered_at)) ASC NULLS LAST
    LIMIT 50
  `

  // Current user's rank (if logged in and not already in top 50)
  let currentUser: { rank: number; count: number; username: string | null; avatar_img: string | null } | null = null
  if (session?.user?.id) {
    const userId = session.user.id
    const inTop50 = rows.some((r: any) => r.user_id === userId)
    if (!inTop50) {
      const rankRows = await sql`
        WITH ranked AS (
          SELECT
            up.user_id,
            up.username,
            e.img AS avatar_img,
            COUNT(u.element_number)::int AS count,
            RANK() OVER (ORDER BY COUNT(u.element_number) DESC, (MAX(u.discovered_at) - MIN(u.discovered_at)) ASC NULLS LAST)::int AS rank
          FROM user_progress up
          JOIN unlocks u ON u.user_id = up.user_id
          LEFT JOIN elements e
            ON up.avatar IS NOT NULL
            AND (e.name_french = up.avatar OR e.name_english = up.avatar)
          WHERE (up.show_in_leaderboard IS NULL OR up.show_in_leaderboard = TRUE)
          GROUP BY up.user_id, up.username, up.avatar, e.img
        )
        SELECT rank, count, username, avatar_img FROM ranked WHERE user_id = ${userId}
      `
      if (rankRows.length > 0) {
        currentUser = {
          rank: rankRows[0].rank,
          count: rankRows[0].count,
          username: rankRows[0].username ?? null,
          avatar_img: rankRows[0].avatar_img ?? null,
        }
      }
    }
  }

  const leaderboard = rows.map((r: any, i: number) => ({
    user_id: r.user_id,
    username: r.username ?? null,
    avatar_img: r.avatar_img ?? null,
    count: r.count,
    first_unlock: r.first_unlock ?? null,
    last_unlock: r.last_unlock ?? null,
    is_current_user: session?.user?.id ? r.user_id === session.user.id : false,
    rank: i + 1,
  }))

  return NextResponse.json({ leaderboard, currentUser })
}
