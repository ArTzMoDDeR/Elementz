import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Francophone countries (ISO 3166-1 alpha-2)
const FRANCOPHONE = new Set([
  'FR', 'BE', 'CH', 'CA', 'LU', 'MC', 'SN', 'CI', 'CM', 'MG', 'ML',
  'BF', 'NE', 'TD', 'GN', 'RW', 'BI', 'BJ', 'TG', 'CF', 'CG', 'CD',
  'DJ', 'KM', 'MU', 'SC', 'GA', 'GQ', 'MR', 'HT', 'VU', 'NC', 'PF',
  'PM', 'WF', 'RE', 'MF', 'GP', 'MQ', 'GF', 'YT',
])

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Only set lang cookie if not already set (respects user's manual choice)
  const existingLang = request.cookies.get('lang')?.value
  if (!existingLang) {
    // Try Vercel geo first, fall back to Accept-Language header
    const country = (request.geo?.country ?? '').toUpperCase()
    let lang: 'fr' | 'en' = 'en'

    if (country && FRANCOPHONE.has(country)) {
      lang = 'fr'
    } else {
      // Fall back to Accept-Language header
      const acceptLang = request.headers.get('accept-language') ?? ''
      if (acceptLang.toLowerCase().includes('fr')) {
        lang = 'fr'
      }
    }

    response.cookies.set('lang', lang, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    // Apply to legal pages + root, skip API routes and static files
    '/((?!_next/static|_next/image|favicon|.*\\.(?:ico|png|jpg|jpeg|svg|webp|woff2?|css|js)).*)',
  ],
}
