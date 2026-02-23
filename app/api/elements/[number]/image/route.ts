import { neon } from '@neondatabase/serverless'
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

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

    const params = await context.params
    const elementNumber = parseInt(params.number)
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`elements/${elementNumber}.jpg`, file, {
      access: 'public',
    })

    // Update database
    const sql = neon(process.env.DATABASE_URL)
    await sql`
      UPDATE elements 
      SET img = ${blob.url}
      WHERE number = ${elementNumber}
    `

    return NextResponse.json({ 
      success: true, 
      url: blob.url,
      number: elementNumber 
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
