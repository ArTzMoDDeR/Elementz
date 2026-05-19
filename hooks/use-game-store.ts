'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { type ElementDef } from '@/lib/game-data'
import { elements as rawElements } from '@/lib/data/elements.js'
import { recipes as rawRecipes } from '@/lib/data/recipes.js'
import { triggerHaptic } from '@/lib/haptics'

const STORAGE_KEY = 'alchemy-discovered-v4'  // bumped — now stores numbers
const LANG_KEY = 'alchemy-lang'
// Per-element combo counter key — each element gets its own counter
const getComboKey = (elementId: number) => `alchemy-combos-${elementId}`
const getDailyKey = () => `alchemy-daily-${new Date().toISOString().slice(0, 10)}`

function incrementLocalCounter(key: string) {
  try {
    const cur = parseInt(localStorage.getItem(key) ?? '0', 10)
    localStorage.setItem(key, String(cur + 1))
  } catch {}
}
// How long to batch new discoveries before flushing to DB (ms)
const SYNC_DEBOUNCE_MS = 30_000

export type Lang = 'fr' | 'en'

export interface PlaygroundItem {
  id: string
  /** DB element number — stable key, never changes with lang */
  element: number
  x: number
  y: number
}

// RecipeMap: key = "n1|n2" (element numbers), value = number[] of result numbers
type RecipeMap = Map<string, number[]>

type RecipeRow = {
  ingredient1_number: number
  ingredient2_number: number
  result_number: number
}

type DbRow = {
  number: number
  name_french: string
  name_english: string
  img: string | null
}

// ─── Builders ────────────────────────────────────────────────────────────────

function getColor(nameFr: string): string {
  const n = nameFr.toLowerCase()
  const colorMap: Record<string, string> = {
    eau: '#3B82F6', feu: '#EF4444', terre: '#A16207', air: '#06B6D4',
  }
  if (colorMap[n]) return colorMap[n]
  const hash = Array.from(nameFr).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const palette = ['#6366F1','#8B5CF6','#EC4899','#14B8A6','#F97316','#22C55E','#EAB308','#06B6D4','#F43F5E','#84CC16']
  return palette[hash % palette.length]
}

// All images are local — always /elements/[id].webp
// Keep proxyImg as a passthrough for any legacy URLs that might still exist
function proxyImg(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('/elements/')) return url
  // Legacy Cloudinary: extract id and serve local
  const cloudMatch = url.match(/element-(\d+)\.webp/) ?? url.match(/\/(\d+)\.webp/)
  if (cloudMatch) return `/elements/${cloudMatch[1]}.webp`
  return url
}

/**
 * Build Map<number, ElementDef> — the canonical element store.
 * All game state (discovered, playground, recipeMap) is keyed by these numbers.
 */
function buildElementMap(rows: DbRow[], lang: Lang): Map<number, ElementDef> {
  const map = new Map<number, ElementDef>()
  for (const row of rows) {
    const name = lang === 'fr'
      ? (row.name_french || row.name_english)
      : (row.name_english || row.name_french)
    if (!name) continue
    map.set(row.number, {
      number: row.number,
      name,
      icon: name.substring(0, 2).toUpperCase(),
      color: getColor(row.name_french),
      category: 'base',
      imageUrl: proxyImg(row.img),
    })
  }
  return map
}

/**
 * Derived Map<string, ElementDef> keyed by current-lang name.
 * Used only for display/UI lookups (avatar, backward-compat).
 */
function buildNameIndex(elements: Map<number, ElementDef>): Map<string, ElementDef> {
  const map = new Map<string, ElementDef>()
  elements.forEach(el => map.set(el.name, el))
  return map
}

/**
 * Build RecipeMap keyed by "n1|n2" number strings.
 * Lang-independent — never needs rebuilding on lang change.
 */
function buildRecipeMap(recipes: RecipeRow[]): RecipeMap {
  const map = new Map<string, number[]>()
  const add = (key: string, val: number) => {
    const arr = map.get(key)
    if (arr) { if (!arr.includes(val)) arr.push(val) }
    else map.set(key, [val])
  }
  for (const r of recipes) {
    add(`${r.ingredient1_number}|${r.ingredient2_number}`, r.result_number)
    add(`${r.ingredient2_number}|${r.ingredient1_number}`, r.result_number)
  }
  return map
}

function findRecipes(map: RecipeMap, a: number, b: number): number[] {
  return map.get(`${a}|${b}`) || []
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameStore() {
  const { data: session, status: sessionStatus } = useSession()
  const [lang, setLangState] = useState<Lang>('en')
  const [dbRows, setDbRows] = useState<DbRow[]>([])
  const [dbRecipes, setDbRecipes] = useState<RecipeRow[]>([])
  const [elements, setElements] = useState<Map<number, ElementDef>>(new Map())
  const [elementsByName, setElementsByName] = useState<Map<string, ElementDef>>(new Map())
  // RecipeMap is built once and never rebuilt (numbers are lang-independent)
  const [recipeMap, setRecipeMap] = useState<RecipeMap>(new Map())
  const [discovered, setDiscovered] = useState<Set<number>>(new Set())
  const [playground, setPlayground] = useState<PlaygroundItem[]>([])
  const [newlyDiscovered, setNewlyDiscovered] = useState<number | null>(null)
  const [lastComboIngredients, setLastComboIngredients] = useState<[number, number] | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [totalDbCount, setTotalDbCount] = useState(0)
  const [lastUnlockTime, setLastUnlockTime] = useState(Date.now())

  const idCounter = useRef(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const newlyDiscoveredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hapticEnabledRef = useRef(true)
  // Buffer of newly discovered element numbers + combo pairs waiting to be flushed to DB
  const pendingDiscovered = useRef<Set<number>>(new Set())
  const pendingIngredients = useRef<number[][]>([])
  const [hapticEnabled, setHapticEnabledState] = useState(true)

  // ─── Load lang preference ─────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (session?.user?.id) {
      fetch('/api/lang')
        .then(r => r.json())
        .then(({ lang: serverLang }) => {
          if (serverLang === 'fr' || serverLang === 'en') setLangState(serverLang)
        })
        .catch(() => {})
      fetch('/api/profile')
        .then(r => r.json())
        .then(d => {
          const val = d.haptic_feedback ?? true
          setHapticEnabledState(val)
          hapticEnabledRef.current = val
        })
        .catch(() => {})
    } else {
      try {
        // 1. Explicit user choice stored in localStorage takes priority
        const saved = localStorage.getItem(LANG_KEY) as Lang | null
        if (saved === 'fr' || saved === 'en') {
          setLangState(saved)
        } else {
          // 2. Fall back to geo cookie set by middleware
          const cookieLang = document.cookie
            .split('; ')
            .find(row => row.startsWith('lang='))
            ?.split('=')[1] as Lang | undefined
          if (cookieLang === 'fr' || cookieLang === 'en') setLangState(cookieLang)
        }
        const hap = localStorage.getItem('hapticFeedback')
        if (hap !== null) {
          const val = hap !== '0'
          setHapticEnabledState(val)
          hapticEnabledRef.current = val
        }
      } catch {}
    }
  }, [sessionStatus, session?.user?.id])

  // Stable ref for setLang — needed for StorageEvent listener
  const setLangRef = useRef<((l: Lang) => void) | null>(null)

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LANG_KEY && (e.newValue === 'fr' || e.newValue === 'en')) {
        setLangRef.current?.(e.newValue as Lang)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // ─── Load everything from DB ──────────────────────────────────────��──────
  const loadGameData = useCallback((currentLang?: string) => {
    const savedLang = currentLang ?? (() => {
      try { return (localStorage.getItem(LANG_KEY) as Lang | null) || 'en' } catch { return 'en' }
    })()

    // Build rows from local files — no network needed for game data
    const rows: DbRow[] = (rawElements as Array<{ id: number; name_fr: string; name_en: string; img: string | null }>).map(e => ({
      number: e.id,
      name_french: e.name_fr,
      name_english: e.name_en,
      img: e.img,
    }))

    const recipes: RecipeRow[] = (rawRecipes as Array<{ ingredient1: number; ingredient2: number; result: number }>).map(r => ({
      ingredient1_number: r.ingredient1,
      ingredient2_number: r.ingredient2,
      result_number: r.result,
    }))

    const progressPromise = session?.user?.id
      ? fetch('/api/progress').then(r => r.json()).catch(() => null)
      : Promise.resolve(null)

    progressPromise.then((progressData) => {
      setDbRows(rows)
      setTotalDbCount(rows.length)

      setDbRecipes(recipes)

      const elMap = buildElementMap(rows, (savedLang === 'fr' ? 'fr' : 'en') as Lang)
      setElements(elMap)
      setElementsByName(buildNameIndex(elMap))

      // RecipeMap is built once — numbers never change with lang
      setRecipeMap(buildRecipeMap(recipes))

      // Base element numbers (eau, feu, terre, air)
      const baseNums = new Set(
        rows
          .filter(r => ['eau', 'feu', 'terre', 'air'].includes(r.name_french.toLowerCase()))
          .map(r => r.number)
      )
      const validDisc = new Set<number>(baseNums)

      // Read guest snapshot saved just before sign-in (email-sign-in.tsx → verifyCode)
      const guestSnapshot = new Set<number>()
      try {
        const snap = localStorage.getItem('alchemy-guest-snapshot')
        if (snap) {
          const parsed = JSON.parse(snap) as unknown[]
          parsed.forEach(raw => {
            const n = Number(raw)
            if (Number.isInteger(n) && n > 0 && elMap.has(n)) guestSnapshot.add(n)
          })
          // Don't remove yet — keep until migration is confirmed persisted
        }
      } catch {}

      if (progressData !== null && progressData !== undefined) {
        // Logged in — load server-side discovered list (may be empty for a brand new account)
        const serverDiscovered: number[] = Array.isArray(progressData?.discovered) ? progressData.discovered : []
        serverDiscovered.forEach((num: unknown) => {
          const n = Number(num)
          if (Number.isInteger(n) && n > 0 && elMap.has(n)) validDisc.add(n)
        })

        // Guest migration: merge snapshot into DB regardless of whether account is new or existing
        if (guestSnapshot.size > 0) {
          guestSnapshot.forEach(n => validDisc.add(n))
          const toSave = [...guestSnapshot].filter(n => !baseNums.has(n) && !serverDiscovered.includes(n))
          if (toSave.length > 0) {
            fetch('/api/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ discovered: toSave, combo_ingredients: [] }),
            }).catch(() => {})
          }
          // Consume snapshot now that migration is queued
          try { localStorage.removeItem('alchemy-guest-snapshot') } catch {}
          // Signal to alchemy-game that a guest migration just happened
          try { localStorage.setItem('alchemy-guest-migrated', '1') } catch {}
        }

        try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...validDisc])) } catch {}
      } else {
        // Not logged in — load from localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const parsed = JSON.parse(saved) as unknown[]
            parsed.forEach(raw => {
              const n = Number(raw)
              if (Number.isInteger(n) && n > 0 && elMap.has(n)) validDisc.add(n)
            })
          }
        } catch {}
      }

      setDiscovered(validDisc)
      setInitialized(true)
    }).catch(() => {
      setDiscovered(new Set())
      setInitialized(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    loadGameData()
  }, [sessionStatus, loadGameData])

  // ─── Reset on logout ──────────────────────────────────────────────────────
  // When the session transitions from logged-in to unauthenticated, clear all
  // progress from localStorage and reset discovered to the 4 base elements.
  const prevUserIdRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (sessionStatus === 'loading') return
    const currentId = session?.user?.id ?? null
    // If we had a user and now we don't — this is a logout
    if (prevUserIdRef.current != null && prevUserIdRef.current !== undefined && currentId === null) {
      const baseNums = new Set(
        dbRows
          .filter(r => ['eau', 'feu', 'terre', 'air'].includes(r.name_french.toLowerCase()))
          .map(r => r.number)
      )
      setDiscovered(baseNums)
      setPlayground([])
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
    }
    prevUserIdRef.current = currentId
  }, [session?.user?.id, sessionStatus, dbRows])

  // Data is now local — nothing to reload on focus
  useEffect(() => {
    const handleVisibility = () => {
      // No-op: elements and recipes come from local static files
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [initialized])

  // ─── setLang — rebuilds display names only, no state translation needed ──
  const setLang = useCallback((newLang: Lang) => {
    if (dbRows.length === 0) return
    setLangState(newLang)
    try { localStorage.setItem(LANG_KEY, newLang) } catch {}
    // Keep cookie in sync so geo detection stays consistent across pages
    try { document.cookie = `lang=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax` } catch {}
    if (session?.user?.id) {
      fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: newLang }),
      }).catch(() => {})
    }
    // Only the display Map needs to change — discovered/playground/recipeMap are number-keyed
    const newElMap = buildElementMap(dbRows, newLang)
    setElements(newElMap)
    setElementsByName(buildNameIndex(newElMap))
  }, [dbRows, session?.user?.id])

  useEffect(() => { setLangRef.current = setLang }, [setLang])

  // ─── flushToDb ────────────────────────────────────────────────────────────
  // Sends buffered discoveries to DB. Restores buffers on failure (retry on next flush).
  const flushToDb = useCallback((userId: string) => {
    const newItems = [...pendingDiscovered.current]
    const ingredients = [...pendingIngredients.current]
    if (newItems.length === 0 && ingredients.length === 0) return

    pendingDiscovered.current = new Set()
    pendingIngredients.current = []

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // combo_ingredients is an array of pairs [[n1, n2], ...]
      body: JSON.stringify({ discovered: newItems, combo_ingredients: ingredients }),
    }).catch(() => {
      // Restore buffers so the next flush retries — no data is ever silently dropped
      newItems.forEach(n => pendingDiscovered.current.add(n))
      pendingIngredients.current.unshift(...ingredients)
    })
  }, [])

  // ─── Persist discovered to localStorage ──────────────────────────────────
  useEffect(() => {
    if (!initialized || discovered.size === 0) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...discovered])) } catch {}
  }, [discovered, initialized])

  // ─── 30s debounce flush + page unload flush ───────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return
    const userId = session.user.id

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => flushToDb(userId), SYNC_DEBOUNCE_MS)

    const handleUnload = () => flushToDb(userId)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [session?.user?.id, flushToDb])

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const generateId = useCallback(() => {
    idCounter.current += 1
    return `item-${Date.now()}-${idCounter.current}`
  }, [])

  const addToPlayground = useCallback((elementNum: number, x: number, y: number): string => {
    const id = generateId()
    setPlayground(prev => [...prev, { id, element: elementNum, x, y }])
    return id
  }, [generateId])

  const moveOnPlayground = useCallback((id: string, x: number, y: number) => {
    setPlayground(prev => {
      const others = prev.filter(item => item.id !== id)
      const target = prev.find(item => item.id === id)
      if (!target) return prev
      return [...others, { ...target, x, y }]
    })
  }, [])

  const removeFromPlayground = useCallback((id: string) => {
    setPlayground(prev => prev.filter(item => item.id !== id))
  }, [])

  const clearPlayground = useCallback(() => setPlayground([]), [])

  // ─── applyMerge — shared merge logic ─────────────────────────────────────
  // Handles discoveries, haptics, and DB buffering for any merge operation.
  const applyMerge = useCallback((
    results: number[],
    ingredientA: number,
    ingredientB: number,
  ): number => {
    const newResults = results.filter(res => !discovered.has(res))

    if (newResults.length > 0) {
      // Single call — avoids React batching silently dropping intermediate results
      setDiscovered(prev => new Set([...prev, ...newResults]))

      if (newlyDiscoveredTimerRef.current) clearTimeout(newlyDiscoveredTimerRef.current)
      setNewlyDiscovered(newResults[0])
      setLastComboIngredients([ingredientA, ingredientB])
      setLastUnlockTime(Date.now())
      newlyDiscoveredTimerRef.current = setTimeout(() => {
        setNewlyDiscovered(null)
        newlyDiscoveredTimerRef.current = null
      }, 3000)

      // Heavy haptic for new discovery
      // Use Capacitor bridge directly — works even in server-url mode where npm packages aren't bundled
      if (hapticEnabledRef.current) {
        triggerHaptic('heavy')
      }
    } else if (results.length > 0) {
      // Known combination — Medium haptic
      if (hapticEnabledRef.current) {
        triggerHaptic('medium')
      }
    }

    // Guest tracking — increment per-element combo counters + daily discovery count
    if (!session?.user?.id) {
      // Increment the counter for each ingredient that was used in this combo
      incrementLocalCounter(getComboKey(ingredientA))
      if (ingredientB !== ingredientA) incrementLocalCounter(getComboKey(ingredientB))
      if (newResults.length > 0) incrementLocalCounter(getDailyKey())
    }

    // Notify quest panel in real-time (works for both guests and logged-in users)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quest-progress', {
        detail: { newDiscoveries: newResults, isNewDiscovery: newResults.length > 0 }
      }))
    }

    // Buffer discoveries + the ingredient pair — flushed to DB immediately on new discovery
    if (session?.user?.id) {
      newResults.forEach(res => pendingDiscovered.current.add(res))
      pendingIngredients.current.push([ingredientA, ingredientB])
      // Only flush immediately when there are actual new discoveries
      if (newResults.length > 0) {
        const userId = session.user.id
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        // Short debounce (500ms) so rapid combos are batched, but app close won't lose data
        saveTimeoutRef.current = setTimeout(() => flushToDb(userId), 500)
      }
    }

    return results[0]
  }, [discovered, session?.user?.id])

  // ─── tryMerge: merge two playground items by ID ───────────────────────────
  const tryMerge = useCallback((id1: string, id2: string): number | null => {
    const item1 = playground.find(i => i.id === id1)
    const item2 = playground.find(i => i.id === id2)
    if (!item1 || !item2) return null

    const results = findRecipes(recipeMap, item1.element, item2.element)
    if (results.length === 0) return null

    const tx = item2.x
    const ty = item2.y
    const spread = 60

    setPlayground(prev => {
      const filtered = prev.filter(i => i.id !== id1 && i.id !== id2)
      const newItems = results.map((res, idx) => {
        const angle = (idx / results.length) * Math.PI * 2
        return {
          id: generateId(),
          element: res,
          x: results.length > 1 ? tx + Math.cos(angle) * spread : tx,
          y: results.length > 1 ? ty + Math.sin(angle) * spread : ty,
        }
      })
      return [...filtered, ...newItems]
    })

    return applyMerge(results, item1.element, item2.element)
  }, [playground, recipeMap, generateId, applyMerge])

  // ─── dropAndMerge: drop an element from inventory onto a playground item ──
  const dropAndMerge = useCallback((elementNum: number, x: number, y: number, targetId: string): number | null => {
    const target = playground.find(i => i.id === targetId)
    if (!target) return null

    const results = findRecipes(recipeMap, elementNum, target.element)
    if (results.length === 0) return null

    const cx = (x + target.x) / 2
    const cy = (y + target.y) / 2
    const spread = 60

    setPlayground(prev => {
      const filtered = prev.filter(i => i.id !== targetId)
      const newItems = results.map((res, idx) => {
        const angle = (idx / results.length) * Math.PI * 2
        return {
          id: generateId(),
          element: res,
          x: results.length > 1 ? cx + Math.cos(angle) * spread : cx,
          y: results.length > 1 ? cy + Math.sin(angle) * spread : cy,
        }
      })
      return [...filtered, ...newItems]
    })

    return applyMerge(results, elementNum, target.element)
  }, [playground, recipeMap, generateId, applyMerge])

  // ─── discoverElements — used by tutorial/onboarding to grant discoveries ──
  const discoverElements = useCallback((nums: number[]) => {
    const fresh = nums.filter(n => !discovered.has(n))
    if (fresh.length === 0) return
    setDiscovered(prev => new Set([...prev, ...fresh]))
    if (session?.user?.id) {
      fresh.forEach(n => pendingDiscovered.current.add(n))
      const userId = session.user.id
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => flushToDb(userId), 500)
    }
  }, [discovered, session?.user?.id, flushToDb])

  const resetProgress = useCallback(() => {
    const baseNums = new Set(
      dbRows
        .filter(r => ['eau', 'feu', 'terre', 'air'].includes(r.name_french.toLowerCase()))
        .map(r => r.number)
    )
    setDiscovered(baseNums)
    setPlayground([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [dbRows])

  const unlockAll = useCallback(() => {
    const all = new Set<number>(elements.keys())
    setDiscovered(all)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...all])) } catch {}
  }, [elements])

  const setHapticEnabled = (val: boolean) => {
    setHapticEnabledState(val)
    hapticEnabledRef.current = val
    try { localStorage.setItem('hapticFeedback', val ? '1' : '0') } catch {}
  }

  return {
    lang,
    setLang,
    /** Map<number, ElementDef> — canonical element store, keyed by DB number */
    elements,
    /** Map<string, ElementDef> — keyed by current-lang name, for UI/display lookups */
    elementsByName,
    hapticEnabled,
    setHapticEnabled,
    /** Set<number> — discovered element numbers */
    discovered,
    recipeMap,
    playground,
    /** number | null — DB number of the most recently discovered element */
    newlyDiscovered,
    lastComboIngredients,
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
    discoverElements,
  }
}
