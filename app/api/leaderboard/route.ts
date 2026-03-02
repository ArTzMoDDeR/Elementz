import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!)

  // Read element count from unlocks (accurate, sorted by real discovery order)
  const rows = await sql`
    SELECT
      up.user_id,
      up.username,
      up.avatar,
      e.img        AS avatar_img,
      COUNT(u.element_number)::int AS count,
      MAX(u.discovered_at) AS updated_at
    FROM user_progress up
    JOIN unlocks u ON u.user_id = up.user_id
    LEFT JOIN elements e
      ON up.avatar IS NOT NULL
      AND (e.name_french = up.avatar OR e.name_english = up.avatar)
    WHERE (up.show_in_leaderboard IS NULL OR up.show_in_leaderboard = TRUE)
    GROUP BY up.user_id, up.username, up.avatar, e.img
    ORDER BY count DESC
    LIMIT 50
  `
  return NextResponse.json({ leaderboard: rows })
}
