'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { parseRecipes, findRecipe, buildRecipeMap, type ElementDef } from '@/lib/game-data'
import { RAW_RECIPES } from '@/lib/recipes-raw'

const STORAGE_KEY = 'alchemy-discovered'
const BASE_ELEMENTS = ['eau', 'feu', 'terre', 'air']

export interface PlaygroundItem {
  id: string
  element: string
  x: number
  y: number
}

// Parse once at module level - no async needed
const parsed = parseRecipes(RAW_RECIPES)
let ALL_ELEMENTS = parsed.elements
const RECIPE_MAP = buildRecipeMap(parsed.recipes)

export function useGameStore() {
  const [elements, setElements] = useState<Map<string, ElementDef>>(ALL_ELEMENTS)
  const [discovered, setDiscovered] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set(BASE_ELEMENTS)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const arr = JSON.parse(saved) as string[]
        const disc = new Set(arr)
        BASE_ELEMENTS.forEach(e => disc.add(e))
        return disc
      }
    } catch { /* ignore */ }
    return new Set(BASE_ELEMENTS)
  })
  const [playground, setPlayground] = useState<PlaygroundItem[]>([])
  const [newlyDiscovered, setNewlyDiscovered] = useState<string | null>(null)
  const idCounter = useRef(0)

  // Load images from database
  useEffect(() => {
    fetch('/api/elements')
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        // Check if response is an error object or array
        if (!Array.isArray(data)) {
          console.warn('[v0] Database not configured or error from API')
          return
        }
        
        const updatedElements = new Map(ALL_ELEMENTS)
        let updated = 0
        data.forEach((dbEl: { name: string; image_url: string | null }) => {
          const existing = updatedElements.get(dbEl.name)
          if (existing && dbEl.image_url) {
            updatedElements.set(dbEl.name, { ...existing, imageUrl: dbEl.image_url })
            updated++
          }
        })
        
        if (updated > 0) {
          setElements(updatedElements)
          ALL_ELEMENTS = updatedElements
        }
      })
      .catch(() => {
        // Silently fail if database not configured
      })
  }, [])

  // Save progress whenever discovered changes
  useEffect(() => {
    if (discovered.size > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...discovered]))
      } catch { /* Storage full or unavailable */ }
    }
  }, [discovered])

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

    const result = findRecipe(RECIPE_MAP, item1.element, item2.element)
    if (result) {
      const midX = (item1.x + item2.x) / 2
      const midY = (item1.y + item2.y) / 2
      const newId = generateId()

      setPlayground(prev => [
        ...prev.filter(i => i.id !== id1 && i.id !== id2),
        { id: newId, element: result, x: midX, y: midY }
      ])

      if (!discovered.has(result)) {
        setDiscovered(prev => new Set([...prev, result]))
        setNewlyDiscovered(result)
        setTimeout(() => setNewlyDiscovered(null), 2500)
      }
      return result
    }
    return null
  }, [playground, discovered, generateId])

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
    initialized: true,
    totalElements: elements.size,
    addToPlayground,
    moveOnPlayground,
    removeFromPlayground,
    clearPlayground,
    tryMerge,
    resetProgress,
  }
}
