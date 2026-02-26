'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

type Lang = 'fr' | 'en'

interface HelpModalProps {
  lang: Lang
  onSetLang: (l: Lang) => void
  onClose: () => void
}

function DragCombineIllustration() {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      {/* Element A */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-3xl">
          💧
        </div>
        <span className="text-xs text-muted-foreground">water</span>
      </div>

      {/* Arrow drag indicator */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          <svg width="48" height="16" viewBox="0 0 48 16" fill="none">
            <path d="M4 8 C12 8, 20 4, 28 8 C34 11, 40 8, 44 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2"/>
            <path d="M41 5 L44 8 L41 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-[10px] text-muted-foreground/60">drag</span>
      </div>

      {/* Element B */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-3xl">
          🌬️
        </div>
        <span className="text-xs text-muted-foreground">air</span>
      </div>

      {/* Equals */}
      <div className="text-muted-foreground font-light text-xl">=</div>

      {/* Result */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-[0_0_16px_rgba(245,158,11,0.2)]">
          🌊
        </div>
        <span className="text-xs text-amber-400 font-medium">wave</span>
      </div>
    </div>
  )
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
  {
    title: { fr: 'Combiner des éléments', en: 'Combine elements' },
    content: ({ lang }) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {lang === 'fr'
            ? 'Glisse un élément sur un autre pour les combiner et découvrir de nouveaux éléments.'
            : 'Drag one element onto another to combine them and discover new ones.'}
        </p>
        <DragCombineIllustration />
        <p className="text-xs text-muted-foreground/60 text-center">
          {lang === 'fr'
            ? 'Double-tape pour retirer un élément du plateau'
            : 'Double-tap to remove an element from the board'}
        </p>
      </div>
    ),
  },
  {
    title: { fr: "L'inventaire", en: 'The Inventory' },
    content: ({ lang }) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {lang === 'fr'
            ? 'Tous tes éléments découverts s\'affichent ici. Appuie sur un élément pour le poser sur le plateau.'
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
  {
    title: { fr: 'Langue', en: 'Language' },
    content: ({ lang, onSetLang }) => (
      <div className="flex flex-col gap-5 items-center">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {lang === 'fr'
            ? 'Joue en français ou en anglais. Les noms des éléments changent selon la langue choisie.'
            : 'Play in French or English. Element names change based on the selected language.'}
        </p>
        {/* Live lang switcher inside the modal */}
        <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1 h-11 gap-1">
          <button
            className={`px-5 h-full text-sm font-semibold rounded-lg transition-colors ${lang === 'fr' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetLang('fr')}
          >
            FR
          </button>
          <button
            className={`px-5 h-full text-sm font-semibold rounded-lg transition-colors ${lang === 'en' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSetLang('en')}
          >
            EN
          </button>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center">
          {lang === 'fr'
            ? 'Tu peux changer de langue à tout moment depuis le menu en bas.'
            : 'You can change language anytime from the bottom menu.'}
        </p>
      </div>
    ),
  },
  {
    title: { fr: 'Indices & Vider', en: 'Hints & Clear' },
    content: ({ lang }) => (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          {/* Hint button */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(251 191 36)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                <path d="M9 18h6"/><path d="M10 22h4"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {lang === 'fr' ? 'Indices' : 'Hints'}
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                {lang === 'fr'
                  ? 'Active les indices pour recevoir une suggestion de combinaison.'
                  : 'Enable hints to receive a combination suggestion.'}
              </p>
            </div>
          </div>

          {/* Clear button */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {lang === 'fr' ? 'Vider' : 'Clear'}
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                {lang === 'fr'
                  ? 'Retire tous les éléments posés sur le plateau de jeu.'
                  : 'Remove all elements placed on the game board.'}
              </p>
            </div>
          </div>
        </div>
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal — fullscreen on mobile, centered card on desktop */}
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[420px] md:max-h-[90vh] bg-card md:rounded-2xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Step dots */}
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
