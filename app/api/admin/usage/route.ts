import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!rows[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Discoveries per day — last 14 days
  const discoveriesPerDay = await sql`
    SELECT discovered_at::date AS day, COUNT(*)::int AS count
    FROM unlocks
    WHERE discovered_at >= NOW() - INTERVAL '14 days'
    GROUP BY day ORDER BY day ASC
  `

  // New users per day — last 14 days
  const signupsPerDay = await sql`
    SELECT created_at::date AS day, COUNT(*)::int AS count
    FROM users
    WHERE created_at >= NOW() - INTERVAL '14 days'
    GROUP BY day ORDER BY day ASC
  `

  // Active users per day (had at least 1 discovery) — last 14 days
  const activePerDay = await sql`
    SELECT discovered_at::date AS day, COUNT(DISTINCT user_id)::int AS count
    FROM unlocks
    WHERE discovered_at >= NOW() - INTERVAL '14 days'
    GROUP BY day ORDER BY day ASC
  `

  // Top 15 most discovered elements
  const topElements = await sql`
    SELECT e.number, e.name_french, e.name_english, e.img, COUNT(ul.user_id)::int AS count
    FROM elements e
    JOIN unlocks ul ON ul.element_number = e.number
    GROUP BY e.number, e.name_french, e.name_english, e.img
    ORDER BY count DESC
    LIMIT 15
  `

  // Retention: among users created N+ days ago, how many were active in the last N days
  const retention = await sql`
    SELECT
      -- D1: users created 2+ days ago who were active yesterday or today
      (
        SELECT COUNT(DISTINCT u.id)::float / NULLIF(COUNT(DISTINCT u2.id)::float, 0)
        FROM users u
        JOIN unlocks ul ON ul.user_id = u.id AND ul.discovered_at >= u.created_at + INTERVAL '1 day' AND ul.discovered_at < u.created_at + INTERVAL '2 days'
        JOIN users u2 ON u2.created_at <= NOW() - INTERVAL '2 days'
      ) AS d1,
      -- D7
      (
        SELECT COUNT(DISTINCT u.id)::float / NULLIF(COUNT(DISTINCT u2.id)::float, 0)
        FROM users u
        JOIN unlocks ul ON ul.user_id = u.id AND ul.discovered_at >= u.created_at + INTERVAL '7 days' AND ul.discovered_at < u.created_at + INTERVAL '8 days'
        JOIN users u2 ON u2.created_at <= NOW() - INTERVAL '8 days'
      ) AS d7,
      -- D30
      (
        SELECT COUNT(DISTINCT u.id)::float / NULLIF(COUNT(DISTINCT u2.id)::float, 0)
        FROM users u
        JOIN unlocks ul ON ul.user_id = u.id AND ul.discovered_at >= u.created_at + INTERVAL '30 days' AND ul.discovered_at < u.created_at + INTERVAL '31 days'
        JOIN users u2 ON u2.created_at <= NOW() - INTERVAL '31 days'
      ) AS d30
  `

  // Total combinations tried today vs yesterday
  const combosStats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE discovered_at::date = CURRENT_DATE)::int AS today,
      COUNT(*) FILTER (WHERE discovered_at::date = CURRENT_DATE - 1)::int AS yesterday
    FROM unlocks
  `

  // Average discoveries per active user
  const avgDiscoveries = await sql`
    SELECT ROUND(AVG(cnt))::int AS avg FROM (
      SELECT COUNT(*)::int AS cnt FROM unlocks GROUP BY user_id
    ) sub
  `

  // Users with 0 discoveries (registered but never played)
  const neverPlayed = await sql`
    SELECT COUNT(*)::int AS n FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM unlocks ul WHERE ul.user_id = u.id)
  `

  return NextResponse.json({
    discoveriesPerDay,
    signupsPerDay,
    activePerDay,
    topElements,
    retention: retention[0],
    combosToday: combosStats[0].today,
    combosYesterday: combosStats[0].yesterday,
    avgDiscoveries: avgDiscoveries[0].avg,
    neverPlayed: neverPlayed[0].n,
  })
}
