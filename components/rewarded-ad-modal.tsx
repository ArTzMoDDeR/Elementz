'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Lightbulb, Plus, ArrowDown } from 'lucide-react'
import type { HintResult } from '@/hooks/use-hint'

// ── Config ────────────────────────────────────────────────────────────────────
const ADS_REQUIRED = 5
const DWELL_MS     = 2000

const storageKey = (hintKey: string) => `hint_ad_progress_${hintKey}`

// ── Monetag — inject once, fire on demand, never auto-run ────────────────────
const MONETAG_ZONE    = '237069'
const MONETAG_TAG_URL = 'https://quge5.com/88/tag.min.js'

// Track whether we injected the script already
let monetagScriptInjected = false

function openMonetagAd(): void {
  const w = window as Record<string, unknown>
  const candidates = [`__show_${MONETAG_ZONE}`, `show_${MONETAG_ZONE}`]

  const tryShow = () => {
    for (const name of candidates) {
      if (typeof w[name] === 'function') {
        try { (w[name] as () => void)() } catch { /* ignore */ }
        return
      }
    }
  }

  if (monetagScriptInjected) { tryShow(); return }

  monetagScriptInjected = true
  const s = document.createElement('script')
  s.id  = 'monetag-tag'
  s.src = MONETAG_TAG_URL
  s.setAttribute('data-zone', MONETAG_ZONE)
  s.setAttribute('data-cfasync', 'false')
  // do NOT set async — we want synchronous execution so tryShow finds the fn
  s.onload = () => setTimeout(tryShow, 200)
  document.head.appendChild(s)
}
// ─────────────────────────────────────────────────────────────────────────────

type ElementDef = { number: number; name: string; imageUrl?: string; color?: string }

interface Props {
  lang: 'fr' | 'en'
  hint: HintResult
  elements: Map<string, ElementDef>
  onComplete: () => void
  onDismiss: () => void
}

// ── Tile ──────────────────────────────────────────────────────────────────────
function Tile({ element, hidden = false }: { element: ElementDef | undefined; hidden?: boolean }) {
  if (hidden || !element) {
    return (
      <div className="w-20 h-20 rounded-2xl bg-muted/40 border-2 border-dashed border-white/10 flex items-center justify-center flex-shrink-0">
        <span className="text-2xl font-black text-white/20 select-none">?</span>
      </div>
    )
  }
  return (
    <div
      className="w-20 h-20 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-1 flex-shrink-0 p-2 animate-in zoom-in-95 fade-in duration-300"
      style={{
        background: element.color ? `${element.color}15` : 'rgba(255,255,255,0.05)',
        borderColor: element.color ? `${element.color}35` : undefined,
      }}
    >
      {element.imageUrl ? (
        <img src={element.imageUrl} alt={element.name} className="w-10 h-10 object-contain pointer-events-none" draggable={false} />
      ) : (
        <span className="text-xl font-bold text-muted-foreground">{element.name[0]}</span>
      )}
      <span className="text-[10px] font-semibold text-center leading-tight text-foreground/80 w-full truncate px-0.5">
        {element.name}
      </span>
    </div>
  )
}

// ── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < current
              ? 'w-3 h-3 bg-amber-400'
              : i === current
              ? 'w-3 h-3 bg-amber-400/30 ring-2 ring-amber-400/30'
              : 'w-2.5 h-2.5 bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function RewardedAdModal({ lang, hint, elements, onComplete, onDismiss }: Props) {
  const hintKey = `${hint.result}_${hint.ing1}_${hint.ing2}`

  const [adsDone, setAdsDone] = useState<number>(() => {
    try { return Math.min(parseInt(sessionStorage.getItem(storageKey(hintKey)) ?? '0', 10), ADS_REQUIRED) }
    catch { return 0 }
  })

  // 'idle' = waiting for click | 'waiting' = dwell timer running | 'ready' = can confirm
  const [btnState, setBtnState] = useState<'idle' | 'waiting' | 'ready'>('idle')
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isComplete = adsDone >= ADS_REQUIRED

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const getEl = useCallback((num: number): ElementDef | undefined => {
    for (const el of elements.values()) if (el.number === num) return el
    return undefined
  }, [elements])

  const resultEl = getEl(hint.result)
  const ing1El   = getEl(hint.ing1)
  const ing2El   = getEl(hint.ing2)

  // Persist progress per hint
  useEffect(() => {
    try { sessionStorage.setItem(storageKey(hintKey), String(adsDone)) } catch {}
  }, [adsDone, hintKey])

  // Cleanup on unmount
  useEffect(() => () => { if (dwellRef.current) clearTimeout(dwellRef.current) }, [])

  const handleAdClick = useCallback(() => {
    if (btnState === 'waiting') return // already counting, ignore re-clicks
    openMonetagAd()
    setBtnState('waiting')
    if (dwellRef.current) clearTimeout(dwellRef.current)
    dwellRef.current = setTimeout(() => setBtnState('ready'), DWELL_MS)
  }, [btnState])

  const handleConfirm = useCallback(() => {
    if (dwellRef.current) clearTimeout(dwellRef.current)
    setBtnState('idle')
    setAdsDone(prev => Math.min(prev + 1, ADS_REQUIRED))
  }, [])

  // Button label + style depending on state
  const btnLabel = (() => {
    if (btnState === 'waiting') return t('Patiente…', 'Wait…')
    if (btnState === 'ready')   return t('Compter cette pub ✓', 'Count this ad ✓')
    if (adsDone === 0)          return t('Voir une pub', 'View an ad')
    return t('Pub suivante', 'Next ad')
  })()

  const btnActive = btnState !== 'waiting'

  // ── REVEAL ────────────────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center">
        <div className="absolute inset-0 bg-background/96 backdrop-blur-2xl" />
        <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center px-6 gap-7 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="text-center space-y-1">
            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
              {t('Votre indice', 'Your hint')}
            </p>
            <h2 className="text-xl font-bold text-foreground">
              {t('Vous pouvez créer', 'You can create')}
            </h2>
          </div>

          <Tile element={resultEl} hidden={false} />

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <p className="text-[11px] text-muted-foreground/40 font-medium uppercase tracking-widest flex-shrink-0">
              {t('avec', 'with')}
            </p>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          <div className="flex items-center gap-4">
            <Tile element={ing1El} hidden={false} />
            <Plus className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />
            <Tile element={ing2El} hidden />
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-all hover:opacity-90"
          >
            {t('OK', 'OK')}
          </button>
        </div>
      </div>
    )
  }

  // ── MAIN (single persistent screen) ─────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/96 backdrop-blur-2xl" />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center px-6 gap-6">

        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute -top-2 right-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          aria-label={t('Fermer', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-3xl bg-amber-400/10 border border-amber-400/15 flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-amber-400" />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {t('Débloquer un indice', 'Unlock a hint')}
          </h2>
          <p className="text-sm text-muted-foreground/60">
            {t(`${adsDone}/${ADS_REQUIRED} pubs regardées`, `${adsDone}/${ADS_REQUIRED} ads watched`)}
          </p>
        </div>

        {/* Progress dots — only thing that updates */}
        <ProgressDots current={adsDone} total={ADS_REQUIRED} />

        {/* Hidden hint teaser */}
        <div className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col items-center gap-3">
          <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest">
            {t('Essayez de créer', 'Try to create')}
          </p>
          <Tile element={resultEl} hidden />
          <ArrowDown className="w-4 h-4 text-muted-foreground/20" />
          <div className="flex items-center gap-3">
            <Tile element={ing1El} hidden />
            <Plus className="w-4 h-4 text-muted-foreground/20 flex-shrink-0" />
            <Tile element={ing2El} hidden />
          </div>
        </div>

        {/* Single action button — changes label+style, never moves */}
        <button
          onClick={btnState === 'ready' ? handleConfirm : handleAdClick}
          disabled={btnState === 'waiting'}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed"
          style={{
            background: btnState === 'waiting'
              ? 'rgba(251,191,36,0.12)'
              : '#fbbf24',
            color: btnState === 'waiting' ? 'rgba(251,191,36,0.35)' : '#000',
          }}
        >
          {btnLabel}
        </button>

        {btnActive && btnState === 'idle' && (
          <p className="text-[11px] text-muted-foreground/25">
            {t('Chaque pub compte pour 1 point', 'Each ad counts as 1 point')}
          </p>
        )}
      </div>
    </div>
  )
}
