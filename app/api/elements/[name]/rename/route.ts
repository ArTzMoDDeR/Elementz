import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)
    const params = await context.params
    const oldName = decodeURIComponent(params.name)
    const { newName } = await request.json()

    if (!newName || !newName.trim()) {
      return NextResponse.json({ error: 'New name required' }, { status: 400 })
    }

    // Check if new name already exists
    const existing = await sql`
      SELECT element_id FROM elements WHERE name = ${newName.trim()}
    `

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Name already exists' }, { status: 409 })
    }

    // Update element name (element_id stays the same, so recipes remain valid)
    const result = await sql`
      UPDATE elements 
      SET name = ${newName.trim()}, updated_at = NOW() 
      WHERE name = ${oldName}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Element not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      element: result[0]
    })
  } catch (error) {
    console.error('[v0] Error renaming element:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Rename failed', 
      details: errorMessage 
    }, { status: 500 })
  }
}
