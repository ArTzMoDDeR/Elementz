'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ElementBadge } from './element-badge'
import { Search, X, ArrowUpDown, ChevronUp, ChevronDown, Home, Trophy, Settings, HelpCircle, User, Lightbulb, Trash2 } from 'lucide-react'
import type { ElementDef, PlaygroundItem } from '@/lib/game-data'
import { HelpModal } from './help-modal'
import { LeaderboardModal } from './leaderboard-modal'
import { ProfileModal } from './profile-modal'
import { signInWithGoogle } from '@/app/actions/auth'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

interface PlaygroundProps {
  items: PlaygroundItem[]
  elements: Map<string, ElementDef>
  discovered: Set<string>
  totalElements: number
  lang: 'fr' | 'en'
  onSetLang: (l: 'fr' | 'en') => void
  onDrop: (element: string, x: number, y: number) => string
  onMove: (id: string, x: number, y: number) => void
  onMerge: (id1: string, id2: string) => string | null
  onDropAndMerge: (element: string, x: number, y: number, targetId: string) => string | null
  onRemove: (id: string) => void
  onClear: () => void
  onReset: () => void
  onUnlockAll: () => void
  sessionUser?: { name?: string | null; email?: string | null; image?: string | null } | null
  hintsEnabled?: boolean
  onToggleHints?: () => void
  onRequestHint?: () => void
}

type SortType = 'name' | 'recent'

interface DragState {
  source: 'inventory' | 'playground'
  elementName: string
  itemId?: string
  x: number
  y: number
  offsetX: number
  offsetY: number
}

// ============================================================
// Custom scrollbar hook
// ============================================================
function useCustomScrollbar(
  scrollRef: React.RefObject<HTMLDivElement>,
  trackRef: React.RefObject<HTMLDivElement>,
  thumbRef: React.RefObject<HTMLDivElement>,
) {
  const isDraggingThumb = useRef(false)
  const thumbDragStart = useRef({ y: 0, scrollTop: 0 })

  const updateThumb = useCallback(() => {
    const scroll = scrollRef.current
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!scroll || !track || !thumb) return
    const ratio = scroll.clientHeight / scroll.scrollHeight
    if (ratio >= 1) {
      thumb.style.display = 'none'
      return
    }
    thumb.style.display = 'block'
    const thumbH = Math.max(32, track.clientHeight * ratio)
    const maxScroll = scroll.scrollHeight - scroll.clientHeight
    const maxThumbTop = track.clientHeight - thumbH
    const thumbTop = maxScroll > 0 ? (scroll.scrollTop / maxScroll) * maxThumbTop : 0
    thumb.style.height = `${thumbH}px`
    thumb.style.transform = `translateY(${thumbTop}px)`
  }, [scrollRef, trackRef, thumbRef])

  useEffect(() => {
    const scroll = scrollRef.current
    const thumb = thumbRef.current
    if (!scroll || !thumb) return

    scroll.addEventListener('scroll', updateThumb, { passive: true })
    const ro = new ResizeObserver(updateThumb)
    ro.observe(scroll)
    updateThumb()

    const onThumbPointerDown = (e: PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      isDraggingThumb.current = true
      thumbDragStart.current = { y: e.clientY, scrollTop: scroll.scrollTop }
      thumb.setPointerCapture(e.pointerId)
    }

    const onThumbPointerMove = (e: PointerEvent) => {
      if (!isDraggingThumb.current) return
      e.stopPropagation()
      const track = trackRef.current
      if (!track) return
      const ratio = scroll.scrollHeight / track.clientHeight
      const delta = (e.clientY - thumbDragStart.current.y) * ratio
      scroll.scrollTop = thumbDragStart.current.scrollTop + delta
    }

    const onThumbPointerUp = (e: PointerEvent) => {
      e.stopPropagation()
      isDraggingThumb.current = false
    }

    thumb.addEventListener('pointerdown', onThumbPointerDown)
    thumb.addEventListener('pointermove', onThumbPointerMove)
    thumb.addEventListener('pointerup', onThumbPointerUp)
    thumb.addEventListener('pointercancel', onThumbPointerUp)

    return () => {
      scroll.removeEventListener('scroll', updateThumb)
      ro.disconnect()
      thumb.removeEventListener('pointerdown', onThumbPointerDown)
      thumb.removeEventListener('pointermove', onThumbPointerMove)
      thumb.removeEventListener('pointerup', onThumbPointerUp)
      thumb.removeEventListener('pointercancel', onThumbPointerUp)
    }
  }, [updateThumb, scrollRef, trackRef, thumbRef])
}

// ============================================================
// Smart scroll button (accelerates the longer you hold)
// ============================================================
function ScrollButton({ dir, scrollRef }: { dir: 'up' | 'down'; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const scroll = (ts: number) => {
    if (!scrollRef.current) return
    const elapsed = ts - startTimeRef.current
    // Start at 3px/frame, ramp to 18px/frame over 1.5s
    const speed = Math.min(3 + (elapsed / 1500) * 15, 18)
    scrollRef.current.scrollTop += dir === 'down' ? speed : -speed
    rafRef.current = requestAnimationFrame(scroll)
  }

  const start = () => {
    startTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(scroll)
  }
  const stop = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
  }

  return (
    <button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className="md:hidden flex-1 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground active:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0 select-none touch-none"
    >
      {dir === 'up' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  )
}

// ============================================================
// ElementIcon — renders only the image/svg of an element, no label
// ============================================================
const ELEMENT_SVGS: Record<string, React.ReactNode> = {
  'eau':   <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" fill="rgba(255,255,255,0.75)"/></svg>,
  'water': <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" fill="rgba(255,255,255,0.75)"/></svg>,
  'feu':   <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M12 2c0 0-6 6-6 12a6 6 0 0012 0c0-3-1.5-5-3-7 0 2-1 3-3 3s-2-2 0-8z" fill="rgba(255,255,255,0.75)"/></svg>,
  'fire':  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M12 2c0 0-6 6-6 12a6 6 0 0012 0c0-3-1.5-5-3-7 0 2-1 3-3 3s-2-2 0-8z" fill="rgba(255,255,255,0.75)"/></svg>,
  'terre': <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.75)"/></svg>,
  'earth': <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.75)"/></svg>,
  'air':   <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><path d="M4 8h12a3 3 0 100-3" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round"/><path d="M4 12h14a3 3 0 110 3H4" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"/><path d="M4 16h8a2 2 0 110 2" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"/></svg>,
}

function ElementIcon({ element, className = 'w-full h-full' }: { element: ElementDef; className?: string }) {
  if (element.imageUrl) {
    return <img src={element.imageUrl} alt={element.name} draggable={false} className={`${className} object-contain pointer-events-none`} />
  }
  const svg = ELEMENT_SVGS[element.name]
  if (svg) return <div className={className}>{svg}</div>
  return <span className="text-sm font-bold text-white/70">{element.name[0].toUpperCase()}</span>
}

// ============================================================
// AvatarButton — shows element image avatar (not Google photo)
// ============================================================
const STARTING_FR = ['eau', 'feu', 'terre', 'air']
const STARTING_EN = ['water', 'fire', 'earth', 'air']

function hashStr(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

function AvatarButton({
  sessionUser, elements, onClick, lang,
}: {
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
  elements: Map<string, ElementDef>
  onClick: () => void
  lang: 'fr' | 'en'
}) {
  const [avatarKey, setAvatarKey] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.avatar) { setAvatarKey(d.avatar); return }
        const starting = lang === 'fr' ? STARTING_FR : STARTING_EN
        const fallback = starting[Math.abs(hashStr(sessionUser.email ?? 'x')) % 4]
        setAvatarKey(fallback)
      })
      .catch(() => {
        const starting = lang === 'fr' ? STARTING_FR : STARTING_EN
        setAvatarKey(starting[0])
      })
  }, [lang, sessionUser.email])

  const el = avatarKey ? elements.get(avatarKey) : null

  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-xl bg-muted border border-border hover:border-foreground/30 transition-colors flex-shrink-0 flex items-center justify-center overflow-hidden p-1.5"
      title={lang === 'fr' ? 'Profil' : 'Profile'}
    >
      {el ? (
        <ElementIcon element={el} className="w-full h-full object-contain" />
      ) : (
        <span className="text-xs font-bold text-muted-foreground">{sessionUser.name?.[0]?.toUpperCase() ?? '?'}</span>
      )}
    </button>
  )
}

// ============================================================
// Playground component
// ============================================================
export function Playground({
  items, elements, discovered, totalElements,
  lang, onSetLang,
  onDrop, onMove, onMerge, onDropAndMerge, onRemove, onClear, onReset,
  onUnlockAll, sessionUser, hintsEnabled, onToggleHints, onRequestHint,
}: PlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inventoryRef = useRef<HTMLDivElement>(null)
  const inventoryScrollRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<DragState | null>(null)
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const playgroundBadgeSize = isMobile ? 'sm' : 'lg'
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('name')
  const [sortReverse, setSortReverse] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'leaderboard' | 'settings' | 'help' | 'profile'>('home')

  // Inventory resize — mobile only
  const [inventoryHeight, setInventoryHeight] = useState<number | null>(null) // null = default 55vh
  const dragHandleRef = useRef<{ startY: number; startH: number } | null>(null)

  // Footer: show on mobile only when inventory >= 25% screen height, no fade
  const footerOpacity = (() => {
    if (!isMobile) return 1
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800
    const h = inventoryHeight ?? screenH * 0.55
    return h >= screenH * 0.25 ? 1 : 0
  })()

  const handleDragHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const currentH = inventoryRef.current?.getBoundingClientRect().height ?? window.innerHeight * 0.55
    dragHandleRef.current = { startY: e.clientY, startH: currentH }

    const onMove = (ev: PointerEvent) => {
      if (!dragHandleRef.current) return
      const delta = dragHandleRef.current.startY - ev.clientY // drag up = bigger
      const newH = Math.max(120, Math.min(window.innerHeight * 0.92, dragHandleRef.current.startH + delta))
      setInventoryHeight(newH)
    }
    const onUp = () => {
      dragHandleRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const findNearestItem = useCallback((x: number, y: number, excludeId?: string) => {
    let nearest: { item: PlaygroundItem; dist: number } | null = null
    items.forEach(item => {
      if (item.id === excludeId) return
      const dist = Math.sqrt((x - item.x) ** 2 + (y - item.y) ** 2)
      if (dist < 80 && (!nearest || dist < nearest.dist)) nearest = { item, dist }
    })
    return nearest?.item || null
  }, [items])

  // === INVENTORY DRAG — immediate capture, no delay, no direction detection ===
  const handleInventoryPointerDown = useCallback((e: React.PointerEvent, elementName: string) => {
    e.stopPropagation()
    e.preventDefault()
    const pos = getRelativePos(e.clientX, e.clientY)
    setDragging({
      source: 'inventory',
      elementName,
      x: pos.x - 40,
      y: pos.y - 40,
      offsetX: 40,
      offsetY: 40,
    })
    containerRef.current?.setPointerCapture(e.pointerId)
  }, [getRelativePos])

  // === PLAYGROUND ITEM DRAG ===
  const handlePointerDown = useCallback((e: React.PointerEvent, elementName: string, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const pos = getRelativePos(e.clientX, e.clientY)
    setDragging({
      source: 'playground',
      elementName,
      itemId,
      x: item.x,
      y: item.y,
      offsetX: pos.x - item.x,
      offsetY: pos.y - item.y,
    })
    containerRef.current?.setPointerCapture(e.pointerId)
  }, [getRelativePos, items])

  // === POINTER MOVE ===
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    e.preventDefault()
    const pos = getRelativePos(e.clientX, e.clientY)
    const newX = pos.x - dragging.offsetX
    const newY = pos.y - dragging.offsetY

    if (dragging.source === 'playground' && dragging.itemId) {
      onMove(dragging.itemId, newX, newY)
      setDragging(prev => prev ? { ...prev, x: newX, y: newY } : null)
      setNearMergeId(findNearestItem(newX, newY, dragging.itemId)?.id || null)
    } else {
      setDragging(prev => prev ? { ...prev, x: newX, y: newY } : null)
      setNearMergeId(findNearestItem(newX, newY)?.id || null)
    }
  }, [dragging, getRelativePos, onMove, findNearestItem])

  // === POINTER UP ===
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    e.preventDefault()
    containerRef.current?.releasePointerCapture(e.pointerId)

    const dropTarget = document.elementFromPoint(e.clientX, e.clientY)
    const droppedOnInventory = inventoryRef.current?.contains(dropTarget)

    if (dragging.source === 'inventory') {
      if (droppedOnInventory) {
        setDragging(null)
        setNearMergeId(null)
        return
      }
      const nearest = findNearestItem(dragging.x, dragging.y)
      if (nearest) {
        const result = onDropAndMerge(dragging.elementName, dragging.x, dragging.y, nearest.id)
        if (result) {
          setMergeAnimation({ x: (dragging.x + nearest.x) / 2, y: (dragging.y + nearest.y) / 2 })
          setTimeout(() => setMergeAnimation(null), 600)
        } else {
          const newId = onDrop(dragging.elementName, dragging.x, dragging.y)
          setShakeId(newId)
          setTimeout(() => setShakeId(null), 400)
        }
      } else {
        onDrop(dragging.elementName, dragging.x, dragging.y)
      }
    } else if (dragging.source === 'playground' && dragging.itemId) {
      const nearest = findNearestItem(dragging.x, dragging.y, dragging.itemId)
      if (nearest) {
        const result = onMerge(dragging.itemId, nearest.id)
        if (result) {
          setMergeAnimation({ x: (dragging.x + nearest.x) / 2, y: (dragging.y + nearest.y) / 2 })
          setTimeout(() => setMergeAnimation(null), 600)
        } else {
          setShakeId(dragging.itemId)
          setTimeout(() => setShakeId(null), 400)
        }
      }
    }

    setDragging(null)
    setNearMergeId(null)
  }, [dragging, findNearestItem, onDrop, onMerge, onDropAndMerge])

  // === SORT ===
  const discoveredOrder = Array.from(discovered)
  const discoveredElements = discoveredOrder
    .map(name => elements.get(name))
    .filter((el): el is ElementDef => el !== undefined)
    .filter(el => {
      const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      return n(el.name).includes(n(search))
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const cmp = a.name.localeCompare(b.name, 'fr')
        return sortReverse ? -cmp : cmp
      }
      const ia = discoveredOrder.indexOf(a.name)
      const ib = discoveredOrder.indexOf(b.name)
      const cmp = ib - ia
      return sortReverse ? -cmp : cmp
    })

  const toggleSort = (type: SortType) => {
    if (sortBy === type) setSortReverse(prev => !prev)
    else { setSortBy(type); setSortReverse(false) }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* Dot grid — more visible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, oklch(0.6 0.01 250 / 0.18) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* PLAYGROUND ITEMS */}
      {items.map((item, index) => {
        const el = elements.get(item.element)
        if (!el) return null
        const isDragging = dragging?.source === 'playground' && dragging.itemId === item.id
        const isNear = nearMergeId === item.id
        const isShaking = shakeId === item.id
        return (
          <div
            key={item.id}
            className={`absolute select-none cursor-grab active:cursor-grabbing ${isShaking ? 'animate-shake' : ''}`}
            style={{
              left: item.x,
              top: item.y,
              zIndex: isDragging ? 1000 : 10 + index,
              transform: isDragging ? 'scale(1.08)' : isNear ? 'scale(1.05)' : 'scale(1)',
              transition: isDragging ? 'none' : 'transform 0.15s',
              filter: isNear ? `drop-shadow(0 0 10px ${el.color}80)` : undefined,
            }}
            onPointerDown={e => handlePointerDown(e, item.element, item.id)}
            onDoubleClick={() => onRemove(item.id)}
          >
                <ElementBadge element={el} size={playgroundBadgeSize} />
          </div>
        )
      })}

      {/* GHOST (inventory drag) */}
      {dragging?.source === 'inventory' && elements.get(dragging.elementName) && (
        <div
          className="absolute pointer-events-none"
          style={{ left: dragging.x, top: dragging.y, zIndex: 9999, transform: 'scale(1.05)', opacity: 0.9 }}
        >
              <ElementBadge element={elements.get(dragging.elementName)!} size={playgroundBadgeSize} />
        </div>
      )}

      {/* MERGE ANIMATION - flash ring only, no badge duplicate */}
      {mergeAnimation && (
        <div
          className="absolute pointer-events-none"
          style={{ left: mergeAnimation.x, top: mergeAnimation.y, zIndex: 250, transform: 'translate(-50%, -50%)' }}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full animate-ping" style={{ backgroundColor: 'white', opacity: 0.15 }} />
            <div className="absolute w-10 h-10 rounded-full animate-ping" style={{ backgroundColor: 'white', opacity: 0.25, animationDelay: '80ms' }} />
          </div>
        </div>
      )}



      {/* INVENTORY PANEL */}
      <div
        ref={inventoryRef}
        className="absolute bottom-0 left-0 right-0 md:bottom-0 md:left-auto md:top-0 md:right-0 md:h-full md:w-[300px] lg:w-[400px] bg-card/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-border flex flex-col"
        style={{
          zIndex: 100,
          height: isMobile ? (inventoryHeight != null ? `${inventoryHeight}px` : '55vh') : undefined,
        }}
      >
        {/* Drag handle — mobile only */}
        {isMobile && (
          <div
            className="flex-shrink-0 flex items-center justify-center h-6 cursor-row-resize touch-none select-none active:bg-muted/30 transition-colors"
            onPointerDown={handleDragHandlePointerDown}
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
        )}

        {/* Header — always visible */}
        <div className="flex-shrink-0 px-3 pt-3 pb-3 border-b border-border flex flex-col gap-2.5">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Elementz" className="w-6 h-6 rounded-full flex-shrink-0" />
            <span className="font-bold text-sm tracking-tight">Elementz</span>
            <span className="text-xs tabular-nums text-muted-foreground" suppressHydrationWarning>
              {discovered.size}<span className="opacity-40">/{totalElements}</span>
            </span>
          </div>
          {activeTab === 'home' && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
                  className="w-full h-9 pl-9 pr-8 bg-muted/50 border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
                  style={{ fontSize: '16px' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button onClick={() => toggleSort('name')} className={`flex items-center gap-1 h-9 px-2.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${sortBy === 'name' ? 'bg-foreground/10 border-foreground/30 text-foreground' : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'}`}>
                <ArrowUpDown className="w-3 h-3" />
                {lang === 'fr' ? 'Nom' : 'Name'}
                {sortBy === 'name' && (sortReverse ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
              </button>
              <button onClick={() => toggleSort('recent')} className={`flex items-center gap-1 h-9 px-2.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${sortBy === 'recent' ? 'bg-foreground/10 border-foreground/30 text-foreground' : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'}`}>
                {lang === 'fr' ? 'Récent' : 'Recent'}
                {sortBy === 'recent' && (sortReverse ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
              </button>
            </div>
          )}
        </div>

        {/* Chevron row — mobile home tab only, above the grid */}
        {isMobile && activeTab === 'home' && (
          <ChevronScrollBar scrollRef={inventoryScrollRef} />
        )}

        {/* Scrollable content area — switches between home grid and tab panels */}
        <div className="flex-1 min-h-0">
          <div
            ref={inventoryScrollRef}
            className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-none"
          >
            {activeTab === 'home' ? (
              <div className="p-2">
                <div className="grid grid-cols-4 md:grid-cols-3 gap-1.5">
                  {discoveredElements.map((element) => (
                    <div
                      key={element.name}
                      className="cursor-grab active:cursor-grabbing select-none"
                      onPointerDown={e => handleInventoryPointerDown(e, element.name)}
                    >
                      <ElementBadge element={element} size={isMobile ? 'sm' : 'md'} fluid />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-4">
                {activeTab === 'leaderboard' && <LeaderboardInlinePanel lang={lang} />}
                {activeTab === 'settings' && (
                  <SettingsPanel
                    lang={lang}
                    onSetLang={onSetLang}
                    hintsEnabled={hintsEnabled}
                    onToggleHints={onToggleHints}
                    onClear={onClear}
                    itemsCount={items.length}
                  />
                )}
                {activeTab === 'help' && (
                  <HelpPanel lang={lang} />
                )}
                {activeTab === 'profile' && sessionUser && (
                  <ProfileInlinePanel
                    lang={lang}
                    sessionUser={sessionUser}
                    elements={elements}
                    onOpenFull={() => { setActiveTab('home'); setProfileOpen(true) }}
                  />
                )}
                {activeTab === 'profile' && !sessionUser && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                      <User className="w-6 h-6 text-foreground/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">{lang === 'fr' ? 'Non connecté' : 'Not signed in'}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{lang === 'fr' ? 'Connecte-toi pour sauvegarder ta progression' : 'Sign in to save your progress'}</p>
                    </div>
                    <form action={signInWithGoogle}>
                      <button
                        type="submit"
                        className="flex items-center gap-2.5 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        {lang === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── TAB BAR (all screen sizes) ─────────────────────────── */}
        <div
          className="flex-shrink-0 border-t border-border bg-card/95 backdrop-blur-xl"
          style={{ paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 16px) + 4px)' : undefined }}
        >
          <div className="flex items-stretch">
            {([
              { id: 'home',        icon: Home,        labelFr: 'Jeu',      labelEn: 'Play'     },
              { id: 'leaderboard', icon: Trophy,       labelFr: 'Scores',   labelEn: 'Scores'   },
              { id: 'settings',    icon: Settings,     labelFr: 'Réglages', labelEn: 'Settings' },
              { id: 'help',        icon: HelpCircle,   labelFr: 'Aide',     labelEn: 'Help'     },
              { id: 'profile',     icon: User,         labelFr: 'Profil',   labelEn: 'Profile'  },
            ] as const).map(({ id, icon: Icon }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(prev => prev === id && id !== 'home' ? 'home' : id)}
                  className="flex-1 flex flex-col items-center justify-center py-3 relative transition-colors"
                >
                  <Icon
                    className={`w-6 h-6 transition-all ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Modals */}
      {helpOpen && <HelpModal lang={lang} onSetLang={onSetLang} onClose={() => setHelpOpen(false)} />}
      {leaderboardOpen && <LeaderboardModal lang={lang} onClose={() => setLeaderboardOpen(false)} />}
      {profileOpen && sessionUser && <ProfileModal lang={lang} sessionUser={sessionUser} elements={elements} onClose={() => setProfileOpen(false)} />}
    </div>
  )
}

// ============================================================
// Chevron scroll bar — hold to scroll, tap = 1 row
// ============================================================

const MIN_SPEED = 80   // px/s at start
const MAX_SPEED = 800  // px/s at full hold
const ACCEL_TIME = 1500 // ms to reach max speed

function ChevronScrollBar({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const startScroll = (dir: 1 | -1) => {
    const now = performance.now()
    startTimeRef.current = now
    lastTimeRef.current = now

    const tick = (t: number) => {
      const el = scrollRef.current
      if (!el) return
      const elapsed = t - startTimeRef.current
      // ease-in: speed ramps from MIN to MAX over ACCEL_TIME
      const progress = Math.min(elapsed / ACCEL_TIME, 1)
      const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * progress * progress
      const dt = (t - lastTimeRef.current) / 1000 // seconds since last frame
      lastTimeRef.current = t
      el.scrollTop += dir * speed * dt
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const stopScroll = () => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  return (
    <div className="flex flex-shrink-0 border-b border-border">
      <button
        className="flex-1 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 active:bg-muted/60 transition-colors border-r border-border"
        onPointerDown={e => { e.preventDefault(); startScroll(-1) }}
        onPointerUp={stopScroll}
        onPointerLeave={stopScroll}
        onPointerCancel={stopScroll}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      <button
        className="flex-1 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 active:bg-muted/60 transition-colors"
        onPointerDown={e => { e.preventDefault(); startScroll(1) }}
        onPointerUp={stopScroll}
        onPointerLeave={stopScroll}
        onPointerCancel={stopScroll}
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  )
}

// ============================================================
// Inline tab panels
// ============================================================

function LeaderboardInlinePanel({ lang }: { lang: 'fr' | 'en' }) {
  const [entries, setEntries] = useState<Array<{ user_id: string; username: string | null; avatar_img: string | null; count: number }>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => { setEntries(d.leaderboard ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  return (
    <div className="space-y-1">
      {loading ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-border border-t-foreground/40 rounded-full animate-spin" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{lang === 'fr' ? "Aucun joueur pour l'instant." : 'No players yet.'}</p>
      ) : (
        <ul className="space-y-2">
          {entries.slice(0, 10).map((e, i) => (
            <li key={e.user_id} className="flex items-center gap-3">
              <span className="w-6 text-sm text-muted-foreground text-right tabular-nums flex-shrink-0">{i + 1}</span>
              <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden p-0.5 flex-shrink-0">
                {e.avatar_img ? <img src={e.avatar_img} alt="" className="w-full h-full object-contain" /> : <span className="text-[10px] font-bold text-muted-foreground">{(e.username ?? '?').slice(0, 2).toUpperCase()}</span>}
              </div>
              <span className="flex-1 text-sm text-foreground truncate">{e.username ?? (lang === 'fr' ? `Joueur #${i + 1}` : `Player #${i + 1}`)}</span>
              <span className="text-sm font-bold tabular-nums text-foreground flex-shrink-0">{e.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SettingsPanel({ lang, onSetLang, hintsEnabled, onToggleHints, onClear, itemsCount }: {
  lang: 'fr' | 'en'; onSetLang: (l: 'fr' | 'en') => void
  hintsEnabled?: boolean; onToggleHints?: () => void
  onClear: () => void; itemsCount: number
}) {
  return (
    <div className="space-y-5 py-1">
      {/* Language */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{lang === 'fr' ? 'Langue' : 'Language'}</span>
        <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1 h-9 gap-0.5">
          <button className={`px-4 h-full text-sm font-semibold rounded-lg transition-colors ${lang === 'fr' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`} onClick={() => onSetLang('fr')}>FR</button>
          <button className={`px-4 h-full text-sm font-semibold rounded-lg transition-colors ${lang === 'en' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`} onClick={() => onSetLang('en')}>EN</button>
        </div>
      </div>
      {/* Hints */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-foreground">{lang === 'fr' ? 'Indices' : 'Hints'}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{lang === 'fr' ? 'Surligne les combinaisons' : 'Highlight combinations'}</p>
        </div>
        <button
          onClick={onToggleHints}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${hintsEnabled ? 'bg-foreground' : 'bg-muted-foreground/30'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-all ${hintsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {/* Clear */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-foreground">{lang === 'fr' ? 'Vider le terrain' : 'Clear playground'}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{lang === 'fr' ? `${itemsCount} élément${itemsCount !== 1 ? 's' : ''} en jeu` : `${itemsCount} item${itemsCount !== 1 ? 's' : ''} on canvas`}</p>
        </div>
        <button onClick={onClear} disabled={itemsCount === 0} className="h-9 px-4 rounded-xl bg-muted/50 border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
          {lang === 'fr' ? 'Vider' : 'Clear'}
        </button>
      </div>
    </div>
  )
}

function HelpPanel({ lang }: { lang: 'fr' | 'en' }) {
  return (
    <div className="space-y-5">

      {/* Video */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {lang === 'fr'
            ? 'Glisse un élément sur un autre pour les combiner et découvrir de nouveaux éléments.'
            : 'Drag one element onto another to combine them and discover new ones.'}
        </p>
        <div className="rounded-xl overflow-hidden border border-border bg-muted/30">
          <video src="/tutohelp.webm" autoPlay loop muted playsInline className="w-full h-auto block" />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Hints & Clear */}
      <div className="space-y-2">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-0.5">{lang === 'fr' ? 'Indices' : 'Hints'}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === 'fr'
                ? 'Une suggestion arrive automatiquement après 1 min sans nouvelle découverte.'
                : 'A suggestion appears automatically after 1 min without a new discovery.'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border">
          <div className="w-9 h-9 rounded-xl bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-0.5">{lang === 'fr' ? 'Vider' : 'Clear'}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === 'fr'
                ? 'Bouton en haut à gauche du terrain pour retirer tous les éléments.'
                : 'Button top-left of the canvas to remove all elements at once.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

function ProfileInlinePanel({ lang, sessionUser, elements, onOpenFull }: {
  lang: 'fr' | 'en'
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
  elements: Map<string, ElementDef>
  onOpenFull: () => void
}) {
  const [avatarImg, setAvatarImg] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      setUsername(d.username ?? null)
      setCount(d.discovered_count ?? 0)
      if (d.avatar) {
        const el = elements.get(d.avatar)
        if (el?.imageUrl) setAvatarImg(el.imageUrl)
      }
    }).catch(() => {})
  }, [elements])

  const displayName = username || sessionUser.name?.split(' ')[0] || (lang === 'fr' ? 'Joueur' : 'Player')

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden p-1.5 flex-shrink-0">
        {avatarImg ? <img src={avatarImg} alt="" className="w-full h-full object-contain" /> : <span className="text-sm font-bold text-muted-foreground">{displayName[0]?.toUpperCase()}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground">{count} {lang === 'fr' ? 'éléments découverts' : 'elements discovered'}</p>
      </div>
      <button onClick={onOpenFull} className="h-8 px-3 rounded-xl bg-muted/50 border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
        {lang === 'fr' ? 'Modifier' : 'Edit'}
      </button>
    </div>
  )
}
