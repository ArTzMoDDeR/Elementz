'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Lightbulb, Plus, Lock, PlayCircle, ChevronDown } from 'lucide-react'
import type { HintResult } from '@/hooks/use-hint'

// ── AdMob config (Capacitor native) ──────────────────────────────────────────
// Switch to production IDs once the app is live:
// const ADMOB_APP_ID      = 'ca-app-pub-2003923325493504~9495366197'
// const ADMOB_REWARDED_ID = 'ca-app-pub-2003923325493504/3839106022'
const ADMOB_REWARDED_ID = 'ca-app-pub-3940256099942544/1712485313' // Test rewarded video
// ── AdSense config (web fallback) ────────────────────────────────────────────
const ADSENSE_CLIENT = 'ca-pub-2003923325493504'
const ADSENSE_SLOT   = 'REPLACE_WITH_YOUR_REWARDED_SLOT_ID'
// ─────────────────────────────────────────────────────────────────────────────

// Detect if running inside a Capacitor native app
function isNative(): boolean {
  try {
    // @ts-ignore
    return typeof window !== 'undefined' && !!(window.Capacitor?.isNativePlatform?.())
  } catch {
    return false
  }
}

// Show AdMob rewarded video on native platforms
async function requestAdMobRewarded(): Promise<boolean> {
  try {
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.prepareRewardVideoAd({ adId: ADMOB_REWARDED_ID })
    const result = await AdMob.showRewardVideoAd()
    // result.type === 'earned' means the user completed the ad
    return !!result
  } catch (err) {
    console.error('[admob] rewarded error', err)
    return false
  }
}

type ElementDef = { number: number; name: string; imageUrl?: string; color?: string }

interface Props {
  lang: 'fr' | 'en'
  hint: HintResult
  elements: Map<string, ElementDef>
  onComplete: () => void
  onDismiss: () => void
}

const t = (lang: 'fr' | 'en', fr: string, en: string) => lang === 'fr' ? fr : en

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadAdSenseScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById('adsense-script')) { resolve(); return }
    const s = document.createElement('script')
    s.id = 'adsense-script'
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
    s.async = true
    s.crossOrigin = 'anonymous'
    s.onload = () => resolve()
    s.onerror = () => resolve() // resolve anyway — fallback handles it
    document.head.appendChild(s)
  })
}

// Request a rewarded interstitial ad.
// Returns a Promise<boolean>: true = ad completed, false = no fill / blocked.
function requestRewardedAd(): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      await loadAdSenseScript()

      const adsbygoogle = ((window as Record<string, unknown>).adsbygoogle ??= []) as unknown[]

      // AdSense Rewarded Interstitial API
      // https://support.google.com/adsense/answer/9932971
      const adUnit = new ((window as Record<string, unknown>).google as Record<string, unknown>)
        .ima.RewardedAd({  // This is the correct API shape once AdSense is live
          adClient: ADSENSE_CLIENT,
          adSlot: ADSENSE_SLOT,
        })

      adUnit.addEventListener('rewardedSlotReady', (e: CustomEvent<{ makeRewardedVisible: () => void }>) => {
        e.detail.makeRewardedVisible()
      })
      adUnit.addEventListener('rewardedSlotClosed', () => resolve(false))
      adUnit.addEventListener('rewardedSlotGranted', () => resolve(true))

      void adsbygoogle
      adUnit.display()
    } catch {
      resolve(false)
    }
  })
}

// ── Tile ──────────────────────────────────────────────────────────────────────
function Tile({ el, hidden = false, size = 'md' }: {
  el: ElementDef | undefined
  hidden?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim    = size === 'sm' ? 'w-16 h-16' : size === 'lg' ? 'w-28 h-28' : 'w-20 h-20'
  const imgDim = size === 'sm' ? 'w-7 h-7'   : size === 'lg' ? 'w-16 h-16' : 'w-10 h-10'

  if (hidden || !el) {
    return (
      <div className={`${dim} rounded-2xl bg-white/[0.04] border-2 border-dashed border-white/10 flex items-center justify-center flex-shrink-0`}>
        <span className="text-2xl font-bold text-white/20 select-none">?</span>
      </div>
    )
  }
  return (
    <div
      className={`${dim} rounded-2xl border flex flex-col items-center justify-center gap-1 flex-shrink-0 p-2 animate-in zoom-in-95 fade-in duration-300`}
      style={{
        background:   el.color ? `${el.color}12` : 'rgba(255,255,255,0.05)',
        borderColor:  el.color ? `${el.color}30` : 'rgba(255,255,255,0.08)',
      }}
    >
      {el.imageUrl
        ? <img src={el.imageUrl} alt={el.name} className={`${imgDim} object-contain pointer-events-none`} draggable={false} />
        : <span className="text-lg font-bold text-muted-foreground">{el.name[0]}</span>
      }
      <span className="text-[9px] font-semibold text-center leading-tight text-foreground/60 w-full truncate px-0.5">
        {el.name}
      </span>
    </div>
  )
}

// ── HintReveal — staggered animated reveal ────────────────────────────────────

function HintReveal({ lang, resultEl, ing1El, ing2El, onComplete }: {
  lang: 'fr' | 'en'
  resultEl: ElementDef | undefined
  ing1El: ElementDef | undefined
  ing2El: ElementDef | undefined
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)
  // step 0 = title only, 1 = + result element, 2 = + "avec" + ing1, 3 = + ing2 hidden, 4 = show button
  useEffect(() => {
    const delays = [600, 1100, 1700, 2300]
    const timers = delays.map((d, i) => setTimeout(() => setStep(i + 1), d))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/98 backdrop-blur-2xl" />
      <div className="relative z-10 w-full max-w-xs mx-auto flex flex-col items-center px-6 gap-0">

        {/* Step 0 — title */}
        <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${step >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-1.5 bg-amber-400/10 px-3 py-1 rounded-full">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
              {t(lang, 'Indice', 'Hint')}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-foreground text-center leading-tight mt-1">
            {t(lang, 'Tu peux créer', 'You can create')}
          </h2>
        </div>

        {/* Step 1 — result element */}
        <div className={`mt-7 transition-all duration-500 ${step >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-90'}`}>
          <Tile el={resultEl} hidden={false} size="lg" />
        </div>

        {/* Step 2 — "avec" divider + ing1 */}
        <div className={`mt-7 w-full flex flex-col items-center gap-5 transition-all duration-500 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-xs text-muted-foreground/50 font-medium uppercase tracking-widest">
              {t(lang, 'avec', 'with')}
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </div>
          <div className="flex items-center gap-5">
            <Tile el={ing1El} hidden={false} />
            <Plus className="w-5 h-5 text-muted-foreground/20 flex-shrink-0" />
            {/* Step 3 — ing2 hidden */}
            <div className={`transition-all duration-500 ${step >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <Tile el={ing2El} hidden />
            </div>
          </div>
        </div>

        {/* Step 4 — button */}
        <div className={`mt-10 w-full transition-all duration-500 ${step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={onComplete}
            className="w-full py-4 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-transform cursor-pointer"
          >
            {t(lang, "J'ai compris !", 'Got it!')}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function RewardedAdModal({ lang, hint, elements, onComplete, onDismiss }: Props) {
  const [phase, setPhase] = useState<'intro' | 'loading' | 'reveal'>('intro')
  const dismissed = useRef(false)

  const getEl = useCallback((num: number) => {
    for (const el of elements.values()) if (el.number === num) return el
    return undefined
  }, [elements])

  const resultEl = getEl(hint.result)
  const ing1El   = getEl(hint.ing1)
  const ing2El   = getEl(hint.ing2)

  // Prevent accidental dismiss from firing an ad
  const handleDismiss = useCallback(() => {
    if (dismissed.current) return
    dismissed.current = true
    onDismiss()
  }, [onDismiss])

  const handleWatchAd = useCallback(async () => {
    setPhase('loading')
    let rewarded = false
    if (isNative()) {
      rewarded = await requestAdMobRewarded()
    } else {
      rewarded = await requestRewardedAd()
    }
    // Always reveal hint — grant on no-fill/web until fully monetised
    setPhase('reveal')
    void rewarded
  }, [])

  // ── REVEAL ────────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    return <HintReveal lang={lang} resultEl={resultEl} ing1El={ing1El} ing2El={ing2El} onComplete={onComplete} />
  }

  // ── INTRO / LOADING ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop — click outside to dismiss */}
      <div
        className="absolute inset-0 bg-background/95 backdrop-blur-2xl"
        onClick={phase === 'loading' ? undefined : handleDismiss}
      />

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center px-6 gap-8 animate-in fade-in duration-200">

        {/* Header */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="inline-flex items-center gap-1.5 bg-amber-400/10 px-3 py-1 rounded-full mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
              {t(lang, 'Indice', 'Hint')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {t(lang, 'Débloquer un indice', 'Unlock a hint')}
          </h2>
          <p className="text-sm text-muted-foreground/50 leading-relaxed max-w-[260px] mx-auto">
            {t(
              lang,
              'Regardez une courte pub pour révéler un ingrédient de votre prochain élément.',
              'Watch a short ad to reveal one ingredient of your next element.'
            )}
          </p>
        </div>

        {/* Hint schema — blurred preview */}
        <div className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col items-center gap-4">
          <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest">
            {t(lang, 'Votre prochain indice', 'Your next hint')}
          </p>
          <Tile el={resultEl} hidden size="sm" />
          <div className="w-px h-3 bg-white/[0.08]" />
          <div className="flex items-center gap-3">
            <Tile el={ing1El} hidden size="sm" />
            <Plus className="w-3.5 h-3.5 text-white/15 flex-shrink-0" />
            <Tile el={ing2El} hidden size="sm" />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleWatchAd}
          disabled={phase === 'loading'}
          className="w-full py-4 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          style={{
            background: phase === 'loading' ? 'rgba(251,191,36,0.15)' : '#fbbf24',
            color:      phase === 'loading' ? 'rgba(251,191,36,0.4)'  : '#000',
          }}
        >
          {phase === 'loading' ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              {t(lang, 'Chargement…', 'Loading…')}
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              {t(lang, 'Regarder une pub', 'Watch an ad')}
            </>
          )}
        </button>

        <p className="text-[10px] text-muted-foreground/20 text-center -mt-4 pb-2">
          {isNative()
            ? t(lang, 'Propulsé par Google AdMob', 'Powered by Google AdMob')
            : t(lang, 'Propulsé par Google AdSense', 'Powered by Google AdSense')}
        </p>
      </div>
    </div>
  )
}
