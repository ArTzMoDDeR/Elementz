'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// RecipeMap keyed by "n1|n2" number strings — matches use-game-store
type RecipeMap = Map<string, number[]>

export interface HintResult {
  /** DB element number of the element to discover */
  result: number
  ing1: number
  ing2: number
}

function findHint(discovered: Set<number>, recipeMap: RecipeMap): HintResult | null {
  const discoveredArr = [...discovered]
  const candidates: HintResult[] = []

  for (let i = 0; i < discoveredArr.length; i++) {
    for (let j = i; j < discoveredArr.length; j++) {
      const a = discoveredArr[i]
      const b = discoveredArr[j]
      const results = recipeMap.get(`${a}|${b}`) || []
      for (const res of results) {
        if (!discovered.has(res)) {
          candidates.push({ result: res, ing1: a, ing2: b })
        }
      }
    }
  }

  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

const HINTS_KEY = 'elementz_hints'
const PULSE_DELAY = 60 * 1000 // 1 minute without discovery → pulse
const AD_UNLOCK_KEY = 'elementz_hint_ad_unlock'
const AD_UNLOCK_DURATION = 5 * 60 * 1000 // 5 minutes free hints after watching ad

export function useHint(
  discovered: Set<number>,
  recipeMap: RecipeMap,
  lastUnlockTime: number,
  lang: 'fr' | 'en',
) {
  const [hintsEnabled, setHintsEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HINTS_KEY) ?? 'true') as boolean } catch { return true }
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === HINTS_KEY && e.newValue !== null) {
        try { setHintsEnabled(JSON.parse(e.newValue) as boolean) } catch {}
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const [currentHint, setCurrentHint] = useState<HintResult | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [shouldPulse, setShouldPulse] = useState(false)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ad unlock state — timestamp until which hints are unlocked for free
  const [adUnlockedUntil, setAdUnlockedUntil] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(AD_UNLOCK_KEY) ?? '0', 10) } catch { return 0 }
  })
  // Whether the ad modal should be shown
  const [showAdModal, setShowAdModal] = useState(false)

  const isAdUnlocked = adUnlockedUntil > Date.now()

  // Persist ad unlock time
  useEffect(() => {
    try { localStorage.setItem(AD_UNLOCK_KEY, String(adUnlockedUntil)) } catch {}
  }, [adUnlockedUntil])

  // Pulse timer
  useEffect(() => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    setShouldPulse(false)

    const base = lastUnlockTime > 0 ? lastUnlockTime : Date.now()
    const elapsed = Date.now() - base
    const remaining = Math.max(0, PULSE_DELAY - elapsed)

    pulseTimerRef.current = setTimeout(() => {
      setShouldPulse(true)
    }, remaining)

    return () => { if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current) }
  }, [lastUnlockTime])

  const dismissHint = useCallback(() => setHintVisible(false), [])

  // Called when the user clicks the hint button.
  // If hints are unlocked (ad watched), show hint directly.
  // Otherwise show the ad modal.
  const requestHint = useCallback(() => {
    setShouldPulse(false)
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)

    if (adUnlockedUntil > Date.now()) {
      // Already unlocked — show hint
      const hint = findHint(discovered, recipeMap)
      if (hint) { setCurrentHint(hint); setHintVisible(true) }
    } else {
      // Need to watch ad first
      setShowAdModal(true)
    }
  }, [discovered, recipeMap, adUnlockedUntil])

  // Called by the ad modal when the user has finished watching the ad
  const onAdComplete = useCallback(() => {
    setShowAdModal(false)
    const until = Date.now() + AD_UNLOCK_DURATION
    setAdUnlockedUntil(until)
    // Immediately show hint
    const hint = findHint(discovered, recipeMap)
    if (hint) { setCurrentHint(hint); setHintVisible(true) }
  }, [discovered, recipeMap])

  const onAdDismiss = useCallback(() => {
    setShowAdModal(false)
  }, [])

  const hintLabel = currentHint
    ? lang === 'fr' ? 'Essayez de créer' : 'Try to create'
    : null

  // Remaining unlock time in seconds (for display)
  const adUnlockRemainingMs = Math.max(0, adUnlockedUntil - Date.now())

  return {
    hintsEnabled,
    setHintsEnabled,
    hintVisible,
    currentHint,
    hintLabel,
    dismissHint,
    requestHint,
    shouldPulse,
    showAdModal,
    onAdComplete,
    onAdDismiss,
    isAdUnlocked,
    adUnlockRemainingMs,
  }
}
