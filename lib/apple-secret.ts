import { createPrivateKey, createSign } from 'crypto'

/**
 * Generates the Apple client_secret JWT synchronously using Node.js built-in crypto.
 * No async, no jose — safe to call at module load time.
 */
export function generateAppleClientSecret(): string {
  const rawKey = process.env.APPLE_PRIVATE_KEY ?? ''
  const keyId = process.env.APPLE_KEY_ID ?? ''
  const teamId = process.env.APPLE_TEAM_ID ?? ''
  const clientId = process.env.APPLE_ID ?? ''

  if (!rawKey || !keyId || !teamId || !clientId) {
    throw new Error(
      `[apple-secret] Missing env vars. Present: APPLE_PRIVATE_KEY=${!!rawKey} APPLE_KEY_ID=${!!keyId} APPLE_TEAM_ID=${!!teamId} APPLE_ID=${!!clientId}`
    )
  }

  // Normalize PEM (handles escaped \n from env var storage)
  let pem = rawKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim()

  // Apple exports keys as "EC PRIVATE KEY" — convert header if needed
  if (pem.includes('-----BEGIN EC PRIVATE KEY-----')) {
    // Already EC format — Node crypto handles both formats
  } else if (!pem.includes('-----BEGIN')) {
    // Raw base64 — wrap in PKCS#8 header
    pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`
  }

  const now = Math.floor(Date.now() / 1000)
  const exp = now + 15777000 // ~6 months

  // Build JWT header + payload
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  })).toString('base64url')

  const signingInput = `${header}.${payload}`

  const privateKey = createPrivateKey({ key: pem, format: 'pem' })
  const sign = createSign('SHA256')
  sign.update(signingInput)
  sign.end()

  // ES256 signature from DER → raw R+S (64 bytes)
  const derSig = sign.sign(privateKey)
  const rawSig = derToRaw(derSig)
  const signature = rawSig.toString('base64url')

  return `${signingInput}.${signature}`
}

/** Convert DER-encoded ECDSA signature to raw R||S format (required for JWT ES256) */
function derToRaw(der: Buffer): Buffer {
  let offset = 2 // skip SEQUENCE tag + length
  // R
  offset++ // INTEGER tag
  const rLen = der[offset++]
  const rStart = der[rLen] === 0 ? offset + 1 : offset // skip leading zero
  const rEnd = offset + rLen
  const r = der.slice(rStart, rEnd)
  offset = rEnd
  // S
  offset++ // INTEGER tag
  const sLen = der[offset++]
  const sStart = der[sLen] === 0 ? offset + 1 : offset
  const sEnd = offset + sLen
  const s = der.slice(sStart, sEnd)

  // Pad to 32 bytes each
  const rb = Buffer.alloc(32)
  const sb = Buffer.alloc(32)
  r.copy(rb, 32 - r.length)
  s.copy(sb, 32 - s.length)

  return Buffer.concat([rb, sb])
}
