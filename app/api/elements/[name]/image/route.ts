import { neon } from '@neondatabase/serverless'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    console.log('[v0] Image upload API called')
    
    if (!process.env.DATABASE_URL) {
      console.error('[v0] DATABASE_URL not configured')
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[v0] BLOB_READ_WRITE_TOKEN not configured')
      return NextResponse.json({ error: 'Blob storage not configured' }, { status: 500 })
    }

    const params = await context.params
    const elementName = decodeURIComponent(params.name)
    console.log('[v0] Uploading image for element:', elementName)
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[v0] File received:', file.name, 'size:', file.size)

    // Upload to Vercel Blob
    console.log('[v0] Uploading to Vercel Blob...')
    const blob = await put(`elements/${elementName}.jpg`, file, {
      access: 'public',
    })
    console.log('[v0] Blob uploaded successfully:', blob.url)

    // Update database
    console.log('[v0] Updating database...')
    const sql = neon(process.env.DATABASE_URL)
    const result = await sql`
      UPDATE elements 
      SET image_url = ${blob.url}, updated_at = NOW() 
      WHERE name = ${elementName}
      RETURNING *
    `
    
    console.log('[v0] Database updated, rows affected:', result.length)

    return NextResponse.json({ 
      success: true, 
      url: blob.url,
      element: elementName 
    })
  } catch (error) {
    console.error('[v0] Error uploading image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: errorMessage 
    }, { status: 500 })
  }
}
