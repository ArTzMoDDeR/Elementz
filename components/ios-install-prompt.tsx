'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'elementz_ios_prompt_dismissed'

const STEPS = [
  { icon: <ShareIcon />, label: 'Tap', bold: 'Share' },
  { icon: <PlusSquareIcon />, label: 'Tap', bold: 'Add to Home Screen' },
  { icon: <AppIcon />, label: 'Tap', bold: 'Add' },
]

export function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as Navigator & { standalone: boolean }).standalone === true)
    const isDismissed = !!localStorage.getItem(DISMISSED_KEY)

    if (isIOS && isSafari && !isStandalone && !isDismissed) {
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
      <div
        className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm"
        style={{ opacity: animating ? 1 : 0, transition: 'opacity 300ms ease' }}
        onClick={dismiss}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-[1000] bg-[#1c1c1e] rounded-t-3xl shadow-2xl"
        style={{
          transform: animating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 340ms cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between px-5 pt-1 pb-5">
          <div className="flex items-center gap-3">
            <img src="/apple-icon.png" alt="Elementz" className="w-11 h-11 rounded-2xl" />
            <p className="text-white font-semibold text-lg">Add to Home Screen</p>
          </div>
          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 steps horizontal */}
        <div className="flex items-start justify-around px-4 pb-7 gap-2">
          {STEPS.map((step, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center text-white/70">
                {step.icon}
              </div>
              <p className="text-white/50 text-sm leading-snug">
                {step.label} <span className="text-white font-medium">{step.bold}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function ShareIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function PlusSquareIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function AppIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
