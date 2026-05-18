import { SignJWT, importPKCS8 } from 'jose'

let cached: { secret: string; exp: number } | null = null

export async function getAppleClientSecret(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  // Reuse cached secret if still valid for at least 1 hour
  if (cached && cached.exp > now + 3600) return cached.secret

  const rawKey = process.env.APPLE_PRIVATE_KEY!
  // Support both literal \n and actual newlines (env var storage varies)
  const pem = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey

  const privateKey = await importPKCS8(pem, 'ES256')

  const exp = now + 60 * 60 * 24 * 180 // 180 days max

  const secret = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID! })
    .setIssuer(process.env.APPLE_TEAM_ID!)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setAudience('https://appleid.apple.com')
    .setSubject(process.env.APPLE_ID!)
    .sign(privateKey)

  cached = { secret, exp }
  return secret
}
