'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { OTPInput, SlotProps } from 'input-otp'
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import Image from 'next/image'

// ── Data ──────────────────────────────────────────────────────────────────────
const WATER = { id: 168, img: '/elements/168.webp', name_fr: 'Eau',    name_en: 'Water' }
const SEA   = { id: 609, img: '/elements/609.webp', name_fr: 'Mer',    name_en: 'Sea'   }

type Lang = 'fr' | 'en'
type Step = 'lang' | 'combine' | 'signup'
type CombinePhase = 'add-first' | 'add-second' | 'ready' | 'merging' | 'result'

function t(lang: Lang, fr: string, en: string) { return lang === 'fr' ? fr : en }

// ── OTP Slot ──────────────────────────────────────────────────────────────────
function Slot({ char, isActive, hasFakeCaret }: SlotProps) {
  return (
    <div className={`relative w-12 h-14 flex items-center justify-center rounded-2xl border-2 text-xl font-bold transition-all
      ${isActive ? 'border-foreground bg-foreground/5 shadow-[0_0_0_4px_oklch(var(--foreground)/0.08)]'
        : char ? 'border-foreground/40 bg-foreground/5'
        : 'border-border bg-muted/30'}`}
    >
      {char ?? <span className="text-muted-foreground/25">·</span>}
      {hasFakeCaret && <span className="absolute w-0.5 h-6 bg-foreground animate-caret-blink rounded-full" />}
    </div>
  )
}

// ── Playground slot ───────────────────────────────────────────────────────────
function PlaygroundSlot({ filled, glowing }: { filled: boolean; glowing: boolean }) {
  return (
    <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
      ${filled
        ? glowing
          ? 'border-amber-400/70 bg-amber-400/10 shadow-[0_0_18px_4px_rgba(251,191,36,0.22)]'
          : 'border-foreground/30 bg-muted/30'
        : 'border-dashed border-border/50 bg-muted/10'}`}
    >
      {filled && (
        <img
          src={WATER.img}
          alt="water"
          className="w-14 h-14 object-contain animate-in zoom-in duration-200"
          draggable={false}
        />
      )}
    </div>
  )
}

// ── Combine step ──────────────────────────────────────────────────────────────
function CombineStep({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const [phase, setPhase] = useState<CombinePhase>('add-first')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleTapWater() {
    if (phase === 'add-first') {
      setPhase('add-second')
    } else if (phase === 'add-second') {
      setPhase('ready')
      // Auto-trigger merge after brief pause to let user see both slots filled
      timerRef.current = setTimeout(() => triggerMerge(), 800)
    }
  }

  function triggerMerge() {
    setPhase('merging')
    timerRef.current = setTimeout(() => setPhase('result'), 1400)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const showPlayground = phase !== 'result'
  const showInventory  = phase === 'add-first' || phase === 'add-second'

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4">

      {/* Dynamic instruction title */}
      <div className="text-center space-y-1 min-h-[60px] flex flex-col items-center justify-center">
        {phase === 'add-first' && (
          <>
            <h2 className="text-2xl font-bold text-foreground animate-in fade-in duration-300">
              {t(lang, 'Ajoute au terrain', 'Add to the field')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(lang, 'Appuie sur l\'Eau dans ton inventaire', 'Tap Water in your inventory')}
            </p>
          </>
        )}
        {phase === 'add-second' && (
          <>
            <h2 className="text-2xl font-bold text-foreground animate-in fade-in duration-300">
              {t(lang, 'Encore une fois !', 'One more time!')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(lang, 'Appuie encore sur l\'Eau', 'Tap Water one more time')}
            </p>
          </>
        )}
        {(phase === 'ready' || phase === 'merging') && (
          <>
            <h2 className="text-2xl font-bold text-foreground animate-in fade-in duration-300">
              {t(lang, 'Fusion en cours…', 'Merging…')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(lang, 'Les éléments se combinent', 'The elements are combining')}
            </p>
          </>
        )}
        {phase === 'result' && (
          <div className="flex items-center gap-2 animate-in zoom-in fade-in duration-400">
            <CheckCircle size={18} className="text-amber-400 flex-shrink-0" />
            <h2 className="text-xl font-bold text-foreground">
              {t(lang, 'Tu as découvert la Mer !', 'You discovered the Sea!')}
            </h2>
          </div>
        )}
      </div>

      {/* Playground arena */}
      {showPlayground && (
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {t(lang, 'Terrain', 'Field')}
          </p>
          <div className="w-full max-w-xs rounded-3xl border border-border/50 bg-muted/10 p-5 flex items-center justify-center gap-6">
            <PlaygroundSlot filled={phase !== 'add-first'} glowing={phase === 'ready' || phase === 'merging'} />

            {/* Plus / Spinner */}
            <div className="flex items-center justify-center w-8 h-8">
              {phase === 'merging' ? (
                <Loader2 size={22} className="text-amber-400 animate-spin" />
              ) : (
                <span className="text-2xl text-muted-foreground/60 font-light select-none">+</span>
              )}
            </div>

            <PlaygroundSlot filled={phase === 'ready' || phase === 'merging'} glowing={phase === 'ready' || phase === 'merging'} />
          </div>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <div className="flex flex-col items-center gap-4 animate-in zoom-in fade-in duration-500">
          {/* Toast-style result */}
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-amber-400/30 bg-amber-400/10">
            <img src={SEA.img} alt={t(lang, SEA.name_fr, SEA.name_en)} className="w-16 h-16 object-contain drop-shadow-lg" draggable={false} />
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">
                {t(lang, 'Nouveau !', 'New!')}
              </p>
              <p className="text-lg font-bold text-foreground">{t(lang, SEA.name_fr, SEA.name_en)}</p>
              <p className="text-xs text-muted-foreground">{t(lang, 'Eau + Eau', 'Water + Water')}</p>
            </div>
          </div>

          <button
            onClick={onDone}
            className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-transform cursor-pointer"
          >
            {t(lang, 'Continuer', 'Continue')}
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Inventory */}
      {showInventory && (
        <div className="flex flex-col items-center gap-2.5 w-full mt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {t(lang, 'Inventaire', 'Inventory')}
          </p>
          <div className="w-full max-w-xs rounded-2xl border border-border/40 bg-muted/20 p-4 flex justify-center">
            <button
              onClick={handleTapWater}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer group"
            >
              <div className="w-20 h-20 rounded-2xl border-2 border-amber-400/60 bg-amber-400/10 flex items-center justify-center shadow-[0_0_14px_2px_rgba(251,191,36,0.20)] group-active:shadow-[0_0_20px_4px_rgba(251,191,36,0.35)] transition-all">
                <img src={WATER.img} alt={t(lang, WATER.name_fr, WATER.name_en)} className="w-14 h-14 object-contain" draggable={false} />
              </div>
              <span className="text-xs font-semibold text-foreground capitalize">
                {t(lang, WATER.name_fr, WATER.name_en)}
              </span>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/50">
            {phase === 'add-first'
              ? t(lang, 'Appuie pour ajouter au terrain', 'Tap to add to the field')
              : t(lang, 'Encore une fois', 'One more time')}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sign-up step ──────────────────────────────────────────────────────────────
function SignupStep({ lang, onSkip }: { lang: Lang; onSkip: () => void }) {
  const [email, setEmail]     = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function sendOtp() {
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      const r = await signIn('email', { email: email.trim(), redirect: false })
      if (r?.error) setError(t(lang, 'Erreur, réessaie.', 'Error, please retry.'))
      else setOtpSent(true)
    } catch { setError(t(lang, 'Erreur réseau.', 'Network error.')) }
    finally { setLoading(false) }
  }

  async function verifyOtp(code: string) {
    if (code.length < 6) return
    setLoading(true); setError('')
    try {
      try {
        const saved = localStorage.getItem('alchemy-discovered-v4')
        if (saved) {
          const ids: number[] = JSON.parse(saved)
          if (ids.length > 4) localStorage.setItem('alchemy-guest-snapshot', saved)
        }
      } catch {}
      const r = await signIn('email', { email: email.trim(), token: code, redirect: false, callbackUrl: '/' })
      if (r?.error) { setError(t(lang, 'Code incorrect ou expiré.', 'Incorrect or expired code.')); setOtp('') }
      else window.location.href = r?.url ?? '/'
    } catch { setError(t(lang, 'Erreur réseau.', 'Network error.')) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full px-6">
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-bold text-foreground text-balance">
          {t(lang, 'Sauvegarde ta progression', 'Save your progress')}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t(lang, 'Connecte-toi pour ne jamais perdre tes découvertes.', "Sign in so you never lose your discoveries.")}
        </p>
      </div>

      {!otpSent ? (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendOtp()}
            placeholder={t(lang, 'ton@email.com', 'your@email.com')}
            className="w-full px-4 py-3.5 rounded-2xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-foreground/40 transition-colors"
            autoCapitalize="none" autoCorrect="off"
          />
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button
            onClick={sendOtp}
            disabled={loading || !email.trim()}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold disabled:opacity-40 active:scale-[0.97] transition-transform cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : t(lang, 'Recevoir un code', 'Send me a code')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-xs text-muted-foreground text-center">
            {t(lang, `Code envoyé à ${email}`, `Code sent to ${email}`)}
          </p>
          <OTPInput
            maxLength={6}
            value={otp}
            onChange={v => { setOtp(v); if (v.length === 6) verifyOtp(v) }}
            containerClassName="flex gap-2"
            render={({ slots }) => slots.map((s, i) => <Slot key={i} {...s} />)}
          />
          {loading && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
      )}

      <button
        onClick={onSkip}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline cursor-pointer transition-colors"
      >
        {t(lang, 'Pas maintenant', 'Not now')}
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('en')
  const [step, setStep] = useState<Step>('lang')

  function finish() {
    try { localStorage.setItem('alchemy-welcome-done', '1') } catch {}
    router.push('/')
  }

  const STEPS: Step[] = ['lang', 'combine', 'signup']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div
      className="fixed inset-0 bg-background flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        {/* Logo */}
        <Image src="/logo.svg" alt="Elementz" width={28} height={28} className="opacity-80" />

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-400 ${
                i === stepIdx ? 'w-6 bg-foreground' :
                i < stepIdx  ? 'w-1.5 bg-foreground/40' :
                               'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Skip (only on combine step) */}
        <div className="w-7" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto overflow-hidden">

        {/* STEP: lang */}
        {step === 'lang' && (
          <div className="flex flex-col items-center gap-8 w-full px-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            {/* Logo + name */}
            <div className="flex flex-col items-center gap-3">
              <Image src="/logo.svg" alt="Elementz" width={72} height={72} className="drop-shadow-lg" />
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Elementz</h1>
            </div>

            {/* Language selection — tap directly validates */}
            <div className="flex flex-col gap-3 w-full">
              <p className="text-center text-sm text-muted-foreground mb-1">
                Choose your language / Choisis ta langue
              </p>
              <button
                onClick={() => { setLang('en'); setTimeout(() => setStep('combine'), 250) }}
                className="w-full py-4 rounded-2xl border border-border bg-muted/30 text-foreground text-sm font-bold active:scale-[0.97] transition-all cursor-pointer hover:border-foreground/30 hover:bg-muted/50"
              >
                English
              </button>
              <button
                onClick={() => { setLang('fr'); setTimeout(() => setStep('combine'), 250) }}
                className="w-full py-4 rounded-2xl border border-border bg-muted/30 text-foreground text-sm font-bold active:scale-[0.97] transition-all cursor-pointer hover:border-foreground/30 hover:bg-muted/50"
              >
                Français
              </button>
            </div>
          </div>
        )}

        {/* STEP: combine */}
        {step === 'combine' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-400">
            <CombineStep lang={lang} onDone={() => setStep('signup')} />
          </div>
        )}

        {/* STEP: signup */}
        {step === 'signup' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-400">
            <SignupStep lang={lang} onSkip={finish} />
          </div>
        )}
      </div>

      {/* Bottom safe area */}
      <div className="h-4 flex-shrink-0" />
    </div>
  )
}
