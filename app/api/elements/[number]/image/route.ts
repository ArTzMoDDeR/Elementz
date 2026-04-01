import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { uploadToCloudinary } from '@/lib/cloudinary'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Upload to Cloudinary under elementz/elements/ folder, overwrite by publicId
    const { url } = await uploadToCloudinary(file, {
      folder: 'elementz/elements',
      publicId: `element-${elementNumber}`,
    })

    await sql`UPDATE elements SET img = ${url} WHERE number = ${elementNumber}`

    return NextResponse.json({ success: true, url, number: elementNumber })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Upload failed', details: errorMessage }, { status: 500 })
  }
}
