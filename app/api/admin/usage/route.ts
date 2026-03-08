import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!rows[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Discoveries per day — last 14 days, returned as ISO string
  const discoveriesPerDay = await sql`
    SELECT TO_CHAR(discovered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM unlocks
    WHERE discovered_at >= NOW() - INTERVAL '14 days'
    GROUP BY day ORDER BY day ASC
  `

  // New users per day — last 14 days
  const signupsPerDay = await sql`
    SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM users
    WHERE created_at >= NOW() - INTERVAL '14 days'
    GROUP BY day ORDER BY day ASC
  `

  // Active users per day (at least 1 discovery) — last 14 days
  const activePerDay = await sql`
    SELECT TO_CHAR(discovered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(DISTINCT user_id)::int AS count
    FROM unlocks
    WHERE discovered_at >= NOW() - INTERVAL '14 days'
    GROUP BY day ORDER BY day ASC
  `

  // Retention D1/D7/D30
  const retention = await sql`
    SELECT
      (
        SELECT COUNT(DISTINCT u.id)::float / NULLIF((SELECT COUNT(*)::float FROM users WHERE created_at <= NOW() - INTERVAL '2 days'), 0)
        FROM users u
        JOIN unlocks ul ON ul.user_id = u.id
          AND ul.discovered_at >= u.created_at + INTERVAL '1 day'
          AND ul.discovered_at < u.created_at + INTERVAL '2 days'
      ) AS d1,
      (
        SELECT COUNT(DISTINCT u.id)::float / NULLIF((SELECT COUNT(*)::float FROM users WHERE created_at <= NOW() - INTERVAL '8 days'), 0)
        FROM users u
        JOIN unlocks ul ON ul.user_id = u.id
          AND ul.discovered_at >= u.created_at + INTERVAL '7 days'
          AND ul.discovered_at < u.created_at + INTERVAL '8 days'
      ) AS d7,
      (
        SELECT COUNT(DISTINCT u.id)::float / NULLIF((SELECT COUNT(*)::float FROM users WHERE created_at <= NOW() - INTERVAL '31 days'), 0)
        FROM users u
        JOIN unlocks ul ON ul.user_id = u.id
          AND ul.discovered_at >= u.created_at + INTERVAL '30 days'
          AND ul.discovered_at < u.created_at + INTERVAL '31 days'
      ) AS d30
  `

  // Today vs yesterday discoveries
  const combosStats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE discovered_at::date = CURRENT_DATE)::int AS today,
      COUNT(*) FILTER (WHERE discovered_at::date = CURRENT_DATE - 1)::int AS yesterday
    FROM unlocks
  `

  // Average + median discoveries per active player
  const playerStats = await sql`
    SELECT
      ROUND(AVG(cnt))::int AS avg_discoveries,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cnt)::int AS median_discoveries
    FROM (SELECT user_id, COUNT(*) AS cnt FROM unlocks GROUP BY user_id) sub
  `

  // Player distribution by engagement level
  const playerDistribution = await sql`
    SELECT
      SUM(CASE WHEN cnt BETWEEN 1 AND 10 THEN 1 ELSE 0 END)::int AS casual,
      SUM(CASE WHEN cnt BETWEEN 11 AND 50 THEN 1 ELSE 0 END)::int AS engaged,
      SUM(CASE WHEN cnt BETWEEN 51 AND 150 THEN 1 ELSE 0 END)::int AS active,
      SUM(CASE WHEN cnt > 150 THEN 1 ELSE 0 END)::int AS hardcore
    FROM (SELECT user_id, COUNT(*) AS cnt FROM unlocks GROUP BY user_id) sub
  `

  // Top 10 players by discoveries
  const topPlayers = await sql`
    SELECT u.name, COUNT(ul.element_number)::int AS discoveries
    FROM unlocks ul
    JOIN users u ON u.id = ul.user_id
    GROUP BY u.id, u.name
    ORDER BY discoveries DESC
    LIMIT 10
  `

  return NextResponse.json({
    discoveriesPerDay,
    signupsPerDay,
    activePerDay,
    retention: retention[0],
    combosToday: combosStats[0].today,
    combosYesterday: combosStats[0].yesterday,
    avgDiscoveries: playerStats[0].avg_discoveries,
    medianDiscoveries: playerStats[0].median_discoveries,
    playerDistribution: playerDistribution[0],
    topPlayers,
  })
}
