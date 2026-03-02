import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!rows[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [elements, recipes, users, unlocks, quests, rewards] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM elements`,
    sql`SELECT COUNT(*)::int AS n FROM recipes`,
    sql`SELECT COUNT(*)::int AS n FROM users`,
    sql`SELECT COUNT(*)::int AS n FROM unlocks`,
    sql`SELECT COUNT(*)::int AS n FROM quest_definitions`,
    sql`SELECT COUNT(*)::int AS n FROM quest_rewards WHERE scratched_at IS NOT NULL`,
  ])

  const [noImg, noRecipe] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM elements WHERE img IS NULL`,
    sql`SELECT COUNT(*)::int AS n FROM elements e WHERE NOT EXISTS (SELECT 1 FROM recipes r WHERE r.result_number = e.number)`,
  ])

  const newUsersToday = await sql`
    SELECT COUNT(*)::int AS n FROM users WHERE created_at::date = CURRENT_DATE
  `
  const activeToday = await sql`
    SELECT COUNT(DISTINCT user_id)::int AS n FROM unlocks WHERE discovered_at::date = CURRENT_DATE
  `
  const topDiscoverers = await sql`
    SELECT up.username, u.email, COUNT(ul.element_number)::int AS count
    FROM users u
    LEFT JOIN user_progress up ON up.user_id = u.id
    LEFT JOIN unlocks ul ON ul.user_id = u.id
    GROUP BY u.id, up.username, u.email
    ORDER BY count DESC
    LIMIT 5
  `
  const recentSignups = await sql`
    SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 5
  `

  return NextResponse.json({
    elements: elements[0].n,
    recipes: recipes[0].n,
    users: users[0].n,
    unlocks: unlocks[0].n,
    quests: quests[0].n,
    rewards: rewards[0].n,
    noImg: noImg[0].n,
    noRecipe: noRecipe[0].n,
    newUsersToday: newUsersToday[0].n,
    activeToday: activeToday[0].n,
    topDiscoverers,
    recentSignups,
  })
}
