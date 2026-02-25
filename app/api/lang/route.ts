import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lang } = await req.json()
  if (lang !== 'fr' && lang !== 'en') return NextResponse.json({ error: 'Invalid lang' }, { status: 400 })

  const sql = neon(process.env.DATABASE_URL!)
  await sql`UPDATE users SET lang = ${lang} WHERE id = ${session.user.id}`

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ lang: null })

  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT lang FROM users WHERE id = ${session.user.id}`
  return NextResponse.json({ lang: rows[0]?.lang ?? 'en' })
}
