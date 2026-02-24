'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { type ElementDef } from '@/lib/game-data'

const STORAGE_KEY = 'alchemy-discovered-v3'
const LANG_KEY = 'alchemy-lang'

// Base element names in both languages — must match DB exactly
const BASE_ELEMENTS_FR = ['eau', 'feu', 'terre', 'air']
const BASE_ELEMENTS_EN = ['water', 'fire', 'earth', 'air']

export type Lang = 'fr' | 'en'

export interface PlaygroundItem {
  id: string
  element: string  // always the key (name in current lang)
  x: number
  y: number
}

// RecipeMap: key = "a|b", value = array of result names (supports multi-result combos)
type RecipeMap = Map<string, string[]>

type RecipeRow = {
  ingredient1: string
  ingredient2: string
  result: string
  ingredient1_en?: string
  ingredient2_en?: string
  result_en?: string
}

function buildRecipeMap(recipes: RecipeRow[], lang: Lang): RecipeMap {
  const map = new Map<string, string[]>()
  const add = (key: string, val: string) => {
    const arr = map.get(key)
    if (arr) { if (!arr.includes(val)) arr.push(val) }
    else map.set(key, [val])
  }
  for (const r of recipes) {
    const a = lang === 'en' ? (r.ingredient1_en || r.ingredient1) : r.ingredient1
    const b = lang === 'en' ? (r.ingredient2_en || r.ingredient2) : r.ingredient2
    const res = lang === 'en' ? (r.result_en || r.result) : r.result
    add(`${a}|${b}`, res)
    add(`${b}|${a}`, res)
  }
  return map
}

function findRecipes(map: RecipeMap, a: string, b: string): string[] {
  return map.get(`${a}|${b}`) || []
}

function getColor(name: string): string {
  const n = name.toLowerCase()
  const colorMap: Record<string, string> = {
    eau: '#3B82F6', water: '#3B82F6',
    feu: '#EF4444', fire: '#EF4444',
    terre: '#A16207', earth: '#A16207',
    air: '#06B6D4',
  }
  if (colorMap[n]) return colorMap[n]
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const colors = ['#6366F1','#8B5CF6','#EC4899','#14B8A6','#F97316','#22C55E','#EAB308','#06B6D4','#F43F5E','#84CC16']
  return colors[hash % colors.length]
}

function buildElementMap(
  rows: Array<{ number: number; name_french: string; name_english: string; img: string | null }>,
  lang: Lang
): Map<string, ElementDef> {
  const map = new Map<string, ElementDef>()
  for (const row of rows) {
    const name = lang === 'fr' ? (row.name_french || row.name_english) : (row.name_english || row.name_french)
    if (!name) continue
    map.set(name, {
      name,
      icon: name.substring(0, 2).toUpperCase(),
      color: getColor(name),
      category: 'base',
      imageUrl: row.img ?? null,
    })
  }
  return map
}


export function useGameStore() {
  const [lang, setLangState] = useState<Lang>('fr')
  const [dbRows, setDbRows] = useState<Array<{ number: number; name_french: string; name_english: string; img: string | null }>>([])
  const [dbRecipes, setDbRecipes] = useState<RecipeRow[]>([])
  const [elements, setElements] = useState<Map<string, ElementDef>>(new Map())
  const [recipeMap, setRecipeMap] = useState<RecipeMap>(new Map())
  const [discovered, setDiscovered] = useState<Set<string>>(new Set())
  const [playground, setPlayground] = useState<PlaygroundItem[]>([])
  const [newlyDiscovered, setNewlyDiscovered] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [totalDbCount, setTotalDbCount] = useState(0)
  const idCounter = useRef(0)

  // Load lang from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null
      if (saved === 'fr' || saved === 'en') setLangState(saved)
    } catch {}
  }, [])

  // Load everything from DB once
  useEffect(() => {
    Promise.all([
      fetch('/api/elements').then(r => { console.log('[v0] elements status:', r.status); return r.json() }),
      fetch('/api/recipes').then(r => { console.log('[v0] recipes status:', r.status); return r.json() }).catch(() => []),
    ]).then(([elementsData, recipesData]) => {
      console.log('[v0] elementsData type:', typeof elementsData, 'isArray:', Array.isArray(elementsData), 'length:', Array.isArray(elementsData) ? elementsData.length : 'N/A')
      console.log('[v0] recipesData type:', typeof recipesData, 'isArray:', Array.isArray(recipesData), 'length:', Array.isArray(recipesData) ? recipesData.length : 'N/A')
      
      const rows: Array<{ number: number; name_french: string; name_english: string; img: string | null }> =
        Array.isArray(elementsData) ? elementsData : []

      setDbRows(rows)
      setTotalDbCount(rows.length)
      console.log('[v0] totalDbCount set to:', rows.length)

      const recipes: RecipeRow[] = Array.isArray(recipesData) ? recipesData : []
      setDbRecipes(recipes)

      // Build initial element map using saved lang
      const savedLang = (() => {
        try { return (localStorage.getItem(LANG_KEY) as Lang | null) || 'fr' } catch { return 'fr' }
      })()
      const elMap = buildElementMap(rows, savedLang)
      setElements(elMap)
      setRecipeMap(buildRecipeMap(recipes, savedLang))

      // Load discovered progress
      const baseElements = savedLang === 'fr' ? BASE_ELEMENTS_FR : BASE_ELEMENTS_EN
      const savedDisc = (() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) return new Set(JSON.parse(saved) as string[])
        } catch {}
        return new Set<string>()
      })()

      const validDisc = new Set<string>(baseElements.filter(b => elMap.has(b)))
      savedDisc.forEach(name => { if (elMap.has(name)) validDisc.add(name) })
      setDiscovered(validDisc)
      console.log('[v0] discovered set to size:', validDisc.size, 'elMap size:', elMap.size)
      setInitialized(true)
    }).catch((err) => {
      console.error('[v0] init CATCH:', err)
      setDiscovered(new Set(BASE_ELEMENTS_FR))
      setInitialized(true)
    })
  }, [])

  // Rebuild elements + recipes when lang changes
  const setLang = useCallback((newLang: Lang) => {
    if (dbRows.length === 0) return
    setLangState(newLang)
    try { localStorage.setItem(LANG_KEY, newLang) } catch {}

    const newElMap = buildElementMap(dbRows, newLang)
    setElements(newElMap)
    setRecipeMap(buildRecipeMap(dbRecipes, newLang))

    // Translate discovered names and playground items
    const frToEn = new Map<string, string>()
    const enToFr = new Map<string, string>()
    for (const row of dbRows) {
      if (row.name_french && row.name_english) {
        frToEn.set(row.name_french, row.name_english)
        enToFr.set(row.name_english, row.name_french)
      }
    }
    const translate = newLang === 'en' ? frToEn : enToFr
    setDiscovered(prev => {
      const translated = new Set<string>()
      prev.forEach(name => {
        const newName = translate.get(name) || name
        if (newElMap.has(newName)) translated.add(newName)
      })
      return translated
    })
    setPlayground(prev => prev.map(item => {
      const newName = translate.get(item.element) || item.element
      return { ...item, element: newElMap.has(newName) ? newName : item.element }
    }))
  }, [dbRows, dbRecipes])

  // Save discovered progress
  useEffect(() => {
    if (initialized && discovered.size > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...discovered])) } catch {}
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

  const clearPlayground = useCallback(() => setPlayground([]), [])

  const tryMerge = useCallback((id1: string, id2: string): string | null => {
    const item1 = playground.find(i => i.id === id1)
    const item2 = playground.find(i => i.id === id2)
    if (!item1 || !item2) return null
    const results = findRecipes(recipeMap, item1.element, item2.element)
    if (results.length === 0) return null

    const cx = (item1.x + item2.x) / 2
    const cy = (item1.y + item2.y) / 2
    const spread = 60

    // Remove the two source items, add all results
    setPlayground(prev => {
      const filtered = prev.filter(i => i.id !== id1 && i.id !== id2)
      const newItems = results.map((res, idx) => {
        const angle = (idx / results.length) * Math.PI * 2
        const x = results.length > 1 ? cx + Math.cos(angle) * spread : cx
        const y = results.length > 1 ? cy + Math.sin(angle) * spread : cy
        return { id: generateId(), element: res, x, y }
      })
      return [...filtered, ...newItems]
    })

    let firstNew: string | null = null
    results.forEach(res => {
      if (!discovered.has(res)) {
        setDiscovered(prev => new Set([...prev, res]))
        if (!firstNew) {
          firstNew = res
          setNewlyDiscovered(res)
          setTimeout(() => setNewlyDiscovered(null), 2500)
        }
      }
    })

    return results[0]
  }, [playground, discovered, recipeMap, generateId])

  const dropAndMerge = useCallback((element: string, x: number, y: number, targetId: string): string | null => {
    const target = playground.find(i => i.id === targetId)
    if (!target) return null
    const results = findRecipes(recipeMap, element, target.element)
    if (results.length === 0) return null

    const cx = (x + target.x) / 2
    const cy = (y + target.y) / 2
    const spread = 60

    setPlayground(prev => {
      const filtered = prev.filter(i => i.id !== targetId)
      const newItems = results.map((res, idx) => {
        const angle = (idx / results.length) * Math.PI * 2
        const px = results.length > 1 ? cx + Math.cos(angle) * spread : cx
        const py = results.length > 1 ? cy + Math.sin(angle) * spread : cy
        return { id: generateId(), element: res, x: px, y: py }
      })
      return [...filtered, ...newItems]
    })

    let firstNew: string | null = null
    results.forEach(res => {
      if (!discovered.has(res)) {
        setDiscovered(prev => new Set([...prev, res]))
        if (!firstNew) {
          firstNew = res
          setNewlyDiscovered(res)
          setTimeout(() => setNewlyDiscovered(null), 2500)
        }
      }
    })

    return results[0]
  }, [playground, discovered, recipeMap, generateId])

  const resetProgress = useCallback(() => {
    const baseEls = lang === 'fr' ? BASE_ELEMENTS_FR : BASE_ELEMENTS_EN
    const validBase = new Set(baseEls.filter(b => elements.has(b)))
    setDiscovered(validBase)
    setPlayground([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [lang, elements])

  const unlockAll = useCallback(() => {
    const all = new Set<string>(elements.keys())
    setDiscovered(all)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...all])) } catch {}
  }, [elements])

  return {
    lang,
    setLang,
    elements,
    discovered,
    playground,
    newlyDiscovered,
    initialized,
    totalElements: totalDbCount,
    addToPlayground,
    moveOnPlayground,
    removeFromPlayground,
    clearPlayground,
    tryMerge,
    dropAndMerge,
    resetProgress,
    unlockAll,
  }
}
