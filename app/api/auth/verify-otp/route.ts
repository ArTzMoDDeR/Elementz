// This route is no longer needed — OTP verification happens directly in
// the NextAuth Credentials provider (auth.ts) via signIn('email-otp').
// Keeping as a stub to avoid 404s from any old calls.
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ error: 'Use signIn("email-otp") directly' }, { status: 410 })
}
