import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'
import type { Session } from 'next-auth'

async function checkAdmin(session: Session | null, sql: ReturnType<typeof neon>) {
  if (!session?.user?.id) return false
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  return !!rows[0]?.is_admin
}

export async function GET() {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const quests = await sql`
    SELECT
      qd.*,
      COUNT(DISTINCT uq.user_id) FILTER (WHERE uq.completed_at IS NOT NULL)::int AS completed_count,
      COUNT(DISTINCT uq.user_id) FILTER (WHERE uq.claimed_at IS NOT NULL)::int AS claimed_count,
      COUNT(DISTINCT uq.user_id) FILTER (WHERE uq.progress > 0)::int AS in_progress_count
    FROM quest_definitions qd
    LEFT JOIN user_quests uq ON uq.quest_id = qd.id
    GROUP BY qd.id
    ORDER BY qd.sort_order ASC
  `
  return NextResponse.json({ quests })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, title_fr, title_en, desc_fr, desc_en, target_value, icon, sort_order, is_daily } = await req.json()
  await sql`
    UPDATE quest_definitions
    SET title_fr = ${title_fr}, title_en = ${title_en}, desc_fr = ${desc_fr}, desc_en = ${desc_en},
        target_value = ${target_value}, icon = ${icon}, sort_order = ${sort_order}, is_daily = ${is_daily}
    WHERE id = ${id}
  `
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, title_fr, title_en, desc_fr, desc_en, target_value, icon, sort_order, is_daily } = await req.json()
  const [row] = await sql`
    INSERT INTO quest_definitions (type, title_fr, title_en, desc_fr, desc_en, target_value, icon, sort_order, is_daily)
    VALUES (${type}, ${title_fr}, ${title_en}, ${desc_fr}, ${desc_en}, ${target_value}, ${icon}, ${sort_order}, ${is_daily})
    RETURNING *
  `
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  const sql = neon(process.env.DATABASE_URL!)
  if (!(await checkAdmin(session, sql))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  await sql`DELETE FROM quest_definitions WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
