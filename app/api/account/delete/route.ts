import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const sql = neon(process.env.DATABASE_URL)
  const userId = session.user.id

  try {
    // Delete in dependency order
    await sql`DELETE FROM unlocks WHERE user_id = ${userId}`
    await sql`DELETE FROM email_otps WHERE email = (SELECT email FROM users WHERE id = ${userId})`
    await sql`DELETE FROM accounts WHERE user_id = ${userId}`
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`
    await sql`DELETE FROM users WHERE id = ${userId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Deletion failed', detail: msg }, { status: 500 })
  }
}
