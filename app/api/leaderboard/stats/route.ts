import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)

  // Basic profile info + total count
  const [profile] = await sql`
    SELECT
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
    WHERE up.user_id = ${userId}
      AND (up.show_in_leaderboard IS NULL OR up.show_in_leaderboard = TRUE)
    GROUP BY up.user_id, up.username, up.avatar, e.img
  `

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const first = new Date(profile.first_unlock)
  const last = new Date(profile.last_unlock)
  const spanMs = last.getTime() - first.getTime()
  const spanDays = spanMs / 86400000

  // Choose bucket granularity: hourly if < 3 days, daily if < 60 days, weekly otherwise
  const granularity = spanDays < 3 ? 'hour' : spanDays < 60 ? 'day' : 'week'

  // Discovery curve: cumulative count bucketed by granularity
  const curve = await sql`
    SELECT
      DATE_TRUNC(${granularity}, discovered_at AT TIME ZONE 'UTC') AS bucket,
      COUNT(*)::int AS new_discoveries
    FROM unlocks
    WHERE user_id = ${userId}
    GROUP BY bucket
    ORDER BY bucket ASC
  `

  // Build cumulative series, ensuring first point = 0 at first_unlock bucket
  // and last point = total at last_unlock bucket
  let running = 0
  const series: Array<{ bucket: string; cumulative: number; new: number }> = []

  for (const row of curve) {
    running += row.new_discoveries
    series.push({
      bucket: new Date(row.bucket).toISOString(),
      cumulative: running,
      new: row.new_discoveries,
    })
  }

  // Ensure the series starts with a 0-point at first_unlock if first bucket
  // doesn't already represent it (prepend a ghost point just before)
  if (series.length > 0) {
    const firstBucket = new Date(series[0].bucket).getTime()
    const firstUnlockMs = first.getTime()
    // If first bucket is the same as first_unlock, prepend a 0-point 1ms before
    if (Math.abs(firstBucket - firstUnlockMs) < 86400000) {
      series.unshift({ bucket: new Date(firstUnlockMs - 1).toISOString(), cumulative: 0, new: 0 })
    }
    // Ensure last point is exactly at last_unlock
    const lastBucket = new Date(series[series.length - 1].bucket).getTime()
    const lastUnlockMs = last.getTime()
    if (Math.abs(lastBucket - lastUnlockMs) > 60000 && series[series.length - 1].cumulative < profile.count) {
      series.push({ bucket: last.toISOString(), cumulative: profile.count, new: 0 })
    }
  }

  return NextResponse.json({
    username: profile.username ?? null,
    avatar_img: profile.avatar_img ?? null,
    count: profile.count,
    first_unlock: profile.first_unlock,
    last_unlock: profile.last_unlock,
    granularity,
    series,
  })
}
