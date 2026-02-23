'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { parseRecipes, findRecipe, buildRecipeMap, type ElementDef } from '@/lib/game-data'

const STORAGE_KEY = 'alchemy-discovered'
const BASE_ELEMENTS = ['eau', 'feu', 'terre', 'air']

export interface PlaygroundItem {
  id: string
  element: string
  x: number
  y: number
}

export function useGameStore() {
  const [elements, setElements] = useState<Map<string, ElementDef>>(new Map())
  const [recipeMap, setRecipeMap] = useState<Map<string, string>>(new Map())
  const [discovered, setDiscovered] = useState<Set<string>>(new Set())
  const [playground, setPlayground] = useState<PlaygroundItem[]>([])
  const [newlyDiscovered, setNewlyDiscovered] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const idCounter = useRef(0)
  const [totalCount, setTotalCount] = useState(0)

  // Load recipes and saved state
  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.text())
      .then(text => {
        const { elements: els, recipes: recs } = parseRecipes(text)
        setElements(els)
        setRecipeMap(buildRecipeMap(recs))
        setTotalCount(els.size)

        // Load saved progress from localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const parsed = JSON.parse(saved) as string[]
            const disc = new Set(parsed)
            BASE_ELEMENTS.forEach(e => disc.add(e))
            setDiscovered(disc)
          } else {
            setDiscovered(new Set(BASE_ELEMENTS))
          }
        } catch {
          setDiscovered(new Set(BASE_ELEMENTS))
        }
        setInitialized(true)
      })
  }, [])

  // Save progress whenever discovered changes
  useEffect(() => {
    if (initialized && discovered.size > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...discovered]))
      } catch {
        // Storage full or unavailable
      }
    }
  }, [discovered, initialized])

  const generateId = useCallback(() => {
    idCounter.current += 1
    return `item-${Date.now()}-${idCounter.current}`
  }, [])

  const addToPlayground = useCallback((element: string, x: number, y: number) => {
    const id = generateId()
    setPlayground(prev => [...prev, { id, element, x, y }])
    return id
  }, [generateId])

  const moveOnPlayground = useCallback((id: string, x: number, y: number) => {
    setPlayground(prev => prev.map(item =>
      item.id === id ? { ...item, x, y } : item
    ))
  }, [])

  const removeFromPlayground = useCallback((id: string) => {
    setPlayground(prev => prev.filter(item => item.id !== id))
  }, [])

  const clearPlayground = useCallback(() => {
    setPlayground([])
  }, [])

  const tryMerge = useCallback((id1: string, id2: string): string | null => {
    const item1 = playground.find(i => i.id === id1)
    const item2 = playground.find(i => i.id === id2)
    if (!item1 || !item2) return null

    const result = findRecipe(recipeMap, item1.element, item2.element)
    if (result) {
      // Remove both items and add result at midpoint
      const midX = (item1.x + item2.x) / 2
      const midY = (item1.y + item2.y) / 2
      const newId = generateId()

      setPlayground(prev => [
        ...prev.filter(i => i.id !== id1 && i.id !== id2),
        { id: newId, element: result, x: midX, y: midY }
      ])

      // Discover new element
      if (!discovered.has(result)) {
        setDiscovered(prev => new Set([...prev, result]))
        setNewlyDiscovered(result)
        setTimeout(() => setNewlyDiscovered(null), 2500)
      }
      return result
    }
    return null
  }, [playground, recipeMap, discovered, generateId])

  const resetProgress = useCallback(() => {
    setDiscovered(new Set(BASE_ELEMENTS))
    setPlayground([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    elements,
    discovered,
    playground,
    newlyDiscovered,
    initialized,
    totalElements: totalCount,
    addToPlayground,
    moveOnPlayground,
    removeFromPlayground,
    clearPlayground,
    tryMerge,
    resetProgress,
  }
}
