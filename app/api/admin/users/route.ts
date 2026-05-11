import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

async function checkAdmin(session: Awaited<ReturnType<typeof auth>>, sql: ReturnType<typeof neon>) {
  if (!session?.user?.id) return false
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  return !!rows[0]?.is_admin
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const sortKey = searchParams.get('sort') ?? 'created_at'
  const sortDir = searchParams.get('dir') === 'asc' ? 'ASC' : 'DESC'
  const limit = 25
  const offset = (page - 1) * limit

  // Build ORDER BY safely — only allow known columns
  const allowedSorts: Record<string, string> = {
    discovered:  'discovered',
    rank:        'discovered', // rank = most discovered first
    last_active: 'last_active',
    created_at:  'u.created_at',
  }
  const orderCol = allowedSorts[sortKey] ?? 'u.created_at'
  // For rank ascending means best rank first = most discovered DESC
  const effectiveDir = sortKey === 'rank'
    ? (sortDir === 'ASC' ? 'DESC' : 'ASC')
    : sortDir

  const [rows, total] = await Promise.all([
    sql`
      SELECT
        u.id, u.email, u.name, u.created_at, u.is_admin,
        up.username, up.show_in_leaderboard,
        COUNT(ul.element_number)::int AS discovered,
        MAX(ul.discovered_at) AS last_active
      FROM users u
      LEFT JOIN user_progress up ON up.user_id = u.id
      LEFT JOIN unlocks ul ON ul.user_id = u.id
      WHERE u.email ILIKE ${'%' + search + '%'} OR u.name ILIKE ${'%' + search + '%'} OR COALESCE(up.username, '') ILIKE ${'%' + search + '%'}
      GROUP BY u.id, u.email, u.name, u.created_at, u.is_admin, up.username, up.show_in_leaderboard
      ORDER BY ${sql.unsafe(orderCol + ' ' + effectiveDir + ' NULLS LAST')}
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(DISTINCT u.id)::int AS n FROM users u
      LEFT JOIN user_progress up ON up.user_id = u.id
      WHERE u.email ILIKE ${'%' + search + '%'} OR u.name ILIKE ${'%' + search + '%'} OR COALESCE(up.username, '') ILIKE ${'%' + search + '%'}
    `,
  ])

  return NextResponse.json({ users: rows, total: total[0].n, page, limit })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, is_admin } = await req.json()
  await sql`UPDATE users SET is_admin = ${is_admin ? 1 : 0} WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
