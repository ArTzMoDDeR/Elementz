import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`
    SELECT
      user_id,
      username,
      avatar,
      array_length(discovered, 1) AS count,
      updated_at
    FROM user_progress
    WHERE discovered IS NOT NULL
      AND (show_in_leaderboard IS NULL OR show_in_leaderboard = TRUE)
    ORDER BY count DESC
    LIMIT 50
  `
  return NextResponse.json({ leaderboard: rows })
}
