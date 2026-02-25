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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const HINT_DELAY = 2 * 60 * 1000 // 2 minutes

  // Auto-trigger hint after 2min of no unlock
  useEffect(() => {
    if (!hintsEnabled) return
    if (timerRef.current) clearTimeout(timerRef.current)

    const elapsed = Date.now() - lastUnlockTime
    const remaining = Math.max(0, HINT_DELAY - elapsed)

    timerRef.current = setTimeout(() => {
      const hint = findHint(discovered, recipeMap)
      if (hint) {
        setCurrentHint(hint)
        setHintVisible(true)
      }
    }, remaining)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [lastUnlockTime, hintsEnabled, discovered, recipeMap])

  const dismissHint = useCallback(() => setHintVisible(false), [])

  const requestHint = useCallback(() => {
    const hint = findHint(discovered, recipeMap)
    if (hint) {
      setCurrentHint(hint)
      setHintVisible(true)
    }
  }, [discovered, recipeMap])

  const hintText = currentHint
    ? lang === 'fr'
      ? `Essayez de créer "${currentHint.result}"`
      : `Try to create "${currentHint.result}"`
    : null

  return {
    hintsEnabled,
    setHintsEnabled,
    hintVisible,
    hintText,
    dismissHint,
    requestHint,
  }
}
