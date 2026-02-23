import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }
    
    const sql = neon(process.env.DATABASE_URL)
    const elements = await sql`SELECT * FROM elements ORDER BY name`
    return NextResponse.json(elements)
  } catch (error) {
    console.error('[v0] Error fetching elements:', error)
    return NextResponse.json({ error: 'Failed to fetch elements' }, { status: 500 })
  }
}
