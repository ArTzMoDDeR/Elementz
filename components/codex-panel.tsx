'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, ChevronRight, ArrowLeft, Lock, Loader2 } from 'lucide-react'
import { Books } from '@phosphor-icons/react'
import type { ElementDef } from '@/lib/game-data'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeIngredients {
  ing1_name: string
  ing1_img: string | null
  ing2_name: string
  ing2_img: string | null
}

// ─── Section divider (mirrors quest-panel style) ─────────────────────────────

function SectionLabel({ label, count, color = 'muted' }: { label: string; count?: number; color?: 'primary' | 'amber' | 'sky' | 'muted' }) {
  const colorClass = {
    primary: 'text-primary',
    amber: 'text-amber-400',
    sky: 'text-sky-400',
    muted: 'text-muted-foreground/50',
  }[color]
  return (
    <div className={`flex items-center gap-2 px-0.5 ${colorClass}`}>
      <div className="flex-1 h-px bg-current opacity-20" />
      <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
        {label}{count !== undefined ? ` · ${count}` : ''}
      </span>
      <div className="flex-1 h-px bg-current opacity-20" />
    </div>
  )
}

// ─── Single recipe row ────────────────────────────────────────────────────────

function RecipeRow({
  recipe,
  element,
}: {
  recipe: RecipeIngredients
  element: ElementDef
}) {
  const makeEl = (name: string, img: string | null): ElementDef =>
    ({ name, icon: '', color: '#94A3B8', category: '', imageUrl: img ?? undefined })

  return (
    <div className="flex items-center justify-center gap-2.5 py-2.5">
      <IngredientPill element={makeEl(recipe.ing1_name, recipe.ing1_img)} />
      <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-muted-foreground">+</span>
      </div>
      <IngredientPill element={makeEl(recipe.ing2_name, recipe.ing2_img)} />
      <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden p-1 border-2"
          style={{ borderColor: `${element.color}70`, background: `${element.color}20` }}
        >
          {element.imageUrl
            ? <img src={element.imageUrl} alt={element.name} className="w-full h-full object-contain" draggable={false} />
            : <span className="text-sm font-bold" style={{ color: element.color }}>{element.name[0].toUpperCase()}</span>
          }
        </div>
        <span className="text-[9px] font-bold text-foreground text-center leading-tight max-w-[52px] truncate">
          {element.name}
        </span>
      </div>
    </div>
  )
}

// ─── Recipe card ─────────────────────────────────────────────────────────────

function RecipeCard({
  element,
  lang,
  onClose,
}: {
  element: ElementDef
  lang: 'fr' | 'en'
  onClose: () => void
}) {
  const [recipes, setRecipes] = useState<RecipeIngredients[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setRecipes(null)
    fetch(`/api/codex/recipes/${encodeURIComponent(element.name)}`)
      .then(r => r.json())
      .then(data => {
        setRecipes(data.recipes ?? [])
        setLoading(false)
      })
      .catch(() => {
        setRecipes([])
        setLoading(false)
      })
  }, [element.name])

  const isBase = !loading && recipes !== null && recipes.length === 0

  return (
    <div
      className="rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ borderColor: `${element.color}40`, background: `${element.color}08` }}
    >
      {/* Element header */}
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <div
          className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden p-1 border"
          style={{ borderColor: `${element.color}50`, background: `${element.color}18` }}
        >
          {element.imageUrl
            ? <img src={element.imageUrl} alt={element.name} className="w-full h-full object-contain" draggable={false} />
            : <span className="text-lg font-bold" style={{ color: element.color }}>{element.name[0].toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{element.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {loading
              ? (lang === 'fr' ? 'Chargement...' : 'Loading...')
              : isBase
                ? (lang === 'fr' ? 'Élément de base' : 'Base element')
                : recipes!.length === 1
                  ? (lang === 'fr' ? '1 recette possible' : '1 possible recipe')
                  : (lang === 'fr' ? `${recipes!.length} recettes possibles` : `${recipes!.length} possible recipes`)
            }
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recipes */}
      <div
        className="border-t divide-y"
        style={{ borderColor: `${element.color}20` }}
      >
        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground/50">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">{lang === 'fr' ? 'Chargement des recettes...' : 'Loading recipes...'}</span>
          </div>
        )}

        {isBase && (
          <div className="flex items-center justify-center py-3">
            <p className="text-xs text-muted-foreground/60 py-0.5">
              {lang === 'fr' ? 'Aucune recette — élément originel' : 'No recipe — primordial element'}
            </p>
          </div>
        )}

        {!loading && recipes && recipes.map((recipe, i) => (
          <div key={i} style={{ borderColor: `${element.color}12` }}>
            <RecipeRow recipe={recipe} element={element} />
          </div>
        ))}
      </div>
    </div>
  )
}

function IngredientPill({ element }: { element: ElementDef }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden p-1 border"
        style={{ borderColor: `${element.color}40`, background: `${element.color}15` }}
      >
        {element.imageUrl
          ? <img src={element.imageUrl} alt={element.name} className="w-full h-full object-contain" draggable={false} />
          : <span className="text-sm font-bold" style={{ color: element.color }}>{element.name[0].toUpperCase()}</span>
        }
      </div>
      <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight max-w-[52px] truncate">
        {element.name}
      </span>
    </div>
  )
}

// ─── Element grid card ────────────────────────────────────────────────────────

function ElementCard({
  element,
  isSelected,
  onClick,
}: {
  element: ElementDef
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 overflow-hidden p-1.5 border ${isSelected ? 'border-2' : 'hover:opacity-80'}`}
      style={{
        borderColor: isSelected ? `${element.color}80` : `${element.color}28`,
        background: isSelected ? `${element.color}1a` : `${element.color}0a`,
      }}
    >
      <div className="w-[58%] aspect-square flex items-center justify-center flex-shrink-0">
        {element.imageUrl
          ? <img src={element.imageUrl} alt={element.name} className="w-full h-full object-contain" draggable={false} />
          : <span className="text-xs font-bold" style={{ color: element.color }}>{element.name[0].toUpperCase()}</span>
        }
      </div>
      <span
        className="text-[8px] font-semibold leading-tight text-center w-full truncate px-0.5"
        style={{ color: isSelected ? element.color : undefined }}
      >
        {element.name}
      </span>
    </button>
  )
}

function LockedCard() {
  return (
    <div className="aspect-square rounded-xl flex flex-col items-center justify-center border border-border/30 bg-muted/15">
      <Lock className="w-3.5 h-3.5 text-muted-foreground/20" />
      <span className="text-[11px] font-bold text-muted-foreground/20 mt-0.5">?</span>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function CodexInlinePanel({
  lang,
  elements,
  discovered,
  totalElements,
  recipeMap,
  onGoToPlay,
}: {
  lang: 'fr' | 'en'
  elements: Map<string, ElementDef>
  discovered: Set<string>
  totalElements: number
  recipeMap: Map<string, string[]>
  onGoToPlay?: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const topRef = useRef<HTMLDivElement>(null)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  // Scroll to top whenever an element is selected
  useEffect(() => {
    if (selected !== null) {
      const scrollContainer = topRef.current?.closest('.overflow-y-auto') as HTMLElement | null
      scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [selected])

  const discoveredCount = discovered.size
  const pct = totalElements > 0 ? Math.round((discoveredCount / totalElements) * 100) : 0

  const allNames = Array.from(elements.keys()).sort((a, b) =>
    a.localeCompare(b, lang === 'fr' ? 'fr' : 'en', { sensitivity: 'base' })
  )

  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

  const filteredNames = search
    ? allNames.filter(n => discovered.has(n) && norm(n).includes(norm(search)))
    : allNames

  const discoveredInFilter = filteredNames.filter(n => discovered.has(n))
  const undiscoveredInFilter = search ? [] : filteredNames.filter(n => !discovered.has(n))

  const selectedEl = selected ? elements.get(selected) ?? null : null

  return (
    <div ref={topRef} className="flex flex-col gap-5 py-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoToPlay}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all flex-shrink-0"
            aria-label={t('Retour', 'Back')}
          >
            <ArrowLeft className="w-4 h-4 text-foreground/70" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">Codex</h2>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold" style={{ color: 'var(--primary)' }}>{discoveredCount}</span>
              <span className="opacity-50">/{totalElements}</span>
              <span className="mx-1 opacity-40">·</span>
              <span>{pct}%</span>
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0">
          <Books size={20} weight="fill" className="text-primary" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'var(--primary)' }}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('Rechercher un élément...', 'Search an element...')}
          className="w-full h-9 pl-9 pr-8 bg-muted/50 border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
          style={{ fontSize: '16px' }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setSelected(null) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Recipe card — shown when element selected */}
      {selectedEl && (
        <RecipeCard
          element={selectedEl}
          lang={lang}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Discovered section */}
      {discoveredInFilter.length > 0 && (
        <div className="flex flex-col gap-3">
          {!search && (
            <SectionLabel
              label={t('Découverts', 'Discovered')}
              count={discoveredCount}
              color="primary"
            />
          )}
          <div className="grid grid-cols-4 gap-2">
            {discoveredInFilter.map(name => {
              const el = elements.get(name)
              if (!el) return null
              return (
                <ElementCard
                  key={name}
                  element={el}
                  isSelected={selected === name}
                  onClick={() => setSelected(prev => prev === name ? null : name)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Empty search result */}
      {search && discoveredInFilter.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8">
          <Lock className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground/50 text-center">
            {t('Aucun élément découvert trouvé', 'No discovered element found')}
          </p>
        </div>
      )}

      {/* Locked section */}
      {undiscoveredInFilter.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel
            label={t('À découvrir', 'To discover')}
            count={undiscoveredInFilter.length}
            color="muted"
          />
          <div className="grid grid-cols-4 gap-2">
            {undiscoveredInFilter.map(name => (
              <LockedCard key={name} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

import { Search, X, ChevronRight, ArrowLeft, Lock } from 'lucide-react'
import { Books } from '@phosphor-icons/react'
import type { ElementDef } from '@/lib/game-data'

// ─── Section divider (mirrors quest-panel style) ─────────────────────────────

function SectionLabel({ label, count, color = 'muted' }: { label: string; count?: number; color?: 'primary' | 'amber' | 'sky' | 'muted' }) {
  const colorClass = {
    primary: 'text-primary',
    amber: 'text-amber-400',
    sky: 'text-sky-400',
    muted: 'text-muted-foreground/50',
  }[color]
  return (
    <div className={`flex items-center gap-2 px-0.5 ${colorClass}`}>
      <div className="flex-1 h-px bg-current opacity-20" />
      <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
        {label}{count !== undefined ? ` · ${count}` : ''}
      </span>
      <div className="flex-1 h-px bg-current opacity-20" />
    </div>
  )
}

// ─── Recipe card ─────────────────────────────────────────────────────────────

function RecipeCard({
  element,
  ingA,
  ingB,
  lang,
  onClose,
}: {
  element: ElementDef
  ingA: ElementDef | null
  ingB: ElementDef | null
  lang: 'fr' | 'en'
  onClose: () => void
}) {
  const isBase = !ingA || !ingB

  return (
    <div
      className="rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ borderColor: `${element.color}40`, background: `${element.color}08` }}
    >
      {/* Element header */}
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <div
          className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden p-1 border"
          style={{ borderColor: `${element.color}50`, background: `${element.color}18` }}
        >
          {element.imageUrl
            ? <img src={element.imageUrl} alt={element.name} className="w-full h-full object-contain" draggable={false} />
            : <span className="text-lg font-bold" style={{ color: element.color }}>{element.name[0].toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{element.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBase
              ? (lang === 'fr' ? 'Élément de base' : 'Base element')
              : (lang === 'fr' ? 'Recette de création' : 'Creation recipe')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recipe row */}
      <div
        className="border-t px-4 py-3 flex items-center justify-center gap-2.5"
        style={{ borderColor: `${element.color}20` }}
      >
        {isBase ? (
          <p className="text-xs text-muted-foreground/60 py-0.5">
            {lang === 'fr' ? 'Aucune recette — élément originel' : 'No recipe — primordial element'}
          </p>
        ) : (
          <>
            <IngredientPill element={ingA!} />
            <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-muted-foreground">+</span>
            </div>
            <IngredientPill element={ingB!} />
            <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </div>
            {/* Result */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden p-1 border-2"
                style={{ borderColor: `${element.color}70`, background: `${element.color}20` }}
              >
                {element.imageUrl
                  ? <img src={element.imageUrl} alt={element.name} className="w-full h-full object-contain" draggable={false} />
                  : <span className="text-sm font-bold" style={{ color: element.color }}>{element.name[0].toUpperCase()}</span>
                }
              </div>
              <span className="text-[9px] font-bold text-foreground text-center leading-tight max-w-[52px] truncate">
                {element.name}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function IngredientPill({ element }: { element: ElementDef }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden p-1 border"
        style={{ borderColor: `${element.color}40`, background: `${element.color}15` }}
      >
        {element.imageUrl
          ? <img src={element.imageUrl} alt={element.name} className="w-full h-full object-contain" draggable={false} />
          : <span className="text-sm font-bold" style={{ color: element.color }}>{element.name[0].toUpperCase()}</span>
        }
      </div>
      <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight max-w-[52px] truncate">
        {element.name}
      </span>
    </div>
  )
}

// ─── Element grid card ────────────────────────────────────────────────────────

function ElementCard({
  element,
  isSelected,
  onClick,
}: {
  element: ElementDef
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 overflow-hidden p-1.5 border ${isSelected ? 'border-2' : 'hover:opacity-80'}`}
      style={{
        borderColor: isSelected ? `${element.color}80` : `${element.color}28`,
        background: isSelected ? `${element.color}1a` : `${element.color}0a`,
      }}
    >
      <div className="w-[58%] aspect-square flex items-center justify-center flex-shrink-0">
        {element.imageUrl
          ? <img src={element.imageUrl} alt={element.name} className="w-full h-full object-contain" draggable={false} />
          : <span className="text-xs font-bold" style={{ color: element.color }}>{element.name[0].toUpperCase()}</span>
        }
      </div>
      <span
        className="text-[8px] font-semibold leading-tight text-center w-full truncate px-0.5"
        style={{ color: isSelected ? element.color : undefined }}
      >
        {element.name}
      </span>
    </button>
  )
}

function LockedCard() {
  return (
    <div className="aspect-square rounded-xl flex flex-col items-center justify-center border border-border/30 bg-muted/15">
      <Lock className="w-3.5 h-3.5 text-muted-foreground/20" />
      <span className="text-[11px] font-bold text-muted-foreground/20 mt-0.5">?</span>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────���───────────────────────

export function CodexInlinePanel({
  lang,
  elements,
  discovered,
  totalElements,
  recipeMap,
  onGoToPlay,
}: {
  lang: 'fr' | 'en'
  elements: Map<string, ElementDef>
  discovered: Set<string>
  totalElements: number
  recipeMap: Map<string, string[]>
  onGoToPlay?: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const topRef = useRef<HTMLDivElement>(null)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  // Scroll to top whenever an element is selected
  useEffect(() => {
    if (selected !== null) {
      const scrollContainer = topRef.current?.closest('.overflow-y-auto') as HTMLElement | null
      scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [selected])

  const discoveredCount = discovered.size
  const pct = totalElements > 0 ? Math.round((discoveredCount / totalElements) * 100) : 0

  // All element names sorted alphabetically
  const allNames = Array.from(elements.keys()).sort((a, b) =>
    a.localeCompare(b, lang === 'fr' ? 'fr' : 'en', { sensitivity: 'base' })
  )

  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

  // When searching: only show matching discovered elements
  // When not searching: show all (discovered + locked)
  const filteredNames = search
    ? allNames.filter(n => discovered.has(n) && norm(n).includes(norm(search)))
    : allNames

  const discoveredInFilter = filteredNames.filter(n => discovered.has(n))
  const undiscoveredInFilter = search ? [] : filteredNames.filter(n => !discovered.has(n))

  // Lookup recipe: find the key a|b where results includes `name`
  const getRecipe = (name: string): [string, string] | null => {
    for (const [key, results] of recipeMap.entries()) {
      if (results.includes(name)) {
        const parts = key.split('|')
        // Only process the canonical key (a <= b) to avoid duplicates
        if (parts[0] <= parts[1]) return [parts[0], parts[1]]
      }
    }
    return null
  }

  const selectedEl = selected ? elements.get(selected) ?? null : null
  const selectedRecipe = selected ? getRecipe(selected) : null
  const ingA = selectedRecipe ? elements.get(selectedRecipe[0]) ?? null : null
  const ingB = selectedRecipe ? elements.get(selectedRecipe[1]) ?? null : null

  return (
    <div ref={topRef} className="flex flex-col gap-5 py-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoToPlay}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all flex-shrink-0"
            aria-label={t('Retour', 'Back')}
          >
            <ArrowLeft className="w-4 h-4 text-foreground/70" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">Codex</h2>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold" style={{ color: 'var(--primary)' }}>{discoveredCount}</span>
              <span className="opacity-50">/{totalElements}</span>
              <span className="mx-1 opacity-40">·</span>
              <span>{pct}%</span>
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0">
          <Books size={20} weight="fill" className="text-primary" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'var(--primary)' }}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('Rechercher un élément...', 'Search an element...')}
          className="w-full h-9 pl-9 pr-8 bg-muted/50 border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
          style={{ fontSize: '16px' }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setSelected(null) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Recipe card — shown when element selected */}
      {selectedEl && (
        <RecipeCard
          element={selectedEl}
          ingA={ingA}
          ingB={ingB}
          lang={lang}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Discovered section */}
      {discoveredInFilter.length > 0 && (
        <div className="flex flex-col gap-3">
          {!search && (
            <SectionLabel
              label={t('Découverts', 'Discovered')}
              count={discoveredCount}
              color="primary"
            />
          )}
          <div className="grid grid-cols-4 gap-2">
            {discoveredInFilter.map(name => {
              const el = elements.get(name)
              if (!el) return null
              return (
                <ElementCard
                  key={name}
                  element={el}
                  isSelected={selected === name}
                  onClick={() => setSelected(prev => prev === name ? null : name)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Empty search result */}
      {search && discoveredInFilter.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8">
          <Lock className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground/50 text-center">
            {t('Aucun élément découvert trouvé', 'No discovered element found')}
          </p>
        </div>
      )}

      {/* Locked section */}
      {undiscoveredInFilter.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel
            label={t('À découvrir', 'To discover')}
            count={undiscoveredInFilter.length}
            color="muted"
          />
          <div className="grid grid-cols-4 gap-2">
            {undiscoveredInFilter.map(name => (
              <LockedCard key={name} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
