'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type RecipeMap = Map<string, string[]>

interface HintResult {
  result: string
  ing1: string
  ing2: string
}

function findHint(discovered: Set<string>, recipeMap: RecipeMap): HintResult | null {
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

export function useHint(
  discovered: Set<string>,
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
  // Whether the hint button should pulse to attract attention
  const [shouldPulse, setShouldPulse] = useState(false)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Start a 1-minute timer whenever a new discovery happens.
  // After 1 min without a new discovery, activate pulse on the hint button.
  useEffect(() => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    setShouldPulse(false) // reset on new discovery

    const elapsed = Date.now() - lastUnlockTime
    const remaining = Math.max(0, PULSE_DELAY - elapsed)

    pulseTimerRef.current = setTimeout(() => {
      setShouldPulse(true)
    }, remaining)

    return () => { if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current) }
  }, [lastUnlockTime])

  const dismissHint = useCallback(() => setHintVisible(false), [])

  const requestHint = useCallback(() => {
    const hint = findHint(discovered, recipeMap)
    if (hint) {
      setCurrentHint(hint)
      setHintVisible(true)
    }
    // Stop pulsing once the user manually asked for a hint
    setShouldPulse(false)
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
  }, [discovered, recipeMap])

  const hintLabel = currentHint
    ? lang === 'fr' ? 'Essayez de créer' : 'Try to create'
    : null

  return {
    hintsEnabled,
    setHintsEnabled,
    hintVisible,
    currentHint,
    hintLabel,
    dismissHint,
    requestHint,
    shouldPulse,
  }
}
