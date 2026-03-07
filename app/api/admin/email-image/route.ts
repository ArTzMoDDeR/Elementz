import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { neon } from '@neondatabase/serverless'
import { put } from '@vercel/blob'

async function checkAdmin() {
  const session = await auth()
  if (!session?.user?.id) return false
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  return !!rows[0]?.is_admin
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5 MB' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `email-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const blob = await put(filename, file, { access: 'public' })

  return NextResponse.json({ url: blob.url })
}
