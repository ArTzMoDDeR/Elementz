import { neon } from '@neondatabase/serverless'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob storage not configured' }, { status: 500 })
    }

    // Only admins can upload element images
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sql = neon(process.env.DATABASE_URL)
    const adminRow = await sql`SELECT is_admin FROM users WHERE id = ${session.user.id}`
    if (!adminRow[0]?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const params = await context.params
    const elementNumber = parseInt(params.number)
    if (isNaN(elementNumber)) return NextResponse.json({ error: 'Invalid element number' }, { status: 400 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`elements/${elementNumber}.jpg`, file, {
      access: 'public',
    })

    await sql`UPDATE elements SET img = ${blob.url} WHERE number = ${elementNumber}`

    return NextResponse.json({ success: true, url: blob.url, number: elementNumber })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Upload failed', details: errorMessage }, { status: 500 })
  }
}
