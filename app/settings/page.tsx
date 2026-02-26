'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { X, Lightbulb, Globe } from 'lucide-react'
import Link from 'next/link'

// Settings reads/writes lang and hints via localStorage + optional API
function useSetting<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(defaultValue)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) setValue(JSON.parse(raw) as T)
    } catch {}
  }, [key])
  const set = (v: T) => {
    setValue(v)
    try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
  }
  return [value, set]
}

export default function SettingsPage() {
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [lang, setLangRaw] = useSetting<'fr' | 'en'>('elementz_lang', 'en')
  const [hints, setHints] = useSetting<boolean>('elementz_hints', true)

  const close = () => router.back()

  const setLang = (l: 'fr' | 'en') => {
    setLangRaw(l)
    // Sync to DB if logged in
    fetch('/api/lang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: l }),
    }).catch(() => {})
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) close() }}
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 fade-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm text-foreground">
            {lang === 'fr' ? 'Paramètres' : 'Settings'}
          </span>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings rows */}
        <div className="flex flex-col divide-y divide-border">

          {/* Language */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/50 border border-border">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {lang === 'fr' ? 'Langue' : 'Language'}
              </span>
            </div>
            <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1 gap-0.5">
              <button
                className={`px-3 h-7 text-xs font-semibold rounded-lg transition-colors ${lang === 'fr' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setLang('fr')}
              >FR</button>
              <button
                className={`px-3 h-7 text-xs font-semibold rounded-lg transition-colors ${lang === 'en' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setLang('en')}
              >EN</button>
            </div>
          </div>

          {/* Hints */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 flex items-center justify-center rounded-xl border ${hints ? 'bg-amber-500/15 border-amber-500/40' : 'bg-muted/50 border-border'}`}>
                <Lightbulb className={`w-4 h-4 ${hints ? 'text-amber-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground block">
                  {lang === 'fr' ? 'Indices' : 'Hints'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {lang === 'fr' ? 'Suggère des combos après 2min' : 'Suggests combos after 2min'}
                </span>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setHints(!hints)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${hints ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${hints ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-muted/20">
          <p className="text-center text-xs text-muted-foreground/60">
            made by{' '}
            <a
              href="https://eugenegarcia.life"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Eugène Garcia
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
