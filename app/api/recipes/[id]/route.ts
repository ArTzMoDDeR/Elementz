import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Admin-only
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const adminRow = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!adminRow[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const params = await context.params
  const id = parseInt(params.id)
  if (isNaN(id) || id < 1) return NextResponse.json({ error: 'Invalid recipe id' }, { status: 400 })

  try {
    await sql`DELETE FROM recipes WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
