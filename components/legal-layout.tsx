'use client'

import { useState } from 'react'
import Link from 'next/link'

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
  const [lang, setLang] = useState<'fr' | 'en'>(defaultLang)
  const isFr = lang === 'fr'

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Top bar: back + lang switcher */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Elementz
          </Link>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border">
            <button
              onClick={() => setLang('fr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isFr ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isFr ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{isFr ? titleFr : titleEn}</h1>
        <p className="text-sm text-muted-foreground mb-10">
          {isFr ? `Dernière mise à jour : ${lastUpdatedFr}` : `Last updated: ${lastUpdatedEn}`}
        </p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground/80">
          <div className={isFr ? 'flex flex-col gap-8' : 'hidden'}>{contentFr}</div>
          <div className={!isFr ? 'flex flex-col gap-8' : 'hidden'}>{contentEn}</div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-4 text-xs text-muted-foreground">
          {isFr ? footerFr : footerEn}
        </div>
      </div>
    </main>
  )
}
