import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const filePath = join(process.cwd(), 'lib', 'recipes.txt')
  const content = readFileSync(filePath, 'utf-8')
  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
