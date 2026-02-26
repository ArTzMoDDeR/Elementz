'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
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
  const { data: session, status: sessionStatus } = useSession()
  const [lang, setLangState] = useState<Lang>('en')
  const [dbRows, setDbRows] = useState<Array<{ number: number; name_french: string; name_english: string; img: string | null }>>([])
  const [dbRecipes, setDbRecipes] = useState<RecipeRow[]>([])
  const [elements, setElements] = useState<Map<string, ElementDef>>(new Map())
  const [recipeMap, setRecipeMap] = useState<RecipeMap>(new Map())
  const [discovered, setDiscovered] = useState<Set<string>>(new Set())
  const [playground, setPlayground] = useState<PlaygroundItem[]>([])
  const [newlyDiscovered, setNewlyDiscovered] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [totalDbCount, setTotalDbCount] = useState(0)
  const [lastUnlockTime, setLastUnlockTime] = useState(Date.now())
  const idCounter = useRef(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load lang — DB takes priority if logged in, else localStorage, else 'en'
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (session?.user?.id) {
      fetch('/api/lang')
        .then(r => r.json())
        .then(({ lang: serverLang }) => {
          if (serverLang === 'fr' || serverLang === 'en') setLangState(serverLang)
        })
        .catch(() => {})
    } else {
      try {
        const saved = localStorage.getItem(LANG_KEY) as Lang | null
        if (saved === 'fr' || saved === 'en') setLangState(saved)
      } catch {}
    }
  }, [sessionStatus, session?.user?.id])

  // Stable ref to setLang so the StorageEvent listener can call it without stale closure
  const setLangRef = useRef<((l: Lang) => void) | null>(null)

  // Listen for lang changes from /settings page — calls setLang so elements + recipeMap rebuild
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LANG_KEY && (e.newValue === 'fr' || e.newValue === 'en')) {
        setLangRef.current?.(e.newValue as Lang)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // Load everything from DB once (wait for session to be resolved)
  useEffect(() => {
    if (sessionStatus === 'loading') return

    Promise.all([
      fetch('/api/elements').then(r => r.json()),
      fetch('/api/recipes').then(r => r.json()).catch(() => []),
      session?.user?.id ? fetch('/api/progress').then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ]).then(([elementsData, recipesData, progressData]) => {
      const rows: Array<{ number: number; name_french: string; name_english: string; img: string | null }> =
        Array.isArray(elementsData) ? elementsData : []

      setDbRows(rows)
      setTotalDbCount(rows.length)

      const recipes: RecipeRow[] = Array.isArray(recipesData) ? recipesData : []
      setDbRecipes(recipes)

      const savedLang = (() => {
        try { return (localStorage.getItem(LANG_KEY) as Lang | null) || 'en' } catch { return 'en' }
      })()
      const elMap = buildElementMap(rows, savedLang)
      setElements(elMap)
      setRecipeMap(buildRecipeMap(recipes, savedLang))

      // Priority: server progress (if logged in) > localStorage > base elements
      const baseElements = savedLang === 'fr' ? BASE_ELEMENTS_FR : BASE_ELEMENTS_EN
      const validDisc = new Set<string>(baseElements.filter(b => elMap.has(b)))

      // Always merge server + localStorage — union, never subtract
      if (progressData?.discovered && Array.isArray(progressData.discovered)) {
        progressData.discovered.forEach((name: string) => { if (elMap.has(name)) validDisc.add(name) })
      }
      // Also merge localStorage on top (handles offline discoveries)
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as string[]
          parsed.forEach(name => { if (elMap.has(name)) validDisc.add(name) })
        }
      } catch {}

      setDiscovered(validDisc)
      setInitialized(true)
    }).catch(() => {
      setDiscovered(new Set(BASE_ELEMENTS_EN))
      setInitialized(true)
    })
  }, [sessionStatus, session?.user?.id])

  // Rebuild elements + recipes when lang changes
  const setLang = useCallback((newLang: Lang) => {    if (dbRows.length === 0) return
    setLangState(newLang)
    try { localStorage.setItem(LANG_KEY, newLang) } catch {}
    if (session?.user?.id) {
      fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: newLang }),
      }).catch(() => {})
    }

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

  // Keep ref in sync so the StorageEvent listener always has the latest setLang
  useEffect(() => { setLangRef.current = setLang }, [setLang])

  // Save discovered progress — localStorage always, server if logged in (debounced)
  useEffect(() => {
    if (!initialized || discovered.size === 0) return
    const arr = [...discovered]
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) } catch {}
    if (session?.user?.id) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discovered: arr }),
        }).catch(() => {})
      }, 1500)
    }
  }, [discovered, initialized, session?.user?.id])

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
          setLastUnlockTime(Date.now())
          setTimeout(() => setNewlyDiscovered(null), 3000)
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
          setLastUnlockTime(Date.now())
          setTimeout(() => setNewlyDiscovered(null), 3000)
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
    recipeMap,
    playground,
    newlyDiscovered,
    initialized,
    totalElements: totalDbCount,
    lastUnlockTime,
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
