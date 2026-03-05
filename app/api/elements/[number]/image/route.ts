import { neon } from '@neondatabase/serverless'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  // Admin-only
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const adminRow = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
  if (!adminRow[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 500 })
  }

  const params = await context.params
  const elementNumber = parseInt(params.number)
  if (isNaN(elementNumber) || elementNumber < 1) {
    return NextResponse.json({ error: 'Invalid element number' }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP or GIF.' }, { status: 400 })
    }

    const blob = await put(`elements/${elementNumber}.jpg`, file, { access: 'public' })

    await sql`UPDATE elements SET img = ${blob.url} WHERE number = ${elementNumber}`

    return NextResponse.json({ success: true, url: blob.url, number: elementNumber })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
