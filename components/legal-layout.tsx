'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface LegalLayoutProps {
  defaultLang?: 'fr' | 'en'
  titleFr: string
  titleEn: string
  lastUpdatedFr: string
  lastUpdatedEn: string
  footerFr: React.ReactNode
  footerEn: React.ReactNode
  contentFr: React.ReactNode
  contentEn: React.ReactNode
}

export default function LegalLayout({
  defaultLang = 'fr',
  titleFr, titleEn,
  lastUpdatedFr, lastUpdatedEn,
  footerFr, footerEn,
  contentFr, contentEn,
}: LegalLayoutProps) {
  const router = useRouter()
  const [lang, setLang] = useState<'fr' | 'en'>(defaultLang)
  const isFr = lang === 'fr'

  // On mount: read geo cookie first, then fall back to navigator.language
  useEffect(() => {
    // 1. Try the cookie set by middleware (geo-based)
    const cookieLang = document.cookie
      .split('; ')
      .find(row => row.startsWith('lang='))
      ?.split('=')[1] as 'fr' | 'en' | undefined

    if (cookieLang === 'fr' || cookieLang === 'en') {
      setLang(cookieLang)
      return
    }

    // 2. Fall back to browser language
    const browserLang = navigator.language || ''
    setLang(browserLang.toLowerCase().startsWith('fr') ? 'fr' : 'en')
  }, [])

  // When user manually switches lang, persist it in the cookie
  const switchLang = (l: 'fr' | 'en') => {
    setLang(l)
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-primary text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Elementz</span>
          </button>

          {/* Language switcher */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/60">
            <button
              onClick={() => switchLang('fr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isFr ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground opacity-50'
              }`}
            >
              <span className="md:hidden">FR</span>
              <img src="/images/flag-fr.png" alt="Français" className="hidden md:block w-5 h-5 object-contain" />
            </button>
            <button
              onClick={() => switchLang('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                !isFr ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground opacity-50'
              }`}
            >
              <span className="md:hidden">EN</span>
              <img src="/images/flag-en.png" alt="English" className="hidden md:block w-5 h-5 object-contain" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-10">

        {/* Title block */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground tracking-tight text-balance">
            {isFr ? titleFr : titleEn}
          </h1>
          <p className="text-xs text-muted-foreground/50 mt-2 tabular-nums">
            {isFr ? `Dernière mise à jour : ${lastUpdatedFr}` : `Last updated: ${lastUpdatedEn}`}
          </p>
        </div>

        {/* Sections */}
        <div className="text-sm leading-relaxed text-foreground/80">
          <div className={isFr ? 'flex flex-col gap-8' : 'hidden'}>{contentFr}</div>
          <div className={!isFr ? 'flex flex-col gap-8' : 'hidden'}>{contentEn}</div>
        </div>

        {/* Footer links */}
        <div className="mt-14 pt-6 border-t border-border/40 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground/50">
          {isFr ? footerFr : footerEn}
        </div>
      </div>
    </main>
  )
}
