'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { X, Lightbulb, Globe, LogIn, LogOut } from 'lucide-react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'

const LANG_KEY = 'elementz_lang'
const HINTS_KEY = 'elementz_hints'

function saveSetting(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    // Dispatch StorageEvent manually so same-tab listeners (useGameStore, useHint) react
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(value) }))
  } catch {}
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [lang, setLangState] = useState<'fr' | 'en'>('en')
  const [hints, setHintsState] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const l = localStorage.getItem(LANG_KEY)
      if (l === 'fr' || l === 'en') setLangState(l)
      const h = localStorage.getItem(HINTS_KEY)
      if (h !== null) setHintsState(JSON.parse(h) as boolean)
    } catch {}
  }, [])

  const setLang = (l: 'fr' | 'en') => {
    setLangState(l)
    saveSetting(LANG_KEY, l)
    // Sync to DB if logged in
    if (session?.user?.id) {
      fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: l }),
      }).catch(() => {})
    }
  }

  const setHints = (v: boolean) => {
    setHintsState(v)
    saveSetting(HINTS_KEY, v)
  }

  if (!mounted) return null

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <span className="font-semibold text-sm text-foreground">
          {t('Paramètres', 'Settings')}
        </span>
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-sm w-full mx-auto px-4 py-4 gap-1">

        {/* Account section */}
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
          {t('Compte', 'Account')}
        </p>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {status === 'authenticated' && session?.user ? (
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{session.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-muted/50 border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('Déconnexion', 'Sign out')}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm text-muted-foreground">{t('Non connecté', 'Not signed in')}</p>
              <Link
                href="/login"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>
            </div>
          )}
        </div>

        {/* Preferences section */}
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1 mt-4">
          {t('Préférences', 'Preferences')}
        </p>

        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">

          {/* Language */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/50 border border-border">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{t('Langue', 'Language')}</span>
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
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 flex items-center justify-center rounded-xl border ${hints ? 'bg-amber-500/15 border-amber-500/40' : 'bg-muted/50 border-border'}`}>
                <Lightbulb className={`w-4 h-4 ${hints ? 'text-amber-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground block leading-tight">{t('Indices', 'Hints')}</span>
                <span className="text-xs text-muted-foreground">{t('Suggère des combos après 2min', 'Suggests combos after 2min')}</span>
              </div>
            </div>
            <button
              onClick={() => setHints(!hints)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${hints ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${hints ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-border">
        <p className="text-center text-xs text-muted-foreground/50">
          made by{' '}
          <a
            href="https://eugenegarcia.life"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Eugène Garcia
          </a>
        </p>
      </div>
    </div>
  )
}
