'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ElementBadge } from './element-badge'
import { Search, X, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, Lightbulb, Trash2, Pencil, Check, LogOut, Eye, EyeOff, Hand, MousePointer, Medal, Atom as AtomIcon, Star, Shield, Trophy } from 'lucide-react'
import { HouseSimple, Bell, Gear, Lifebuoy, Question, User, UserCircle, Scroll } from '@phosphor-icons/react'
import type { ElementDef, PlaygroundItem } from '@/lib/game-data'
import { HelpModal } from './help-modal'
import { LeaderboardModal } from './leaderboard-modal'
import { ProfileModal } from './profile-modal'
import { QuestInlinePanel } from './quest-panel'
import EmailSignIn from '@/components/email-sign-in'
import { signInWithGoogle, signInWithDiscord } from '@/app/actions/auth'
import { signOut } from 'next-auth/react'

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
  hapticEnabled?: boolean
  onToggleHaptic?: () => void
  onTapModeChange?: (enabled: boolean) => void
  // Mobile header notifications
  headerNotification?: {
    type: 'discovery' | 'hint' | 'progress' | 'tapMode' | 'hintsToggle'
    message: string
    icon?: React.ReactNode
    image?: string
    color?: string
  } | null
  onDismissNotification?: () => void
  playgroundItemsCount?: number
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
  hapticEnabled = true, onToggleHaptic, onTapModeChange,
  headerNotification, onDismissNotification, playgroundItemsCount = 0,
}: PlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inventoryRef = useRef<HTMLDivElement>(null)
  const inventoryScrollRef = useRef<HTMLDivElement>(null)

  const [tabAvatarKey, setTabAvatarKey] = useState<string | null>(null)
  const [gridCols, setGridColsState] = useState<3 | 4 | 5>(4)
  const [tapMode, setTapModeState] = useState(true)
  const [mergeFlashEnabled, setMergeFlashEnabledState] = useState(true)
  const tapSlotRef = useRef(0)

  useEffect(() => {
    const stored = localStorage.getItem('inventoryGridCols')
    if (stored === '3' || stored === '4' || stored === '5') setGridColsState(Number(stored) as 3 | 4 | 5)
    const tap = localStorage.getItem('tapMode')
    if (tap !== null) setTapModeState(tap === '1')
    else setTapModeState(true)
    const flash = localStorage.getItem('mergeFlash')
    if (flash !== null) setMergeFlashEnabledState(flash !== '0')
  }, [])

  const setGridCols = (n: 3 | 4 | 5) => {
    setGridColsState(n)
    localStorage.setItem('inventoryGridCols', String(n))
  }
  const setTapMode = (v: boolean) => {
    setTapModeState(v)
    localStorage.setItem('tapMode', v ? '1' : '0')
    onTapModeChange?.(v)
  }
  const setMergeFlashEnabled = (v: boolean) => {
    setMergeFlashEnabledState(v)
    localStorage.setItem('mergeFlash', v ? '1' : '0')
  }
  useEffect(() => {
    if (!sessionUser?.email) return
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        if (d.avatar) { setTabAvatarKey(d.avatar); return }
        const starting = lang === 'fr' ? STARTING_FR : STARTING_EN
        setTabAvatarKey(starting[Math.abs(hashStr(sessionUser.email ?? 'x')) % 4])
      })
      .catch(() => {})
  }, [sessionUser?.email, lang])

  // Reset tap grid slot counter when canvas is emptied
  useEffect(() => {
    if (items.length === 0) tapSlotRef.current = 0
  }, [items.length])
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [playgroundFlash, setPlaygroundFlash] = useState<'success' | 'fail' | null>(null)
  const isMobile = useIsMobile()
  const playgroundBadgeSize = isMobile ? 'sm' : 'lg'
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('name')
  const [sortReverse, setSortReverse] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'quests' | 'settings' | 'help' | 'profile'>('home')
  const [profileView, setProfileView] = useState<'profile' | 'leaderboard'>('profile')
  const [questBadge, setQuestBadge] = useState(false)

  // Poll quest readiness every 30s to show badge dot
  useEffect(() => {
    if (!sessionUser) return
    const check = async () => {
      try {
        const res = await fetch('/api/quests')
        const data = await res.json()
        const hasReady = (data.quests ?? []).some((q: { claimed_at: string | null; progress: number; target_value: number; rewards?: { scratched_at: string | null }[] }) =>
          (!q.claimed_at && q.progress >= q.target_value) ||
          (q.claimed_at && (q.rewards ?? []).some(r => !r.scratched_at))
        )
        setQuestBadge(hasReady)
      } catch {}
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [sessionUser])

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
          setMergeAnimation({ x: nearest.x, y: nearest.y })
          setPlaygroundFlash('success')
          setTimeout(() => { setMergeAnimation(null); setPlaygroundFlash(null) }, 600)
        } else {
          const newId = onDrop(dragging.elementName, dragging.x, dragging.y)
          setShakeId(newId)
          setPlaygroundFlash('fail')
          setTimeout(() => { setShakeId(null); setPlaygroundFlash(null) }, 500)
        }
      } else {
        onDrop(dragging.elementName, dragging.x, dragging.y)
      }
    } else if (dragging.source === 'playground' && dragging.itemId) {
      // Always commit drag position to store first — item.x/y was never updated during drag
      onMove(dragging.itemId, dragging.x, dragging.y)
      const nearest = findNearestItem(dragging.x, dragging.y, dragging.itemId)
      if (nearest) {
        const result = onMerge(dragging.itemId, nearest.id)
        if (result) {
          setMergeAnimation({ x: nearest.x, y: nearest.y })
          setPlaygroundFlash('success')
          setTimeout(() => { setMergeAnimation(null); setPlaygroundFlash(null) }, 600)
        } else {
          setShakeId(dragging.itemId)
          setPlaygroundFlash('fail')
          setTimeout(() => { setShakeId(null); setPlaygroundFlash(null) }, 500)
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
      style={{ touchAction: 'none', contain: 'layout style paint' }}
    >
      {/* Preload help video so it's buffered before the tab opens */}
      <video src="/tutohelp.webm" preload="auto" muted playsInline className="hidden" aria-hidden="true" />
      {/* Canvas area — dot grid + flash overlay, clipped to the actual play area (excludes inventory) */}
      <div
        className="absolute inset-0 md:right-[300px] lg:right-[400px] pointer-events-none overflow-hidden"
        style={{ bottom: isMobile ? (inventoryHeight != null ? `${inventoryHeight}px` : '55vh') : 0 }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, oklch(0.6 0.01 250 / 0.18) 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Merge flash — only within the play area */}
        {mergeFlashEnabled && playgroundFlash && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: playgroundFlash === 'success'
                ? 'oklch(0.72 0.17 145 / 0.18)'
                : 'oklch(0.63 0.22 25 / 0.18)',
              animation: 'mergeFlash 0.5s ease-out forwards',
            }}
          />
        )}
      </div>

      {/* PLAYGROUND ITEMS */}
      {items.map((item, index) => {
        const el = elements.get(item.element)
        if (!el) return null
        const isDragging = dragging?.source === 'playground' && dragging.itemId === item.id
        const isNear = nearMergeId === item.id
        const isShaking = shakeId === item.id
        const scale = isDragging ? 1.08 : isNear ? 1.05 : 1
        // While dragging, use live dragging coords — avoids flash when setDragging(null) and store update are in different render cycles
        const x = isDragging ? dragging.x : item.x
        const y = isDragging ? dragging.y : item.y
        return (
          <div
            key={item.id}
            className="absolute select-none cursor-grab active:cursor-grabbing"
            style={{
              left: 0,
              top: 0,
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
              zIndex: isDragging ? 1000 : 10 + index,
              transition: isDragging ? 'none' : 'transform 0.15s',
              filter: isNear ? `drop-shadow(0 0 10px ${el.color}80)` : undefined,
              willChange: isDragging ? 'transform' : undefined,
              contain: 'layout style',
            }}
            onPointerDown={e => handlePointerDown(e, item.element, item.id)}
            onDoubleClick={() => onRemove(item.id)}
          >
            {/* Inner wrapper carries the shake animation — keeps outer translate(x,y) intact */}
            <div className={isShaking ? 'animate-shake' : undefined}>
              <ElementBadge element={el} size={playgroundBadgeSize} />
            </div>
          </div>
        )
      })}

      {/* GHOST (inventory drag) */}
      {dragging?.source === 'inventory' && elements.get(dragging.elementName) && (
        <div
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, transform: `translate(${dragging.x}px, ${dragging.y}px) scale(1.05)`, zIndex: 9999, opacity: 0.9, willChange: 'transform' }}
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
        {/* Drag handle — mobile only, also triggers resize */}
        {isMobile && (
          <div
            className="flex-shrink-0 flex items-center justify-center h-6 touch-none select-none"
            onPointerDown={handleDragHandlePointerDown}
            style={{ cursor: 'row-resize', touchAction: 'none' }}
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
        )}

        {/* Header — always visible, drag to resize on mobile */}
        <div
          className="flex-shrink-0 px-3 pt-3 pb-3 border-b border-border flex flex-col gap-2.5"
          onPointerDown={isMobile ? handleDragHandlePointerDown : undefined}
          style={isMobile ? { cursor: 'row-resize', touchAction: 'none' } : undefined}
        >
          {/* Mobile: Show notification OR logo row with action buttons */}
          {isMobile && headerNotification ? (
            <div
              className="flex items-center gap-2 cursor-pointer animate-in fade-in duration-200"
              onClick={onDismissNotification}
              style={{ transform: 'translateY(-3px)' }}
            >
              {/* Clear button left */}
              <button
                onClick={e => { e.stopPropagation(); onClear() }}
                className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${playgroundItemsCount > 0 ? 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted' : 'opacity-30 pointer-events-none'}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {/* Notification content */}
              <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
                {headerNotification.icon}
                <span className="text-xs text-muted-foreground truncate">{headerNotification.message}</span>
                {headerNotification.image && (
                  <img src={headerNotification.image} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                )}
              </div>
              {/* Hint button right */}
              <button
                onClick={e => { e.stopPropagation(); onRequestHint?.() }}
                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isMobile ? (
            <div className="flex items-center gap-2" style={{ transform: 'translateY(-3px)' }}>
              {/* Clear button left */}
              <button
                onClick={onClear}
                className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${playgroundItemsCount > 0 ? 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted' : 'opacity-30 pointer-events-none'}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {/* Logo + title + counter */}
              <div className="flex-1 flex items-center justify-center gap-2">
                <img src="/logo.png" alt="Elementz" className="w-6 h-6 rounded-full flex-shrink-0 pointer-events-none select-none" draggable={false} />
                <span className="font-bold text-sm tracking-tight">Elementz</span>
                <span className="text-xs tabular-nums text-muted-foreground" suppressHydrationWarning>
                  {discovered.size}<span className="opacity-40">/{totalElements}</span>
                </span>
              </div>
              {/* Hint button right */}
              <button
                onClick={onRequestHint}
                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Desktop: Original centered logo */
            <div className="flex items-center justify-center gap-2" style={{ transform: 'translateY(-3px)' }}>
              <img src="/logo.png" alt="Elementz" className="w-7 h-7 rounded-full flex-shrink-0 pointer-events-none select-none" draggable={false} />
              <span className="font-bold text-base tracking-tight">Elementz</span>
              <span className="text-sm tabular-nums text-muted-foreground" suppressHydrationWarning>
                {discovered.size}<span className="opacity-40">/{totalElements}</span>
              </span>
            </div>
          )}
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
                  onPointerDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
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
              <button
                onClick={() => setTapMode(!tapMode)}
                onPointerDown={e => e.stopPropagation()}
                title={tapMode ? (lang === 'fr' ? 'Passer en mode drag' : 'Switch to drag mode') : (lang === 'fr' ? 'Passer en mode tap' : 'Switch to tap mode')}
                className="flex items-center justify-center h-9 w-9 rounded-xl border bg-muted/50 border-border text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                {tapMode
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0"/><path d="M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v0"/><path d="M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v6"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/></svg>
                }
              </button>
            </div>
          )}
        </div>

        {/* Chevron row — only in drag mode, mobile home tab */}
        {isMobile && activeTab === 'home' && !tapMode && (
          <ChevronScrollBar scrollRef={inventoryScrollRef} />
        )}

        {/* Scrollable content area — home: chevron-controlled in drag mode / free scroll in tap mode */}
        <div className="flex-1 min-h-0">
          {activeTab === 'home' ? (
            <div
              ref={inventoryScrollRef}
              className={`h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${tapMode ? '' : 'touch-none'}`}
            >
              <div className="p-2">
                <div className={`grid gap-1.5 ${gridCols === 3 ? 'grid-cols-3' : gridCols === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  {discoveredElements.map((element) => (
                    <div
                      key={element.name}
                      className={tapMode ? 'cursor-pointer active:scale-95 transition-transform select-none' : 'cursor-grab active:cursor-grabbing select-none'}
                      {...(tapMode
                        ? {
                            onClick: () => {
                              const rect = containerRef.current?.getBoundingClientRect()
                              if (!rect) return
                              const COLS = 4
                              const ROWS = 4 // 4x4 = 16 slots before fallback
                              const BADGE_W = 72
                              const BADGE_H = 72
                              const GAP = 12
                              const PAD_X = 0 // Flush left
                              const PAD_Y = 16
                              
                              // Find first empty slot that doesn't overlap existing items
                              const isSlotFree = (cx: number, cy: number) => {
                                const threshold = BADGE_W * 0.6 // Allow some tolerance
                                return !items.some(item => {
                                  const dx = Math.abs(item.x - cx)
                                  const dy = Math.abs(item.y - cy)
                                  return dx < threshold && dy < threshold
                                })
                              }
                              
                              let placed = false
                              for (let row = 0; row < ROWS && !placed; row++) {
                                for (let col = 0; col < COLS && !placed; col++) {
                                  const cx = PAD_X + col * (BADGE_W + GAP) + BADGE_W / 2
                                  const cy = PAD_Y + row * (BADGE_H + GAP) + BADGE_H / 2
                                  if (isSlotFree(cx, cy)) {
                                    onDrop(element.name, cx, cy)
                                    placed = true
                                  }
                                }
                              }
                              
                              // Fallback: place at a random position if all slots occupied
                              if (!placed) {
                                const cx = PAD + Math.random() * (rect.width - PAD * 2 - BADGE_W)
                                const cy = PAD + Math.random() * (rect.height * 0.4)
                                onDrop(element.name, cx, cy)
                              }
                            },
                          }
                        : {
                            onPointerDown: (e: React.PointerEvent) => handleInventoryPointerDown(e, element.name),
                          }
                      )}
                    >
                      <ElementBadge element={element} size={isMobile ? 'sm' : 'md'} fluid />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="px-4 py-4">
                {activeTab === 'quests' && sessionUser && <QuestInlinePanel lang={lang} />}
                {activeTab === 'quests' && !sessionUser && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                      <Scroll size={24} weight="regular" className="text-foreground/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">{lang === 'fr' ? 'Non connecté' : 'Not signed in'}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{lang === 'fr' ? 'Connecte-toi pour accéder aux quêtes' : 'Sign in to access quests'}</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <form action={signInWithGoogle}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                          <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          {lang === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
                        </button>
                      </form>
                      <form action={signInWithDiscord}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-[#5865F2] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          {lang === 'fr' ? 'Continuer avec Discord' : 'Continue with Discord'}
                        </button>
                      </form>
                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">{lang === 'fr' ? 'ou par email' : 'or by email'}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <EmailSignIn lang={lang} />
                    </div>
                  </div>
                )}
                {activeTab === 'settings' && (
                  <SettingsPanel
                    lang={lang}
                    onSetLang={onSetLang}
                    hintsEnabled={hintsEnabled}
                    onToggleHints={onToggleHints}
                    onClear={onClear}
                    itemsCount={items.length}
                    gridCols={gridCols}
                    onSetGridCols={setGridCols}
                    tapMode={tapMode}
                    onToggleTapMode={() => setTapMode(!tapMode)}
                    hapticEnabled={hapticEnabled}
                    onToggleHaptic={onToggleHaptic}
                    mergeFlashEnabled={mergeFlashEnabled}
                    onToggleMergeFlash={() => setMergeFlashEnabled(!mergeFlashEnabled)}
                  />
                )}
                {activeTab === 'help' && (
                  <HelpPanel lang={lang} />
                )}
                {activeTab === 'profile' && sessionUser && (
                  profileView === 'leaderboard'
                    ? <LeaderboardInlinePanel lang={lang} onBack={() => setProfileView('profile')} />
                    : <ProfileInlinePanel
                        lang={lang}
                        sessionUser={sessionUser}
                        elements={elements}
                        onAvatarChange={setTabAvatarKey}
                        onOpenLeaderboard={() => setProfileView('leaderboard')}
                      />
                )}
                {activeTab === 'profile' && !sessionUser && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                      <UserCircle size={24} weight="regular" className="text-foreground/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">{lang === 'fr' ? 'Non connecté' : 'Not signed in'}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{lang === 'fr' ? 'Connecte-toi pour sauvegarder ta progression' : 'Sign in to save your progress'}</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <form action={signInWithGoogle}>
                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
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
                      <form action={signInWithDiscord}>
                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-[#5865F2] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          {lang === 'fr' ? 'Continuer avec Discord' : 'Continue with Discord'}
                        </button>
                      </form>
                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">
                          {lang === 'fr' ? 'ou par email' : 'or by email'}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <EmailSignIn lang={lang} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── TAB BAR (all screen sizes) ─────────────────────────── */}
        <div
          className="flex-shrink-0 border-t border-border bg-card/95 backdrop-blur-xl"
          style={{ paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 16px) + 4px)' : undefined }}
        >
          <div className="flex items-stretch">
            {([
              { id: 'home',     icon: HouseSimple, labelFr: 'Jeu',      labelEn: 'Play'     },
              { id: 'quests',   icon: Bell,        labelFr: 'Quêtes',   labelEn: 'Quests'   },
              { id: 'settings', icon: Gear,        labelFr: 'Réglages', labelEn: 'Settings' },
              { id: 'help',     icon: Lifebuoy,    labelFr: 'Aide',     labelEn: 'Help'     },
              { id: 'profile',  icon: User,        labelFr: 'Profil',   labelEn: 'Profile'  },
            ] as const).map(({ id, icon: Icon }) => {
              const isActive = activeTab === id
              const isProfileWithUser = id === 'profile' && !!sessionUser
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(prev => {
                      const next = prev === id && id !== 'home' ? 'home' : id
                      if (next !== 'profile') setProfileView('profile')
                      return next
                    })
                    if (id === 'quests') setQuestBadge(false)
                  }}
                  className="flex-1 flex flex-col items-center justify-center py-3 relative transition-colors"
                >
                  {isProfileWithUser ? (() => {
                    const tabEl = tabAvatarKey ? elements.get(tabAvatarKey) : null
                    const oauthImg = (sessionUser as any).image as string | undefined
                    return (
                      <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all flex-shrink-0 bg-muted flex items-center justify-center ${isActive ? 'border-foreground' : 'border-muted-foreground/30'}`}
                        style={!oauthImg && tabEl?.color ? { backgroundColor: `${tabEl.color}22` } : undefined}
                      >
                        {oauthImg ? (
                          <img src={oauthImg} alt="" className="w-full h-full object-cover" draggable={false} />
                        ) : tabEl?.imageUrl ? (
                          <img src={tabEl.imageUrl} alt="" className="w-5 h-5 object-contain" draggable={false} />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">{(sessionUser.name ?? 'P')[0].toUpperCase()}</span>
                        )}
                      </div>
                    )
                  })() : (
                    <div className="relative">
                      <Icon
                        size={24}
                        weight={isActive ? 'fill' : 'regular'}
                        className={`transition-all ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                      />
                      {id === 'quests' && questBadge && !isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-card animate-pulse" />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Modals */}
      {helpOpen && <HelpModal lang={lang} onSetLang={onSetLang} onClose={() => setHelpOpen(false)} />}
      {leaderboardOpen && <LeaderboardModal lang={lang} onClose={() => setLeaderboardOpen(false)} />}
      {profileOpen && sessionUser && <ProfileModal lang={lang} sessionUser={sessionUser} elements={elements} onClose={() => setProfileOpen(false)} onOpenLeaderboard={() => { setProfileOpen(false); setLeaderboardOpen(true) }} />}
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
      const progress = Math.min(elapsed / ACCEL_TIME, 1)
      const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * progress * progress
      // clamp dt to max 32ms so a tab switch/freeze doesn't cause a huge jump
      const dt = Math.min(t - lastTimeRef.current, 32) / 1000
      lastTimeRef.current = t
      el.scrollTop += dir * speed * dt
      rafRef.current = requestAnimationFrame(tick)
    }

    // skip first frame so lastTimeRef is valid before first dt calculation
    rafRef.current = requestAnimationFrame(t => {
      lastTimeRef.current = t
      rafRef.current = requestAnimationFrame(tick)
    })
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

function LeaderboardInlinePanel({ lang, onBack }: { lang: 'fr' | 'en'; onBack?: () => void }) {
  const TOTAL = 593
  const [entries, setEntries] = useState<Array<{ user_id: string; username: string | null; avatar_img: string | null; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => { setEntries(d.leaderboard ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3
  const podiumHeights = [28, 40, 20] // px multiples for visual height
  const podiumRanks = top3.length === 3 ? [2, 1, 3] : [1, 2, 3]
  const rankColors: Record<number, string> = { 1: 'text-yellow-400', 2: 'text-zinc-400', 3: 'text-amber-600' }
  const podiumBg: Record<number, string> = { 1: 'border-yellow-400/30 bg-yellow-400/5', 2: 'border-zinc-400/20 bg-zinc-400/5', 3: 'border-amber-600/20 bg-amber-600/5' }

  return (
    <div className="flex flex-col gap-4 py-1">

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -mt-1 self-start"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        {t('Profil', 'Profile')}
      </button>

      {/* Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-4.5 h-4.5 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{t('Classement', 'Leaderboard')}</h2>
          <p className="text-xs text-muted-foreground">{entries.length} {t('joueurs', 'players')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{t("Aucun joueur pour l'instant.", 'No players yet.')}</p>
      ) : (
        <>
          {/* Podium top 3 */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-3 pt-2 pb-4">
              {podiumOrder.map((entry, idx) => {
                if (!entry) return null
                const rank = podiumRanks[idx]
                const height = podiumHeights[idx]
                const name = entry.username ?? t(`Joueur #${rank}`, `Player #${rank}`)
                const pct = Math.round((entry.count / TOTAL) * 100)
                return (
                  <div key={entry.user_id} className="flex flex-col items-center gap-2" style={{ flex: rank === 1 ? '0 0 38%' : '0 0 29%' }}>
                    {/* Avatar */}
                    <div className={`rounded-2xl border-2 flex items-center justify-center overflow-hidden p-2 ${podiumBg[rank]} ${rank === 1 ? 'w-16 h-16' : 'w-12 h-12'}`}
                      style={{ borderColor: rank === 1 ? 'rgb(250 204 21 / 0.5)' : rank === 2 ? 'rgb(161 161 170 / 0.3)' : 'rgb(217 119 6 / 0.3)' }}>
                      {entry.avatar_img
                        ? <img src={entry.avatar_img} alt={name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                        : <span className={`font-bold ${rank === 1 ? 'text-xl' : 'text-base'} ${rankColors[rank]}`}>{name.slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    {/* Name */}
                    <span className="text-xs font-semibold text-foreground truncate max-w-full text-center px-1">{name}</span>
                    {/* Podium block */}
                    <div className={`w-full rounded-t-xl border border-b-0 flex flex-col items-center justify-start pt-2 gap-0.5 ${podiumBg[rank]}`}
                      style={{ height: `${height + 40}px`, borderColor: rank === 1 ? 'rgb(250 204 21 / 0.3)' : rank === 2 ? 'rgb(161 161 170 / 0.2)' : 'rgb(217 119 6 / 0.2)' }}>
                      <span className={`text-base font-bold tabular-nums ${rankColors[rank]}`}>#{rank}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{entry.count}</span>
                      <span className="text-[10px] text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Rest of rankings */}
          {rest.length > 0 && (
            <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {rest.map((entry, i) => {
                const rank = i + 4
                const name = entry.username ?? t(`Joueur #${rank}`, `Player #${rank}`)
                const pct = Math.round((entry.count / TOTAL) * 100)
                return (
                  <div key={entry.user_id} className="flex items-center gap-3 px-4 py-3 bg-card">
                    <span className="w-6 text-xs font-bold text-muted-foreground text-right tabular-nums flex-shrink-0">{rank}</span>
                    <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
                      {entry.avatar_img
                        ? <img src={entry.avatar_img} alt={name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                        : <span className="text-[10px] font-bold text-muted-foreground">{name.slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground truncate">{name}</span>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-sm font-bold tabular-nums text-foreground">{entry.count}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SettingsPanel({ lang, onSetLang, hintsEnabled, onToggleHints, onClear, itemsCount, gridCols, onSetGridCols, tapMode, onToggleTapMode, hapticEnabled, onToggleHaptic, mergeFlashEnabled, onToggleMergeFlash }: {
  lang: 'fr' | 'en'; onSetLang: (l: 'fr' | 'en') => void
  hintsEnabled?: boolean; onToggleHints?: () => void
  onClear: () => void; itemsCount: number
  gridCols: 3 | 4 | 5; onSetGridCols: (n: 3 | 4 | 5) => void
  tapMode: boolean; onToggleTapMode: () => void
  hapticEnabled?: boolean; onToggleHaptic?: () => void
  mergeFlashEnabled: boolean; onToggleMergeFlash: () => void
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
      {/* Grid columns */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{lang === 'fr' ? 'Colonnes inventaire' : 'Inventory columns'}</span>
        <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1 h-9 gap-0.5">
          {([3, 4, 5] as const).map(n => (
            <button
              key={n}
              onClick={() => onSetGridCols(n)}
              className={`w-8 h-full text-sm font-semibold rounded-lg transition-colors ${gridCols === n ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {/* Tap mode */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-foreground">{lang === 'fr' ? 'Mode tap inventaire' : 'Tap inventory mode'}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{lang === 'fr' ? 'Tap pour poser sur le terrain' : 'Tap to place on canvas'}</p>
        </div>
        <button
          onClick={onToggleTapMode}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${!tapMode ? 'bg-muted-foreground/30' : ''}`}
          style={{ backgroundColor: tapMode ? '#10d9ae' : undefined }}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-all ${tapMode ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {/* Haptic feedback */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-foreground">{lang === 'fr' ? 'Vibration' : 'Haptic feedback'}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{lang === 'fr' ? 'Vibration sur découverte' : 'Vibrate on new discovery'}</p>
        </div>
        <button
          onClick={onToggleHaptic}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${hapticEnabled ? '' : 'bg-muted-foreground/30'}`}
          style={{ backgroundColor: hapticEnabled ? '#15e9ff' : undefined }}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-all ${hapticEnabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {/* Merge flash */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-foreground">{lang === 'fr' ? 'Flash fusion' : 'Merge flash'}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{lang === 'fr' ? 'Vert/rouge sur le terrain' : 'Green/red on the canvas'}</p>
        </div>
        <button
          onClick={onToggleMergeFlash}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${mergeFlashEnabled ? '' : 'bg-muted-foreground/30'}`}
          style={{ backgroundColor: mergeFlashEnabled ? '#fe8f27' : undefined }}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-all ${mergeFlashEnabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {/* Hints */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-foreground">{lang === 'fr' ? 'Indices' : 'Hints'}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{lang === 'fr' ? 'Surligne les combinaisons' : 'Highlight combinations'}</p>
        </div>
        <button
          onClick={onToggleHints}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${hintsEnabled ? '' : 'bg-muted-foreground/30'}`}
          style={{ backgroundColor: hintsEnabled ? '#ffc338' : undefined }}
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
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en
  return (
    <div className="flex flex-col gap-4 py-1">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0">
          <Question size={18} weight="regular" className="text-foreground/70" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{t('Comment jouer', 'How to play')}</h2>
          <p className="text-xs text-muted-foreground">{t('Alchimie en 3 minutes', 'Alchemy in 3 minutes')}</p>
        </div>
      </div>

      {/* Video */}
      <div className="rounded-2xl overflow-hidden border border-border bg-muted/20">
        <video
          src="/tutohelp.webm"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-auto block"
        />
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed px-1">
        {t(
          'Glisse un élément sur un autre pour les combiner. Chaque combinaison peut révéler un nouvel élément.',
          'Drag one element onto another to combine them. Each combination can reveal a new element.'
        )}
      </p>

      {/* Tips */}
      <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Indices automatiques', 'Auto hints')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Une suggestion apparaît après 1 min sans nouvelle découverte', 'A suggestion appears after 1 min without a new discovery')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Vider le terrain', 'Clear the board')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Retire tous les éléments posés en un clic — bouton en haut à gauche', 'Remove all placed elements in one tap — button top-left')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0">
            <Scroll size={16} weight="regular" className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Quêtes', 'Quests')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Accomplis des défis pour gagner des indices de recettes secrètes', 'Complete challenges to earn secret recipe hints')}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

function ProfileInlinePanel({ lang, sessionUser, elements, onAvatarChange, onOpenLeaderboard }: {
  lang: 'fr' | 'en'
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
  elements: Map<string, ElementDef>
  onAvatarChange?: (key: string) => void
  onOpenLeaderboard?: () => void
}) {
  const TOTAL_ELEMENTS = 593
  type ProfileData = {
    username: string | null
    show_in_leaderboard: boolean
    haptic_feedback: boolean
    discovered_count: number
    avatar: string | null
    rank: number | null
    total_players: number
    is_admin: boolean
    last_discovered: { name_french: string; name_english: string; img: string | null; discovered_at: string }[]
  }
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      setProfile(d)
      setNameInput(d.username ?? '')
    }).catch(() => {})
  }, [])

  function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h }
  const STARTERS = ['eau', 'feu', 'terre', 'air']
  const avatarKey = profile?.avatar ?? STARTERS[Math.abs(hashStr(sessionUser.email ?? 'x')) % 4]
  const avatarEl = elements.get(avatarKey)
  const displayName = profile?.username || sessionUser.name?.split(' ')[0] || t('Joueur', 'Player')
  const pct = profile ? Math.round((profile.discovered_count / TOTAL_ELEMENTS) * 100) : 0
  const allDiscovered = Array.from(elements.values()).filter(e => e.imageUrl)

  const saveName = async () => {
    if (!profile) return
    const trimmed = nameInput.trim()
    if (trimmed.length > 20) { setNameError(t('Max 20 caractères', 'Max 20 characters')); return }
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) { setNameError(t('Lettres, chiffres, _ et -', 'Letters, numbers, _ and -')); return }
    setSaving(true)
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: trimmed || null }) })
    if (!res.ok) { const d = await res.json(); setNameError(d?.error ?? t('Erreur', 'Error')); setSaving(false); return }
    setProfile(p => p ? { ...p, username: trimmed || null } : p)
    setEditingName(false); setNameError(''); setSaving(false)
  }

  const patch = async (fields: Record<string, unknown>) => {
    await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
  }

  const saveAvatar = (key: string) => {
    setProfile(p => p ? { ...p, avatar: key } : p)
    onAvatarChange?.(key)
    setPickingAvatar(false)
    patch({ avatar: key })
  }

  if (!profile) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-4 py-1">

      {/* Hero: avatar + name */}
      <div className="flex flex-col items-center gap-3 py-4">
        <button
          onClick={() => setPickingAvatar(v => !v)}
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-border p-3 group"
          style={{ background: avatarEl ? `${avatarEl.color}20` : 'var(--muted)' }}
        >
          {avatarEl?.imageUrl
            ? <img src={avatarEl.imageUrl} alt={avatarEl.name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
            : <span className="text-3xl font-bold text-muted-foreground">{displayName[0]?.toUpperCase()}</span>
          }
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
            <Pencil className="w-5 h-5 text-white" />
          </div>
        </button>

        {editingName ? (
          <div className="flex flex-col items-center gap-1.5 w-full max-w-[220px]">
            <div className="flex items-center gap-2 w-full">
              <input
                ref={inputRef}
                value={nameInput}
                onChange={e => { setNameInput(e.target.value); setNameError('') }}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                maxLength={20}
                placeholder={t('Ton pseudo', 'Your username')}
                className="flex-1 h-9 px-3 rounded-xl bg-muted border border-border text-sm text-center text-foreground outline-none focus:border-foreground/30 transition-colors"
                autoFocus
                autoComplete="off"
                style={{ fontSize: '16px' }}
              />
              <button onClick={saveName} disabled={saving} className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-50 flex-shrink-0">
                <Check className="w-4 h-4" />
              </button>
            </div>
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
          </div>
        ) : (
          <button onClick={() => { setEditingName(true); setTimeout(() => inputRef.current?.focus(), 50) }} className="flex items-center gap-1.5 group">
            <span className="text-lg font-bold text-foreground">{displayName}</span>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </button>
        )}
        <p className="text-xs text-muted-foreground/50">{sessionUser.email}</p>
      </div>

      {/* Avatar picker */}
      {pickingAvatar && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('Choisir un avatar', 'Choose an avatar')}</p>
          <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allDiscovered.map(el => {
              const isSelected = avatarKey === el.name
              return (
                <button key={el.name} onClick={() => saveAvatar(el.name)} title={el.name}
                  className={`aspect-square rounded-xl p-1.5 flex items-center justify-center border transition-all ${isSelected ? 'border-foreground/40 ring-2 ring-foreground/20' : 'bg-muted/40 border-transparent hover:border-border'}`}
                  style={{ background: `${el.color}18` }}
                >
                  <img src={el.imageUrl!} alt={el.name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card border border-border">
          <span className="text-2xl font-bold text-foreground tabular-nums">{profile.discovered_count}</span>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">{t('éléments', 'elements')}</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card border border-border">
          <span className="text-2xl font-bold text-foreground tabular-nums">{pct}%</span>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">{t('complété', 'complete')}</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card border border-border">
          <span className="text-2xl font-bold text-foreground tabular-nums">{profile.rank ? `#${profile.rank}` : '—'}</span>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">{t('rang', 'rank')}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t('Progression', 'Progress')}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{profile.discovered_count} / {TOTAL_ELEMENTS}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
        </div>
      </div>

      {/* Recent discoveries */}
      {profile.last_discovered.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          <div className="px-4 py-2.5 bg-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Dernières découvertes', 'Recent discoveries')}</p>
          </div>
          {profile.last_discovered.map((el, i) => {
            const name = lang === 'fr' ? el.name_french : el.name_english
            const diff = Date.now() - new Date(el.discovered_at).getTime()
            const mins = Math.floor(diff / 60000)
            const hours = Math.floor(diff / 3600000)
            const days = Math.floor(diff / 86400000)
            const ago = days > 0 ? t(`${days}j`, `${days}d`) : hours > 0 ? t(`${hours}h`, `${hours}h`) : t(`${mins}min`, `${mins}m`)
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-card">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted p-1 border border-border">
                  {el.img
                    ? <img src={el.img} alt={name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                    : <Atom className="w-4 h-4 text-muted-foreground" />
                  }
                </div>
                <span className="text-sm text-foreground font-medium flex-1 truncate">{name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{ago}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Leaderboard section */}
      <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
        <div
          onClick={onOpenLeaderboard}
          className="flex items-center gap-3 px-4 py-3.5 bg-card cursor-pointer active:bg-muted/60"
        >
          <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Classement', 'Leaderboard')}</p>
            {profile.rank && (
              <p className="text-xs text-muted-foreground">{t(`#${profile.rank} sur ${profile.total_players} joueurs`, `#${profile.rank} of ${profile.total_players} players`)}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Medal className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Visible dans le classement', 'Show in leaderboard')}</p>
          </div>
          <button
            onClick={() => { setProfile(p => p ? { ...p, show_in_leaderboard: !p.show_in_leaderboard } : p); patch({ show_in_leaderboard: !profile.show_in_leaderboard }) }}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${profile.show_in_leaderboard ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform duration-200 ${profile.show_in_leaderboard ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Admin panel link — only visible for admins */}
      {profile?.is_admin && (
        <div className="rounded-2xl border border-blue-500/20 overflow-hidden">
          <a
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-blue-500/5 cursor-pointer active:bg-blue-500/10"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-blue-400">{t('Panel admin', 'Admin panel')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400/50 flex-shrink-0" />
          </a>
        </div>
      )}

      {/* Sign out */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => { try { localStorage.removeItem('alchemy-discovered-v3') } catch {} signOut({ callbackUrl: '/' }) }}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-card cursor-pointer active:bg-muted/60"
        >
          <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-sm font-medium text-red-400">{t('Se déconnecter', 'Sign out')}</span>
        </button>
      </div>

    </div>
  )
}

