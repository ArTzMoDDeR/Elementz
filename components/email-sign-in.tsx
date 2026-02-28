'use client'

import { useState, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'
import { OTPInput, SlotProps } from 'input-otp'

function Slot({ char, isActive, hasFakeCaret }: SlotProps) {
  return (
    <div
      className={`w-10 h-12 flex items-center justify-center rounded-xl border text-lg font-bold transition-all
        ${isActive ? 'border-foreground ring-2 ring-foreground/20' : 'border-border bg-muted/40'}
      `}
    >
      {char ?? <span className="text-muted-foreground/30">·</span>}
      {hasFakeCaret && (
        <span className="absolute w-px h-5 bg-foreground animate-caret-blink" />
      )}
    </div>
  )
}

interface Props {
  lang: 'fr' | 'en'
}

type Step = 'email' | 'otp'

export default function EmailSignIn({ lang }: Props) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  const sendCode = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t('Adresse email invalide', 'Invalid email address'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? t("Erreur lors de l'envoi, réessaie.", 'Failed to send, please retry.'))
        return
      }
      setEmail(trimmed)
      setStep('otp')
    } catch {
      setError(t("Erreur lors de l'envoi, réessaie.", 'Failed to send, please retry.'))
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (code: string) => {
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      const result = await signIn('email-otp', {
        email,
        code,
        redirect: false,
      })
      if (result?.error) {
        setError(t('Code incorrect ou expiré.', 'Incorrect or expired code.'))
        setOtp('')
      } else {
        window.location.reload()
      }
    } catch {
      setError(t('Une erreur est survenue.', 'An error occurred.'))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setStep('email'); setOtp(''); setError('') }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="text-sm text-muted-foreground flex-1">
            {t('Code envoyé à', 'Code sent to')} <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>
        <div className="flex justify-center">
          <OTPInput
            maxLength={6}
            value={otp}
            onChange={setOtp}
            onComplete={verifyCode}
            render={({ slots }) => (
              <div className="flex gap-2">
                {slots.map((slot, i) => <Slot key={i} {...slot} />)}
              </div>
            )}
          />
        </div>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        {loading && (
          <div className="flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <button
          onClick={() => sendCode()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          {t('Renvoyer le code', 'Resend code')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 w-full">
      <input
        ref={inputRef}
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        onKeyDown={e => e.key === 'Enter' && sendCode()}
        placeholder={t('ton@email.com', 'your@email.com')}
        className="flex-1 h-11 px-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/30 transition-colors"
        style={{ fontSize: '16px' }}
        autoComplete="email"
        disabled={loading}
      />
      <button
        onClick={sendCode}
        disabled={loading || !email.trim()}
        className="h-11 w-11 flex items-center justify-center rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 flex-shrink-0"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
      </button>
      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </div>
  )
}
