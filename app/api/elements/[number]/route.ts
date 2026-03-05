import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!rows[0]?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { sql }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  const check = await requireAdmin()
  if (check.error) return check.error

  const params = await context.params
  const elementNumber = parseInt(params.number)
  if (isNaN(elementNumber) || elementNumber < 1) {
    return NextResponse.json({ error: 'Invalid element number' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const nameFr = typeof body.name_french === 'string' ? body.name_french.trim().slice(0, 100) : undefined
    const nameEn = typeof body.name_english === 'string' ? body.name_english.trim().slice(0, 100) : undefined

    const sql = check.sql!
    await sql`
      UPDATE elements
      SET
        name_french  = COALESCE(${nameFr ?? null}, name_french),
        name_english = COALESCE(${nameEn ?? null}, name_english)
      WHERE number = ${elementNumber}
    `
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  const check = await requireAdmin()
  if (check.error) return check.error

  const params = await context.params
  const elementNumber = parseInt(params.number)
  if (isNaN(elementNumber) || elementNumber < 1) {
    return NextResponse.json({ error: 'Invalid element number' }, { status: 400 })
  }

  try {
    const sql = check.sql!
    await sql`DELETE FROM elements WHERE number = ${elementNumber}`
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
