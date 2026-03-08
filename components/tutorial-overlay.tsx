'use client'

import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'

type TutorialStep =
  | 'drag-first'    // "prends Feu depuis l'inventaire"
  | 'drag-second'   // "prends Eau et pose-le sur Feu"
  | 'success-1'     // premier combo réussi
  | 'drag-third'    // "refais une combinaison de ton choix"
  | 'success-2'     // deuxième combo réussi
  | 'done'

type Props = {
  lang: 'fr' | 'en'
  discoveredCount: number   // watch for +1 to advance
  onDismiss: () => void
}

const t = (lang: 'fr' | 'en', fr: string, en: string) => lang === 'fr' ? fr : en

export function TutorialOverlay({ lang, discoveredCount, onDismiss }: Props) {
  const [step, setStep] = useState<TutorialStep>('drag-first')
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const prevCountRef = useRef(discoveredCount)
  const combo1CountRef = useRef(discoveredCount)

  // Fade-in on mount
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(id)
  }, [])

  // Watch for new discoveries to advance steps
  useEffect(() => {
    if (discoveredCount > prevCountRef.current) {
      prevCountRef.current = discoveredCount

      setStep(prev => {
        if (prev === 'drag-first' || prev === 'drag-second') {
          combo1CountRef.current = discoveredCount
          return 'success-1'
        }
        if (prev === 'drag-third') {
          return 'success-2'
        }
        return prev
      })
    }
  }, [discoveredCount])

  // Auto-advance from success screens
  useEffect(() => {
    if (step === 'success-1') {
      const id = setTimeout(() => setStep('drag-third'), 2200)
      return () => clearTimeout(id)
    }
    if (step === 'success-2') {
      const id = setTimeout(() => dismiss(), 2200)
      return () => clearTimeout(id)
    }
  }, [step])

  const dismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 350)
  }

  // Determine which inventory slots to highlight (by element name)
  const highlights: string[] = (() => {
    if (step === 'drag-first') return [t(lang, 'feu', 'fire')]
    if (step === 'drag-second') return [t(lang, 'eau', 'water')]
    return []
  })()

  const stepNum = step === 'drag-first' ? 1
    : step === 'drag-second' ? 2
    : step === 'drag-third' ? 3
    : null

  const totalSteps = 3

  return (
    <>
      {/* Pulse rings on inventory elements */}
      {highlights.map(name => (
        <ElementHighlight key={name} elementName={name} />
      ))}

      {/* Bottom tooltip card */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[8000] flex justify-center pb-[calc(env(safe-area-inset-bottom)+80px)] px-4 pointer-events-none transition-all duration-350 ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 pointer-events-auto overflow-hidden">

          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-0">
            <div className="flex items-center gap-2">
              {stepNum !== null && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${i < (stepNum - 1) ? 'w-4 bg-primary/50' : i === stepNum - 1 ? 'w-6 bg-primary' : 'w-4 bg-border'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pt-2 pb-4">
            <StepContent step={step} lang={lang} />
          </div>
        </div>
      </div>
    </>
  )
}

function StepContent({ step, lang }: { step: TutorialStep; lang: 'fr' | 'en' }) {
  if (step === 'drag-first') return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xl">🔥</span>
      </div>
      <div>
        <p className="text-sm font-bold text-foreground leading-tight mb-1">
          {t(lang, 'Étape 1 — Pose Feu sur le terrain', 'Step 1 — Place Fire on the board')}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t(
            lang,
            'Appuie sur Feu dans ta liste d\'éléments en bas, puis pose-le sur le terrain.',
            'Tap Fire in your element list below, then place it on the board.',
          )}
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground/60">{t(lang, 'Surligné en bas', 'Highlighted below')}</span>
          <PulsingDot color="bg-red-400" />
        </div>
      </div>
    </div>
  )

  if (step === 'drag-second') return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xl">💧</span>
      </div>
      <div>
        <p className="text-sm font-bold text-foreground leading-tight mb-1">
          {t(lang, 'Étape 2 — Combine avec Eau', 'Step 2 — Combine with Water')}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t(
            lang,
            'Maintenant pose Eau sur le terrain, puis glisse-le sur Feu pour les combiner.',
            'Now place Water on the board, then drag it onto Fire to combine them.',
          )}
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground/60">{t(lang, 'Surligné en bas', 'Highlighted below')}</span>
          <PulsingDot color="bg-blue-400" />
        </div>
      </div>
    </div>
  )

  if (step === 'success-1') return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
        <span className="text-xl">✨</span>
      </div>
      <div>
        <p className="text-sm font-bold text-emerald-400 leading-tight">
          {t(lang, 'Première découverte !', 'First discovery!')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t(lang, 'Tu as compris le principe. Encore une...', 'You got it. One more to go...')}
        </p>
      </div>
    </div>
  )

  if (step === 'drag-third') return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xl">⚗️</span>
      </div>
      <div>
        <p className="text-sm font-bold text-foreground leading-tight mb-1">
          {t(lang, 'Étape 3 — Une combinaison de ton choix', 'Step 3 — Any combination you like')}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t(
            lang,
            'Combine n\'importe quels deux éléments pour créer quelque chose de nouveau.',
            'Combine any two elements together to create something new.',
          )}
        </p>
      </div>
    </div>
  )

  if (step === 'success-2') return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
        <span className="text-xl">🎉</span>
      </div>
      <div>
        <p className="text-sm font-bold text-emerald-400 leading-tight">
          {t(lang, 'Tu es prêt !', "You're all set!")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t(lang, 'Des centaines d\'éléments t\'attendent. Bonne chance !', 'Hundreds of elements await. Good luck!')}
        </p>
      </div>
    </div>
  )

  return null
}

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  )
}

// Finds the matching element badge in the DOM and draws a highlight ring around it
function ElementHighlight({ elementName }: { elementName: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const findEl = () => {
      // Element badges have a data-element attribute set to their name
      const el = document.querySelector(`[data-element="${elementName}"]`)
      if (el) setRect(el.getBoundingClientRect())
    }
    findEl()
    const interval = setInterval(findEl, 300)
    return () => clearInterval(interval)
  }, [elementName])

  if (!rect) return null

  const PAD = 6
  return (
    <div
      className="fixed z-[7999] pointer-events-none"
      style={{
        left: rect.left - PAD,
        top: rect.top - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 16,
        boxShadow: '0 0 0 2px rgba(var(--primary-rgb, 255,255,255), 0.8)',
        animation: 'tutorialPulse 1.4s ease-in-out infinite',
      }}
    />
  )
}
