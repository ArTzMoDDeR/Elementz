'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

type Lang = 'fr' | 'en'

interface HelpModalProps {
  lang: Lang
  onSetLang: (l: Lang) => void
  onClose: () => void
}

function InventoryIllustration() {
  const items = ['🔥', '💧', '🌍', '💨', '⚡', '🌊', '🌋', '❄️']
  return (
    <div className="w-full rounded-xl border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-primary/20" />
          <span className="text-xs font-semibold text-foreground">Elementz</span>
          <span className="text-xs text-muted-foreground">8/593</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 p-2">
        {items.map((emoji, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted border border-border/50 flex items-center justify-center text-xl">
            {emoji}
          </div>
        ))}
      </div>
    </div>
  )
}

const SLIDES: {
  title: { fr: string; en: string }
  content: (props: { lang: Lang; onSetLang: (l: Lang) => void }) => React.ReactNode
}[] = [
  // Slide 0 — Language picker first
  {
    title: { fr: 'Choisis ta langue', en: 'Choose your language' },
    content: ({ lang, onSetLang }) => (
      <div className="flex flex-col gap-5 items-center">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {lang === 'fr'
            ? "Les noms des éléments s'afficheront dans la langue choisie. Tu peux changer à tout moment."
            : 'Element names will appear in the chosen language. You can change at any time.'}
        </p>
        <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1.5 h-12 gap-1">
          <button
            className={`px-7 h-full text-sm font-semibold rounded-lg transition-colors ${lang === 'fr' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetLang('fr')}
          >Français</button>
          <button
            className={`px-7 h-full text-sm font-semibold rounded-lg transition-colors ${lang === 'en' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetLang('en')}
          >English</button>
        </div>
        <p className="text-xs text-muted-foreground/50 text-center">
          {lang === 'fr' ? 'Modifiable depuis le menu en bas à tout moment' : 'Can be changed anytime from the bottom menu'}
        </p>
      </div>
    ),
  },

  // Slide 1 — Combine
  {
    title: { fr: 'Combiner des éléments', en: 'Combine elements' },
    content: ({ lang }) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {lang === 'fr'
            ? 'Glisse un élément sur un autre pour les combiner et découvrir de nouveaux éléments.'
            : 'Drag one element onto another to combine them and discover new ones.'}
        </p>
        <div className="rounded-xl overflow-hidden border border-border bg-muted/30">
          <video
            src="/tutohelp.webm"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-auto block"
          />
        </div>
      </div>
    ),
  },

  // Slide 2 — Inventory
  {
    title: { fr: "L'inventaire", en: 'The Inventory' },
    content: ({ lang }) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {lang === 'fr'
            ? "Tous tes éléments découverts s'affichent ici. Appuie sur un élément pour le poser sur le plateau."
            : 'All your discovered elements appear here. Tap an element to place it on the board.'}
        </p>
        <InventoryIllustration />
        <p className="text-xs text-muted-foreground/60 text-center">
          {lang === 'fr'
            ? 'Le compteur en haut indique ta progression'
            : 'The counter at the top shows your progress'}
        </p>
      </div>
    ),
  },

  // Slide 3 — Hints & Clear
  {
    title: { fr: 'Indices & Vider', en: 'Hints & Clear' },
    content: ({ lang }) => (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/40 border border-border">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(251 191 36)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
              <path d="M9 18h6"/><path d="M10 22h4"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">{lang === 'fr' ? 'Indices' : 'Hints'}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === 'fr'
                ? 'Si tu bloques, une suggestion arrive automatiquement après 1 min sans nouvelle découverte — une combinaison réalisable avec ce que tu as déjà.'
                : 'If you get stuck, a suggestion appears automatically after 1 min without a new discovery — a combination you can already make with what you have.'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/40 border border-border">
          <div className="w-11 h-11 rounded-xl bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">{lang === 'fr' ? 'Vider' : 'Clear'}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === 'fr'
                ? 'Retire tous les éléments posés sur le plateau en un seul clic.'
                : 'Remove all elements placed on the board in one tap.'}
            </p>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 4 — Login / save progress
  {
    title: { fr: 'Sauvegarde ta progression', en: 'Save your progress' },
    content: ({ lang }) => (
      <div className="flex flex-col gap-5 items-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {lang === 'fr'
            ? 'Connecte-toi avec Google pour retrouver ta progression sur tous tes appareils.'
            : 'Sign in with Google to keep your progress across all your devices.'}
        </p>
        <a
          href="/login"
          className="flex items-center gap-2.5 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {lang === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
        </a>
        <p className="text-xs text-muted-foreground/50 text-center">
          {lang === 'fr'
            ? 'Tu peux jouer sans compte, mais ta progression restera uniquement sur cet appareil.'
            : "You can play without an account, but your progress will only be saved on this device."}
        </p>
      </div>
    ),
  },
]

export function HelpModal({ lang, onSetLang, onClose }: HelpModalProps) {
  const [slide, setSlide] = useState(0)
  const total = SLIDES.length
  const current = SLIDES[slide]
  const isLast = slide === total - 1

  return (
    <>
      <div
        className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[440px] md:max-h-[90vh] bg-card md:rounded-2xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden [padding-top:calc(env(safe-area-inset-top,0px)+28px)] [padding-bottom:calc(env(safe-area-inset-bottom,0px)+24px)] md:[padding-top:0px] md:[padding-bottom:0px]">

        {/* Header dots */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`rounded-full transition-all duration-200 ${i === slide ? 'w-5 h-2 bg-foreground' : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col px-5 overflow-y-auto">
          <h2 className="text-lg font-semibold text-foreground mb-4 text-balance">
            {current.title[lang]}
          </h2>
          <current.content lang={lang} onSetLang={onSetLang} />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-5 flex-shrink-0 border-t border-border mt-4">
          <button
            onClick={() => setSlide(s => s - 1)}
            disabled={slide === 0}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {lang === 'fr' ? 'Précédent' : 'Previous'}
          </button>

          {isLast ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {lang === 'fr' ? "C'est parti !" : "Let's play!"}
            </button>
          ) : (
            <button
              onClick={() => setSlide(s => s + 1)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {lang === 'fr' ? 'Suivant' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
