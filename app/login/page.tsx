'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Dot grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, oklch(0.55 0.01 250 / 0.2) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 w-full max-w-[380px] flex flex-col items-center gap-10">

        {/* Logo + branding */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-30 scale-110" style={{ background: 'radial-gradient(circle, #3fc, #3af, #f80)' }} />
            <img
              src="/logo.png"
              alt="Elementz"
              className="relative w-24 h-24 rounded-full shadow-2xl"
            />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Elementz</h1>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              Combine elements.<br />Discover the world.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">

          {/* Google button */}
          <div className="p-5 pb-3">
            <button
              onClick={() => {
                setLoading(true)
                signIn('google', { callbackUrl: '/' })
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-foreground text-background font-semibold text-sm hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-5 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Guest button */}
          <div className="px-5 pt-3 pb-5">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium text-sm transition-colors"
            >
              Play without account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Footer note */}
          <div className="border-t border-border px-5 py-3 bg-muted/20">
            <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed">
              Without an account, your progress won't be saved between sessions.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
