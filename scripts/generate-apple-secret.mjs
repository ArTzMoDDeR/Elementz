/**
 * Run this script once to generate APPLE_CLIENT_SECRET:
 *
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/generate-apple-secret.mjs
 *
 * Then paste the output into your APPLE_CLIENT_SECRET env var on Vercel.
 * The JWT is valid for ~6 months — re-run when it expires.
 */

import { createPrivateKey } from 'crypto'
import { SignJWT, importPKCS8 } from 'jose'

const rawKey = process.env.APPLE_PRIVATE_KEY
const keyId = process.env.APPLE_KEY_ID
const teamId = process.env.APPLE_TEAM_ID
const clientId = process.env.APPLE_ID

if (!rawKey || !keyId || !teamId || !clientId) {
  console.error('Missing env vars. Need: APPLE_PRIVATE_KEY, APPLE_KEY_ID, APPLE_TEAM_ID, APPLE_ID')
  process.exit(1)
}

// Normalize PEM
let pem = rawKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim()

// Convert EC PRIVATE KEY → PKCS8 if needed
if (pem.includes('-----BEGIN EC PRIVATE KEY-----')) {
  const keyObj = createPrivateKey({ key: pem, format: 'pem' })
  pem = keyObj.export({ type: 'pkcs8', format: 'pem' })
} else if (!pem.includes('-----BEGIN')) {
  pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`
}

const privateKey = await importPKCS8(pem, 'ES256')
const now = Math.floor(Date.now() / 1000)

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt(now)
  .setExpirationTime(now + 15777000)
  .setAudience('https://appleid.apple.com')
  .setSubject(clientId)
  .sign(privateKey)

console.log('\n✅ APPLE_CLIENT_SECRET:\n')
console.log(jwt)
console.log('\nPaste this as your APPLE_CLIENT_SECRET env var on Vercel.\n')
