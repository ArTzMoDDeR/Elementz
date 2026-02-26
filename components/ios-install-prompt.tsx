'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'elementz_ios_prompt_dismissed'

export function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    // Only on iOS Safari, not already installed (standalone), not dismissed
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as Navigator & { standalone: boolean }).standalone === true)
    const isDismissed = !!localStorage.getItem(DISMISSED_KEY)

    if (isIOS && isSafari && !isStandalone && !isDismissed) {
      // Small delay so it doesn't feel jarring on first load
      const t = setTimeout(() => {
        setVisible(true)
        requestAnimationFrame(() => setAnimating(true))
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = () => {
    setAnimating(false)
    setTimeout(() => {
      setVisible(false)
      localStorage.setItem(DISMISSED_KEY, '1')
    }, 300)
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm"
        style={{ opacity: animating ? 1 : 0, transition: 'opacity 300ms ease' }}
        onClick={dismiss}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[1000] bg-[#1c1c1e] rounded-t-2xl shadow-2xl"
        style={{
          transform: animating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <img src="/apple-icon.png" alt="Elementz" className="w-12 h-12 rounded-2xl shadow-md" />
            <div>
              <p className="text-white font-semibold text-base leading-tight">Add to Home Screen</p>
              <p className="text-white/50 text-sm">elementz.fun</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 mx-5" />

        {/* Steps */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <Step number={1} icon={<ShareIcon />}>
            Tap the <span className="text-white font-medium">Share</span> button at the bottom of your browser
          </Step>
          <Step number={2} icon={<ScrollIcon />}>
            Scroll down in the share menu
          </Step>
          <Step number={3} icon={<PlusSquareIcon />}>
            Tap <span className="text-white font-medium">"Add to Home Screen"</span>
          </Step>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/30 text-xs pb-5 px-5">
          Play Elementz like a native app — no browser UI
        </p>
      </div>
    </>
  )
}

function Step({ number, icon, children }: { number: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0 text-white/40">
        {icon}
      </div>
      <div className="flex items-start gap-2">
        <span className="text-white/30 text-sm font-medium w-4 flex-shrink-0">{number}.</span>
        <p className="text-white/60 text-sm leading-snug">{children}</p>
      </div>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function ScrollIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 13 12 18 17 13" />
      <polyline points="7 6 12 11 17 6" />
    </svg>
  )
}

function PlusSquareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}
