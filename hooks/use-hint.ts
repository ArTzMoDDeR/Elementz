'use client'

import { useState, useEffect, useCallback } from 'react'

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

  // Whether the ad modal should be shown (1 ad = 1 hint)
  const [showAdModal, setShowAdModal] = useState(false)

  const isAdUnlocked = false // always requires an ad — kept for badge UI compat

  const dismissHint = useCallback(() => setHintVisible(false), [])

  // Called when the user clicks the hint button.
  // If hints are unlocked (ad watched), show hint directly.
  // Otherwise show the ad modal.
  // Always show the ad modal first — 1 ad = 1 hint
  const requestHint = useCallback(() => {
    // Pre-compute the hint so the modal can display it after the ad
    const hint = findHint(discovered, recipeMap)
    if (hint) {
      setCurrentHint(hint)
      setShowAdModal(true)
    }
  }, [discovered, recipeMap])

  // Called by the ad modal when the user finishes watching (or skips after delay)
  const onAdComplete = useCallback(() => {
    setShowAdModal(false)
    setHintVisible(true)
  }, [])

  const onAdDismiss = useCallback(() => {
    setShowAdModal(false)
    setCurrentHint(null)
  }, [])

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
    shouldPulse: false,
    showAdModal,
    onAdComplete,
    onAdDismiss,
    isAdUnlocked,
  }
}
