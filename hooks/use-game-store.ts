'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { type ElementDef } from '@/lib/game-data'

const STORAGE_KEY = 'alchemy-discovered-v2'
const BASE_ELEMENTS = ['eau', 'feu', 'terre', 'air']

export interface PlaygroundItem {
  id: string
  element: string
  x: number
  y: number
}

type RecipeMap = Map<string, string>

function buildRecipeMap(recipes: Array<{ ingredient1: string; ingredient2: string; result: string }>): RecipeMap {
  const map = new Map<string, string>()
  for (const r of recipes) {
    map.set(`${r.ingredient1}|${r.ingredient2}`, r.result)
    map.set(`${r.ingredient2}|${r.ingredient1}`, r.result)
  }
  return map
}

function findRecipe(map: RecipeMap, a: string, b: string): string | null {
  return map.get(`${a}|${b}`) || null
}

function makeElement(name: string, img?: string | null): ElementDef {
  const colors: Record<string, string> = {
    eau: '#3B82F6', feu: '#EF4444', terre: '#A16207', air: '#06B6D4',
  }
  return {
    name,
    icon: name.substring(0, 2).toUpperCase(),
    color: colors[name.toLowerCase()] || '#8B5CF6',
    category: 'base',
    imageUrl: img ?? null,
  }
}

export function useGameStore() {
  const [elements, setElements] = useState<Map<string, ElementDef>>(new Map())
  const [recipeMap, setRecipeMap] = useState<RecipeMap>(new Map())
  const [discovered, setDiscovered] = useState<Set<string>>(new Set())
  const [playground, setPlayground] = useState<PlaygroundItem[]>([])
  const [newlyDiscovered, setNewlyDiscovered] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const idCounter = useRef(0)

  // Load everything from DB
  useEffect(() => {
    Promise.all([
      fetch('/api/elements').then(r => r.json()),
      fetch('/api/recipes').then(r => r.json()).catch(() => []),
    ]).then(([elementsData, recipesData]) => {
      // Build elements map from DB
      const elMap = new Map<string, ElementDef>()
      if (Array.isArray(elementsData)) {
        elementsData.forEach((el: { name_french: string; name_english: string; img: string | null; number: number }) => {
          const name = el.name_french || el.name_english
          elMap.set(name, {
            name,
            icon: name.substring(0, 2).toUpperCase(),
            color: getColor(name),
            category: 'base',
            imageUrl: el.img ?? null,
          })
        })
      }

      // Fallback: ensure base elements always exist
      BASE_ELEMENTS.forEach(base => {
        if (!elMap.has(base)) {
          elMap.set(base, makeElement(base))
        }
      })

      setElements(elMap)

      // Build recipe map
      if (Array.isArray(recipesData) && recipesData.length > 0) {
        setRecipeMap(buildRecipeMap(recipesData))
      } else {
        // Fallback: load from local recipes
        import('@/lib/game-data').then(({ parseRecipes, buildRecipeMap: bRM }) => {
          import('@/lib/recipes-raw').then(({ RAW_RECIPES }) => {
            const parsed = parseRecipes(RAW_RECIPES)
            const localRM = bRM(parsed.recipes)
            setRecipeMap(localRM)
            // Also fill in missing elements from local data
            setElements(prev => {
              const merged = new Map(prev)
              parsed.elements.forEach((el, name) => {
                if (!merged.has(name)) merged.set(name, el)
              })
              return merged
            })
          })
        })
      }

      // Load saved progress
      const savedDisc = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const arr = JSON.parse(saved) as string[]
            return new Set(arr)
          }
        } catch {}
        return new Set<string>()
      })()

      // Only keep discovered elements that exist in the DB
      const validDisc = new Set<string>(BASE_ELEMENTS)
      savedDisc.forEach(name => {
        if (elMap.has(name)) validDisc.add(name)
      })

      setDiscovered(validDisc)
      setInitialized(true)
    }).catch(() => {
      // Fallback to local data
      import('@/lib/game-data').then(({ parseRecipes, buildRecipeMap: bRM }) => {
        import('@/lib/recipes-raw').then(({ RAW_RECIPES }) => {
          const parsed = parseRecipes(RAW_RECIPES)
          setElements(parsed.elements)
          setRecipeMap(bRM(parsed.recipes))
          setDiscovered(new Set(BASE_ELEMENTS))
          setInitialized(true)
        })
      })
    })
  }, [])

  // Save progress
  useEffect(() => {
    if (initialized && discovered.size > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...discovered]))
      } catch {}
    }
  }, [discovered, initialized])

  const generateId = useCallback(() => {
    idCounter.current += 1
    return `item-${Date.now()}-${idCounter.current}`
  }, [])

  const addToPlayground = useCallback((element: string, x: number, y: number): string => {
    const id = generateId()
    setPlayground(prev => [...prev, { id, element, x, y }])
    return id
  }, [generateId])

  const moveOnPlayground = useCallback((id: string, x: number, y: number) => {
    setPlayground(prev => prev.map(item => item.id === id ? { ...item, x, y } : item))
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
  }, [playground, discovered, recipeMap, generateId])

  const dropAndMerge = useCallback((element: string, x: number, y: number, targetId: string): string | null => {
    const target = playground.find(i => i.id === targetId)
    if (!target) return null
    const result = findRecipe(recipeMap, element, target.element)
    if (result) {
      const newId = generateId()
      setPlayground(prev => [
        ...prev.filter(i => i.id !== targetId),
        { id: newId, element: result, x: (x + target.x) / 2, y: (y + target.y) / 2 }
      ])
      if (!discovered.has(result)) {
        setDiscovered(prev => new Set([...prev, result]))
        setNewlyDiscovered(result)
        setTimeout(() => setNewlyDiscovered(null), 2500)
      }
      return result
    }
    return null
  }, [playground, discovered, recipeMap, generateId])

  const resetProgress = useCallback(() => {
    setDiscovered(new Set(BASE_ELEMENTS))
    setPlayground([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  return {
    elements,
    discovered,
    playground,
    newlyDiscovered,
    initialized,
    totalElements: elements.size,
    addToPlayground,
    moveOnPlayground,
    removeFromPlayground,
    clearPlayground,
    tryMerge,
    dropAndMerge,
    resetProgress,
  }
}

function getColor(name: string): string {
  const n = name.toLowerCase()
  const map: Record<string, string> = {
    eau: '#3B82F6', feu: '#EF4444', terre: '#A16207', air: '#06B6D4',
  }
  if (map[n]) return map[n]
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const colors = ['#6366F1','#8B5CF6','#EC4899','#14B8A6','#F97316','#22C55E','#EAB308','#06B6D4']
  return colors[hash % colors.length]
}
