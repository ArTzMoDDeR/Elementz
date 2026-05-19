'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { OTPInput, SlotProps } from 'input-otp'
import { ArrowRight, Loader2 } from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────────────
const WATER = { id: 168, img: '/elements/168.webp', name_fr: 'eau',  name_en: 'water' }
const SEA   = { id: 609, img: '/elements/609.webp', name_fr: 'mer',  name_en: 'sea'   }

// ── Helpers ───────────────────────────────────────────────────────────────────
function t(lang: 'fr' | 'en', fr: string, en: string) { return lang === 'fr' ? fr : en }

type Step = 'lang' | 'combine' | 'signup'

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

// ── Element Tile ──────────────────────────────────────────────────────────────
function ElementTile({ img, name, glow = false }: { img: string; name: string; glow?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${glow ? 'scale-105' : ''}`}>
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-muted/40 border border-border transition-all duration-300 ${glow ? 'border-amber-400/60 shadow-[0_0_20px_4px_rgba(251,191,36,0.25)]' : ''}`}>
        <img src={img} alt={name} className="w-14 h-14 object-contain" draggable={false} />
      </div>
      <span className="text-xs font-semibold text-foreground capitalize">{name}</span>
    </div>
  )
}

// ── Combine Step ──────────────────────────────────────────────────────────────
function CombineStep({ lang, onDone }: { lang: 'fr' | 'en'; onDone: () => void }) {
  type Phase = 'idle' | 'merging' | 'result'
  const [phase, setPhase] = useState<Phase>('idle')
  const [tapped, setTapped] = useState(0) // 0 = none, 1 = first, 2 = both

  function handleTapWater() {
    if (phase !== 'idle') return
    const next = tapped + 1
    setTapped(next)
    if (next >= 2) {
      setTimeout(() => setPhase('merging'), 200)
      setTimeout(() => setPhase('result'), 1400)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Instruction */}
      <div className="text-center space-y-1 px-4">
        <h2 className="text-2xl font-bold text-foreground">
          {t(lang, 'Combine des éléments', 'Combine elements')}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {phase === 'idle' && tapped === 0 && t(lang, 'Appuie sur 💧 Eau deux fois pour la combiner avec elle-même', 'Tap 💧 Water twice to combine it with itself')}
          {phase === 'idle' && tapped === 1 && t(lang, 'Encore une fois !', 'One more time!')}
          {phase === 'merging' && t(lang, 'Fusion en cours…', 'Merging…')}
          {phase === 'result' && t(lang, 'Tu as découvert la Mer !', 'You discovered the Sea!')}
        </p>
      </div>

      {/* Arena */}
      <div className="flex items-center justify-center gap-6 w-full px-6">
        {/* Slot A */}
        <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
          ${tapped >= 1 ? 'border-amber-400/60 bg-amber-400/10' : 'border-dashed border-border bg-muted/20'}`}>
          {tapped >= 1 && (
            <img src={WATER.img} alt="water" className="w-14 h-14 object-contain animate-in zoom-in duration-200" />
          )}
        </div>

        {/* Plus / spinner */}
        <div className="flex items-center justify-center w-8">
          {phase === 'merging' ? (
            <Loader2 size={20} className="text-amber-400 animate-spin" />
          ) : (
            <span className="text-xl text-muted-foreground font-light">+</span>
          )}
        </div>

        {/* Slot B */}
        <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
          ${tapped >= 2 && phase === 'idle' ? 'border-amber-400/60 bg-amber-400/10' : 'border-dashed border-border bg-muted/20'}
          ${phase === 'merging' ? 'opacity-50' : ''}`}>
          {tapped >= 2 && phase === 'idle' && (
            <img src={WATER.img} alt="water" className="w-14 h-14 object-contain animate-in zoom-in duration-200" />
          )}
        </div>
      </div>

      {/* Result */}
      {phase === 'result' && (
        <div className="flex flex-col items-center gap-3 animate-in zoom-in fade-in duration-500">
          <ElementTile img={SEA.img} name={t(lang, SEA.name_fr, SEA.name_en)} glow />
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest">
            {t(lang, '+ Mer débloquée !', '+ Sea unlocked!')}
          </p>
        </div>
      )}

      {/* Inventory — tap water tile */}
      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground">{t(lang, 'Tes éléments', 'Your elements')}</p>
          <button
            onClick={handleTapWater}
            className="active:scale-95 transition-transform cursor-pointer"
          >
            <ElementTile img={WATER.img} name={t(lang, WATER.name_fr, WATER.name_en)} glow={tapped >= 1} />
          </button>
          <p className="text-[11px] text-muted-foreground/60">
            {t(lang, `Sélectionné : ${tapped}/2`, `Selected: ${tapped}/2`)}
          </p>
        </div>
      )}

      {/* CTA */}
      {phase === 'result' && (
        <button
          onClick={onDone}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-transform cursor-pointer"
        >
          {t(lang, 'Continuer', 'Continue')}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  )
}

// ── Sign-up step ──────────────────────────────────────────────────────────────
function SignupStep({ lang, onSkip }: { lang: 'fr' | 'en'; onSkip: () => void }) {
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      // Save guest snapshot before signing in
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
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-foreground">
          {t(lang, 'Sauvegarde ta progression', 'Save your progress')}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t(lang, 'Connecte-toi pour ne jamais perdre tes découvertes.', 'Sign in so you never lose your discoveries.')}
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
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [step, setStep] = useState<Step>('lang')

  function finish() {
    try { localStorage.setItem('alchemy-welcome-done', '1') } catch {}
    router.push('/')
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-between overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Progress dots */}
      <div className="flex gap-2 pt-6 pb-2">
        {(['lang', 'combine', 'signup'] as Step[]).map(s => (
          <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-foreground' : 'w-1.5 bg-border'}`} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto px-0 gap-6">

        {/* STEP: lang */}
        {step === 'lang' && (
          <div className="flex flex-col items-center gap-8 w-full px-6">
            <div className="text-center space-y-2">
              <div className="text-5xl mb-2">⚗️</div>
              <h1 className="text-3xl font-bold text-foreground">Elementz</h1>
              <p className="text-sm text-muted-foreground">
                {lang === 'fr' ? 'Choisis ta langue' : 'Choose your language'}
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setLang('fr')}
                className={`flex-1 py-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer active:scale-[0.97] ${lang === 'fr' ? 'border-foreground bg-foreground text-background' : 'border-border bg-muted/30 text-foreground'}`}
              >
                🇫🇷 Français
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-4 rounded-2xl border text-sm font-bold transition-all cursor-pointer active:scale-[0.97] ${lang === 'en' ? 'border-foreground bg-foreground text-background' : 'border-border bg-muted/30 text-foreground'}`}
              >
                🇬🇧 English
              </button>
            </div>
            <button
              onClick={() => setStep('combine')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold active:scale-[0.97] transition-transform cursor-pointer"
            >
              {lang === 'fr' ? 'Commencer' : 'Get started'}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP: combine */}
        {step === 'combine' && (
          <CombineStep lang={lang} onDone={() => setStep('signup')} />
        )}

        {/* STEP: signup */}
        {step === 'signup' && (
          <SignupStep lang={lang} onSkip={finish} />
        )}

      </div>

      {/* Bottom spacer */}
      <div className="h-6" />
    </div>
  )
}
