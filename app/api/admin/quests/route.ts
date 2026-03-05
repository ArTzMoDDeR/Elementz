import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!rows[0]?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { sql }
}

const VALID_TYPES = [
  'discover_n', 'discover_n_daily', 'combinations_n', 'session_n',
  'specific_element', 'discover_element', 'use_water_n', 'use_fire_n',
  'use_air_n', 'use_earth_n',
]

function sanitizeStr(v: unknown, maxLen = 200): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, maxLen)
  return t.length ? t : null
}

function sanitizeInt(v: unknown, min = 1, max = 9999): number | null {
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) return null
  return n
}

export async function GET() {
  const check = await requireAdmin()
  if (check.error) return check.error

  const quests = await check.sql!`
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
  const check = await requireAdmin()
  if (check.error) return check.error

  const body = await req.json()
  const id = sanitizeInt(body.id)
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const title_fr = sanitizeStr(body.title_fr) ?? ''
  const title_en = sanitizeStr(body.title_en) ?? ''
  const desc_fr = sanitizeStr(body.desc_fr, 500) ?? ''
  const desc_en = sanitizeStr(body.desc_en, 500) ?? ''
  const target_value = sanitizeInt(body.target_value)
  if (!target_value) return NextResponse.json({ error: 'Invalid target_value' }, { status: 400 })
  const icon = sanitizeStr(body.icon, 50) ?? ''
  const sort_order = sanitizeInt(body.sort_order, 0, 999) ?? 0
  const is_daily = Boolean(body.is_daily)

  await check.sql!`
    UPDATE quest_definitions
    SET title_fr = ${title_fr}, title_en = ${title_en}, desc_fr = ${desc_fr}, desc_en = ${desc_en},
        target_value = ${target_value}, icon = ${icon}, sort_order = ${sort_order}, is_daily = ${is_daily}
    WHERE id = ${id}
  `
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin()
  if (check.error) return check.error

  const body = await req.json()
  const type = sanitizeStr(body.type, 50)
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid quest type' }, { status: 400 })
  }

  const title_fr = sanitizeStr(body.title_fr) ?? ''
  const title_en = sanitizeStr(body.title_en) ?? ''
  const desc_fr = sanitizeStr(body.desc_fr, 500) ?? ''
  const desc_en = sanitizeStr(body.desc_en, 500) ?? ''
  const target_value = sanitizeInt(body.target_value)
  if (!target_value) return NextResponse.json({ error: 'Invalid target_value' }, { status: 400 })
  const icon = sanitizeStr(body.icon, 50) ?? ''
  const sort_order = sanitizeInt(body.sort_order, 0, 999) ?? 0
  const is_daily = Boolean(body.is_daily)

  const [row] = await check.sql!`
    INSERT INTO quest_definitions (type, title_fr, title_en, desc_fr, desc_en, target_value, icon, sort_order, is_daily)
    VALUES (${type}, ${title_fr}, ${title_en}, ${desc_fr}, ${desc_en}, ${target_value}, ${icon}, ${sort_order}, ${is_daily})
    RETURNING *
  `
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  const check = await requireAdmin()
  if (check.error) return check.error

  const body = await req.json()
  const id = sanitizeInt(body.id)
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  await check.sql!`DELETE FROM quest_definitions WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
