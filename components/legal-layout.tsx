'use client'

import { useState } from 'react'
import Link from 'next/link'

type Lang = 'fr' | 'en'

interface Section {
  title: string
  content: React.ReactNode
}

interface LegalLayoutProps {
  defaultLang?: Lang
  sections: (lang: Lang) => Section[]
  title: (lang: Lang) => string
  lastUpdated: (lang: Lang) => string
  footer: (lang: Lang) => React.ReactNode
}

export default function LegalLayout({ defaultLang = 'fr', sections, title, lastUpdated, footer }: LegalLayoutProps) {
  const [lang, setLang] = useState<Lang>(defaultLang)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Top bar: back + lang switcher */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Elementz
          </Link>

          {/* Language toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border">
            <button
              onClick={() => setLang('fr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                lang === 'fr'
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                lang === 'en'
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{title(lang)}</h1>
        <p className="text-sm text-muted-foreground mb-10">
          {lang === 'fr' ? 'Dernière mise à jour : ' : 'Last updated: '}{lastUpdated(lang)}
        </p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground/80">
          {sections(lang).map((s, i) => (
            <section key={i} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-foreground">{s.title}</h2>
              {s.content}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-4 text-xs text-muted-foreground">
          {footer(lang)}
        </div>
      </div>
    </main>
  )
}
