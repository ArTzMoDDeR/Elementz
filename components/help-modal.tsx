'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { signInWithApple } from '@/app/actions/auth'
import EmailSignIn from '@/components/email-sign-in'

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
  content: (props: { lang: Lang }) => React.ReactNode
}[] = [
  // Slide 0 — Combine
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
          <video src="/tutohelp.webm" autoPlay loop muted playsInline className="w-full h-auto block" />
        </div>
      </div>
    ),
  },

  // Slide 1 — Inventory
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
          {lang === 'fr' ? 'Le compteur en haut indique ta progression' : 'The counter at the top shows your progress'}
        </p>
      </div>
    ),
  },

  // Slide 2 — Hints & Clear
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
                ? 'Si tu bloques, le bouton indice (centre de la navbar) scintille après 90 secondes sans nouvelle découverte.'
                : 'If you get stuck, the hint button (center of the navbar) glows after 90 seconds without a new discovery.'}
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
                ? 'Retire tous les éléments posés sur le plateau en un seul clic — bouton en haut à gauche.'
                : 'Remove all elements placed on the board in one tap — button top-left.'}
            </p>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 3 — Save progress
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
            ? 'Connecte-toi pour retrouver ta progression sur tous tes appareils.'
            : 'Sign in to keep your progress across all your devices.'}
        </p>
        <div className="flex flex-col gap-3 w-full">
          <form action={signInWithApple}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              {lang === 'fr' ? 'Continuer avec Apple' : 'Continue with Apple'}
            </button>
          </form>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground/60">{lang === 'fr' ? 'ou' : 'or'}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <EmailSignIn lang={lang} />
        </div>
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
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[440px] md:max-h-[90vh] bg-card md:rounded-2xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden [padding-top:calc(env(safe-area-inset-top,0px)+16px)] [padding-bottom:calc(env(safe-area-inset-bottom,0px)+12px)] md:[padding-top:0px] md:[padding-bottom:0px]">

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
            className="w-8 h-8 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col px-5 overflow-y-auto">
          <h2 className="text-lg font-semibold text-foreground mb-4 text-balance">
            {current.title[lang]}
          </h2>
          <current.content lang={lang} />
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
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
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
