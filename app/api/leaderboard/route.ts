import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`
    SELECT
      up.user_id,
      up.username,
      up.avatar,
      e.img AS avatar_img,
      (
        SELECT COUNT(*)::int
        FROM unnest(up.discovered) AS d(name)
        WHERE EXISTS (
          SELECT 1 FROM elements el
          WHERE el.name_french = d.name OR el.name_english = d.name
        )
      ) AS count,
      up.updated_at
    FROM user_progress up
    LEFT JOIN elements e
      ON up.avatar IS NOT NULL
      AND (e.name_french = up.avatar OR e.name_english = up.avatar)
    WHERE up.discovered IS NOT NULL
      AND (up.show_in_leaderboard IS NULL OR up.show_in_leaderboard = TRUE)
    ORDER BY count DESC
    LIMIT 50
  `
  return NextResponse.json({ leaderboard: rows })
}
