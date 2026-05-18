'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'
import { OTPInput, SlotProps } from 'input-otp'
import { createPortal } from 'react-dom'

function Slot({ char, isActive, hasFakeCaret }: SlotProps) {
  return (
    <div
      className={`relative w-12 h-14 flex items-center justify-center rounded-2xl border-2 text-xl font-bold transition-all
        ${isActive
          ? 'border-foreground bg-foreground/5 shadow-[0_0_0_4px_oklch(var(--foreground)/0.08)]'
          : char
            ? 'border-foreground/40 bg-foreground/5'
            : 'border-border bg-muted/30'
        }
      `}
    >
      {char ?? <span className="text-muted-foreground/25">·</span>}
      {hasFakeCaret && (
        <span className="absolute w-0.5 h-6 bg-foreground animate-caret-blink rounded-full" />
      )}
    </div>
  )
}

interface Props {
  lang: 'fr' | 'en'
}

export default function EmailSignIn({ lang }: Props) {
  const [email, setEmail] = useState('')
  const [otpOpen, setOtpOpen] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  // Mount portal after hydration
  if (typeof window !== 'undefined' && !mounted) setMounted(true)

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
        setError(data?.error ?? t("Erreur lors de l'envoi, r\u00e9essaie.", 'Failed to send, please retry.'))
        return
      }
      setEmail(trimmed)
      setOtpOpen(true)
    } catch {
      setError(t("Erreur lors de l'envoi, r\u00e9essaie.", 'Failed to send, please retry.'))
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
        setError(t('Code incorrect ou expir\u00e9.', 'Incorrect or expired code.'))
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

  const closeOtp = () => {
    setOtpOpen(false)
    setOtp('')
    setError('')
  }

  const otpOverlay = otpOpen && mounted ? createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <button
          onClick={closeOtp}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-foreground/8 border border-border flex items-center justify-center">
            <Mail className="w-7 h-7 text-foreground/60" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('V\u00e9rifie tes emails', 'Check your inbox')}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('Code envoy\u00e9 \u00e0', 'Code sent to')}{' '}
            <span className="text-foreground font-semibold">{email}</span>
          </p>
        </div>

        {/* OTP slots */}
        <div className="flex flex-col items-center gap-4 w-full">
          <OTPInput
            maxLength={6}
            value={otp}
            onChange={setOtp}
            onComplete={verifyCode}
            disabled={loading}
            render={({ slots }) => (
              <div className="flex gap-2.5">
                {slots.map((slot, i) => <Slot key={i} {...slot} />)}
              </div>
            )}
          />

          {error && (
            <p className="text-sm text-red-400 text-center font-medium">{error}</p>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('V\u00e9rification...', 'Verifying...')}</span>
            </div>
          )}
        </div>

        {/* Resend */}
        <button
          onClick={sendCode}
          disabled={loading}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {t('Renvoyer le code', 'Resend code')}
        </button>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      {/* Email step — inline, prominent */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex gap-2 w-full">
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && sendCode()}
            placeholder={t('ton@email.com', 'your@email.com')}
            className="flex-1 h-13 px-4 rounded-2xl bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/40 focus:bg-muted/80 transition-all"
            style={{ fontSize: '16px', height: 52 }}
            autoComplete="email"
            disabled={loading}
          />
          <button
            onClick={sendCode}
            disabled={loading || !email.trim()}
            className="h-13 px-4 flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40 flex-shrink-0"
            style={{ height: 52 }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Mail className="w-4 h-4" /><span className="hidden sm:inline ml-1">{t('Envoyer', 'Send')}</span></>
            }
          </button>
        </div>
        {error && <p className="text-xs text-red-400 pl-1">{error}</p>}
        <p className="text-xs text-muted-foreground/50 text-center">
          {t('Sans mot de passe \u2014 on t\u2019envoie un code \u00e0 usage unique', 'No password \u2014 we send you a one-time code')}
        </p>
      </div>

      {/* OTP fullscreen overlay via portal */}
      {otpOverlay}
    </>
  )
}
