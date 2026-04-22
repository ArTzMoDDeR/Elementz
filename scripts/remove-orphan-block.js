const { readFileSync, writeFileSync } = require('fs')

const file = '/vercel/share/v0-project/app/admin/page.tsx'
const lines = readFileSync(file, 'utf8').split('\n')

const startIdx = lines.findIndex(l => l.trim() === '// placeholder_remove')
const endIdx = lines.findIndex(l => l.includes('// ─── Main Admin Page'))

console.log(`Start: ${startIdx + 1}, End: ${endIdx + 1}`)

if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
  console.error('Could not find markers!')
  process.exit(1)
}

const result = [
  ...lines.slice(0, startIdx),
  ...lines.slice(endIdx),
].join('\n')

writeFileSync(file, result)
console.log(`Removed ${endIdx - startIdx} orphan lines.`)

const check = result.split('\n')
console.log('BAR_HEIGHT lines:', check.filter(l => l.includes('BAR_HEIGHT')).length)
console.log('StatsTab functions:', check.filter(l => l.includes('function StatsTab')).length)
