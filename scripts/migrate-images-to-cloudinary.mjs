/**
 * Migration script: Vercel Blob → Cloudinary
 * Reads all element image URLs from Neon DB, downloads each one,
 * uploads to Cloudinary, and updates the DB row.
 *
 * Run from project root:
 *   node --env-file=.env.development.local scripts/migrate-images-to-cloudinary.mjs
 */

import { neon } from '@neondatabase/serverless'
import { v2 as cloudinary } from 'cloudinary'

// ── Config ────────────────────────────────────────────────────────────────────
const BATCH_SIZE = 10      // concurrent uploads
const RETRY_LIMIT = 3
const DELAY_MS = 200       // ms between batches to avoid rate limits

// ── Init ──────────────────────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
})

// ── Helpers ───────────────────────────────────────────────────────────────────
async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function uploadWithRetry(url, publicId, attempt = 1) {
  try {
    const result = await cloudinary.uploader.upload(url, {
      public_id: publicId,
      folder: 'elementz/elements',
      overwrite: true,
      resource_type: 'image',
      format: 'webp',
      transformation: [{ width: 256, height: 256, crop: 'limit', quality: 'auto' }],
    })
    return result.secure_url
  } catch (err) {
    if (attempt < RETRY_LIMIT) {
      await sleep(500 * attempt)
      return uploadWithRetry(url, publicId, attempt + 1)
    }
    throw err
  }
}

async function migrateElement(el) {
  const publicId = `element-${el.number}`
  try {
    const newUrl = await uploadWithRetry(el.img, publicId)
    await sql`UPDATE elements SET img = ${newUrl} WHERE number = ${el.number}`
    return { number: el.number, status: 'ok', url: newUrl }
  } catch (err) {
    return { number: el.number, status: 'error', error: err.message }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching elements with Vercel Blob URLs...')
  const elements = await sql`
    SELECT number, img FROM elements
    WHERE img LIKE '%blob.vercel-storage.com%'
    ORDER BY number ASC
  `
  console.log(`Found ${elements.length} elements to migrate.\n`)

  let done = 0
  let errors = []

  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(el => migrateElement(el)))

    for (const r of results) {
      done++
      if (r.status === 'ok') {
        process.stdout.write(`\r[${done}/${elements.length}] element #${r.number} → Cloudinary`)
      } else {
        errors.push(r)
        console.error(`\n  ERROR element #${r.number}: ${r.error}`)
      }
    }

    if (i + BATCH_SIZE < elements.length) await sleep(DELAY_MS)
  }

  console.log(`\n\nMigration complete!`)
  console.log(`  Success: ${done - errors.length}`)
  console.log(`  Errors:  ${errors.length}`)

  if (errors.length > 0) {
    console.log('\nFailed elements:')
    for (const e of errors) console.log(`  #${e.number}: ${e.error}`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
