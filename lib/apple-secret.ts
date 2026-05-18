import { SignJWT, importPKCS8 } from 'jose'

let cached: { secret: string; exp: number } | null = null

export async function getAppleClientSecret(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  // Reuse cached secret if still valid for at least 1 hour
  if (cached && cached.exp > now + 3600) return cached.secret

  const rawKey = process.env.APPLE_PRIVATE_KEY ?? ''
  if (!rawKey) throw new Error('[apple-secret] APPLE_PRIVATE_KEY is not set')
  if (!process.env.APPLE_KEY_ID) throw new Error('[apple-secret] APPLE_KEY_ID is not set')
  if (!process.env.APPLE_TEAM_ID) throw new Error('[apple-secret] APPLE_TEAM_ID is not set')
  if (!process.env.APPLE_ID) throw new Error('[apple-secret] APPLE_ID is not set')

  // Normalize: handle escaped \n, missing header/footer, and Windows line endings
  let pem = rawKey
    .replace(/\\n/g, '\n')     // literal \n → real newline
    .replace(/\r\n/g, '\n')    // Windows CRLF → LF
    .trim()

  // Wrap in PEM headers if missing (some env vars strip them)
  if (!pem.includes('-----BEGIN PRIVATE KEY-----')) {
    pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`
  }

  console.log('[v0] apple-secret: key starts with', pem.slice(0, 40))
  console.log('[v0] apple-secret: APPLE_ID=', process.env.APPLE_ID, 'TEAM=', process.env.APPLE_TEAM_ID, 'KID=', process.env.APPLE_KEY_ID)

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
