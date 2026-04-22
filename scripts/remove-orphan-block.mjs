import { readFileSync, writeFileSync } from 'fs'

const file = '/vercel/share/v0-project/app/admin/page.tsx'
const lines = readFileSync(file, 'utf8').split('\n')

// Find start marker (placeholder_remove line) and end (// ─── Main Admin Page)
const startIdx = lines.findIndex(l => l.trim() === '// placeholder_remove')
const endIdx = lines.findIndex(l => l.includes('// ─── Main Admin Page'))

console.log(`Start: ${startIdx + 1}, End: ${endIdx + 1}`)

if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
  console.error('Could not find markers!')
  process.exit(1)
}

// Remove lines from startIdx up to (not including) endIdx
const result = [
  ...lines.slice(0, startIdx),
  ...lines.slice(endIdx),
].join('\n')

writeFileSync(file, result)
console.log(`Removed ${endIdx - startIdx} orphan lines. File now has ${result.split('\n').length} lines.`)

// Verify no duplicates
const check = result.split('\n')
const minibarchart = check.filter(l => l.includes('BAR_HEIGHT') || l.includes('barColor') || l.includes('Fill last 14 days'))
const statsTabs = check.filter(l => l.includes('function StatsTab'))
console.log(`MiniBarChart remnants: ${minibarchart.length}`)
console.log(`StatsTab functions: ${statsTabs.length}`)
