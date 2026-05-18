import { SignJWT, importPKCS8, importSPKI } from 'jose'
import { createPrivateKey } from 'crypto'

let cachedSecret: string | null = null
let cachedAt = 0

/**
 * Generates (and caches) the Apple client_secret JWT using jose.
 * Called lazily at request time — never at module load.
 */
export async function getAppleClientSecret(): Promise<string> {
  // Cache for 24h — Apple allows up to 180 days
  const now = Math.floor(Date.now() / 1000)
  if (cachedSecret && now - cachedAt < 86400) return cachedSecret

  const rawKey = process.env.APPLE_PRIVATE_KEY ?? ''
  const keyId = process.env.APPLE_KEY_ID ?? ''
  const teamId = process.env.APPLE_TEAM_ID ?? ''
  const clientId = process.env.APPLE_ID ?? ''

  if (!rawKey || !keyId || !teamId || !clientId) {
    throw new Error(
      `[apple-secret] Missing env vars. Present: KEY=${!!rawKey} KID=${!!keyId} TEAM=${!!teamId} ID=${!!clientId}`
    )
  }

  // Normalize PEM — handle \n escaping from env var storage
  let pem = rawKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim()

  // Convert EC PRIVATE KEY → PKCS#8 format that jose expects
  if (pem.includes('-----BEGIN EC PRIVATE KEY-----')) {
    // Use Node crypto to convert to PKCS#8
    const keyObj = createPrivateKey({ key: pem, format: 'pem' })
    pem = keyObj.export({ type: 'pkcs8', format: 'pem' }) as string
  } else if (!pem.includes('-----BEGIN')) {
    pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`
  }

  const privateKey = await importPKCS8(pem, 'ES256')

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 15777000) // ~6 months
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .sign(privateKey)

  cachedSecret = jwt
  cachedAt = now
  return jwt
}
