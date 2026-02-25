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
  // Collect all possible combos with at least one undiscovered result
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
  // Pick a random one so repeated hints vary
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function useHint(
  discovered: Set<string>,
  recipeMap: RecipeMap,
  lastUnlockTime: number,
  lang: 'fr' | 'en',
) {
  const [hintsEnabled, setHintsEnabled] = useState(true)
  const [currentHint, setCurrentHint] = useState<HintResult | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  // Track the lastUnlockTime at which the current hint was generated
  // so switching lang doesn't generate a new hint
  const hintGeneratedAtRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const HINT_DELAY = 2 * 60 * 1000 // 2 minutes

  // Auto-trigger hint after 2min of no unlock
  useEffect(() => {
    if (!hintsEnabled) return
    if (timerRef.current) clearTimeout(timerRef.current)

    const elapsed = Date.now() - lastUnlockTime
    const remaining = Math.max(0, HINT_DELAY - elapsed)

    timerRef.current = setTimeout(() => {
      // Only show a new auto-hint if we haven't already shown one for this unlock period
      if (hintGeneratedAtRef.current === lastUnlockTime) return
      const hint = findHint(discovered, recipeMap)
      if (hint) {
        hintGeneratedAtRef.current = lastUnlockTime
        setCurrentHint(hint)
        setHintVisible(true)
      }
    }, remaining)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [lastUnlockTime, hintsEnabled]) // deliberately NOT depending on discovered/recipeMap to avoid re-triggering on lang switch

  const dismissHint = useCallback(() => setHintVisible(false), [])

  const requestHint = useCallback(() => {
    // Manual request: pick a new random hint but don't update hintGeneratedAtRef
    // so the auto-timer still respects the 2min window
    const hint = findHint(discovered, recipeMap)
    if (hint) {
      setCurrentHint(hint)
      setHintVisible(true)
    }
  }, [discovered, recipeMap])

  // Text is derived from currentHint + lang — switching lang just retranslates, doesn't generate a new hint
  const hintLabel = currentHint
    ? lang === 'fr'
      ? 'Essayez de créer'
      : 'Try to create'
    : null

  return {
    hintsEnabled,
    setHintsEnabled,
    hintVisible,
    currentHint,
    hintLabel,
    dismissHint,
    requestHint,
  }
}
