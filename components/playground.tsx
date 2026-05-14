'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ElementBadge } from './element-badge'
import { Search, X, ArrowLeft, ChevronUp, ChevronDown, ChevronRight, Lightbulb, Trash2, Pencil, Check, LogOut, Eye, EyeOff, Medal, Atom as AtomIcon, Star, Shield, Trophy, Sun, Moon, Play, Info } from 'lucide-react'
import { HouseSimple, Bell, Gear, Lifebuoy, Question, User, UserCircle, Scroll, Books, Hand, Lightning } from '@phosphor-icons/react'
import type { ElementDef, PlaygroundItem } from '@/lib/game-data'
import { HelpModal } from './help-modal'
import { LeaderboardModal } from './leaderboard-modal'
import { ProfileModal } from './profile-modal'
import { QuestInlinePanel } from './quest-panel'
import { CodexInlinePanel } from './codex-panel'
import EmailSignIn from '@/components/email-sign-in'
import { signInWithGoogle, signInWithDiscord } from '@/app/actions/auth'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { AreaChart, Area, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

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
  elements: Map<number, ElementDef>
  /** Keyed by current-lang name — used for AvatarButton and other name-based lookups */
  elementsByName: Map<string, ElementDef>
  discovered: Set<number>
  totalElements: number
  lang: 'fr' | 'en'
  onSetLang: (l: 'fr' | 'en') => void
  onDrop: (elementNum: number, x: number, y: number) => string
  onMove: (id: string, x: number, y: number) => void
  onMerge: (id1: string, id2: string) => number | null
  onDropAndMerge: (elementNum: number, x: number, y: number, targetId: string) => number | null
  onRemove: (id: string) => void
  onClear: () => void
  onReset: () => void
  onUnlockAll: () => void
  sessionUser?: { id?: string | null; name?: string | null; email?: string | null; image?: string | null } | null
  hintsEnabled?: boolean
  onToggleHints?: () => void
  onRequestHint?: () => void
  hintShouldPulse?: boolean
  hintAdLocked?: boolean
  hapticEnabled?: boolean
  onToggleHaptic?: () => void
  pushNotificationsEnabled?: boolean
  onTogglePushNotifications?: () => void
  suppressUnlockNotif?: boolean
  onToggleSuppressUnlockNotif?: () => void
  onTapModeChange?: (enabled: boolean) => void
  recipeMap?: Map<string, number[]>
  playgroundItemsCount?: number
  /** Increment to force the nav avatar to re-fetch from /api/profile */
  avatarRefreshKey?: number
}

type SortType = 'name' | 'recent'

interface DragState {
  source: 'inventory' | 'playground'
  elementNumber: number
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
  sessionUser, elementsByName, onClick, lang, refreshKey,
}: {
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
  elementsByName: Map<string, ElementDef>
  onClick: () => void
  lang: 'fr' | 'en'
  refreshKey?: number
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, sessionUser.email, refreshKey])

  // Avatar key can be a number string "42" (new) or legacy FR/EN name "feu"
  const el = avatarKey
    ? (/^\d+$/.test(avatarKey)
        ? elementsByName.get(avatarKey) ?? [...elementsByName.values()].find(e => e.number === Number(avatarKey)) ?? null
        : (elementsByName.get(avatarKey)
          ?? elementsByName.get(avatarKey.toLowerCase())
          ?? [...elementsByName.values()].find(e => e.name.toLowerCase() === avatarKey.toLowerCase())
          ?? null))
    : null

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
  items, elements, elementsByName, discovered, totalElements,
  lang, onSetLang,
  onDrop, onMove, onMerge, onDropAndMerge, onRemove, onClear, onReset,
  onUnlockAll, sessionUser, hintsEnabled, onToggleHints, onRequestHint, hintShouldPulse = false, hintAdLocked = true,
  hapticEnabled = true, onToggleHaptic, pushNotificationsEnabled = true, onTogglePushNotifications,
  suppressUnlockNotif = false, onToggleSuppressUnlockNotif, onTapModeChange, recipeMap,
  playgroundItemsCount = 0, avatarRefreshKey = 0,
}: PlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inventoryRef = useRef<HTMLDivElement>(null)
  const inventoryScrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.email, lang, avatarRefreshKey])

  // Reset tap grid slot counter when canvas is emptied
  useEffect(() => {
    if (items.length === 0) tapSlotRef.current = 0
  }, [items.length])
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [nearMergeId, setNearMergeId] = useState<string | null>(null)
  const [mergeAnimation, setMergeAnimation] = useState<{ x: number; y: number } | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [playgroundFlash, setPlaygroundFlash] = useState<'success' | 'fail' | null>(null)
  const [overTrash, setOverTrash] = useState(false)
  const [overInventory, setOverInventory] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const trashRef = useRef<HTMLButtonElement>(null)
  const isMobile = useIsMobile()
  const playgroundBadgeSize = (isMobile ? 'xl' : '2xl') as 'xl' | '2xl'
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('name')
  const [sortReverse, setSortReverse] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [hintIdleGlow, setHintIdleGlow] = useState(false)
  const hintIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'quests' | 'settings' | 'help' | 'profile'>('home')
  const [profileView, setProfileView] = useState<'profile' | 'leaderboard' | 'codex'>('profile')
  const [questBadge, setQuestBadge] = useState(false)

  // Reset mobile scroll to top whenever the active tab changes
  useEffect(() => {
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = 0
  }, [activeTab])

  // After 90s of inactivity, glow the hint button for 15s then auto-reset
  useEffect(() => {
    if (hintIdleTimer.current) clearTimeout(hintIdleTimer.current)
    setHintIdleGlow(false)
    hintIdleTimer.current = setTimeout(() => {
      setHintIdleGlow(true)
      // Auto-reset after 15s (5 × 3s cycles) so class is removed and icon color resets
      setTimeout(() => setHintIdleGlow(false), 15_000)
    }, 90_000)
    return () => { if (hintIdleTimer.current) clearTimeout(hintIdleTimer.current) }
  }, [])

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
  const handleInventoryPointerDown = useCallback((e: React.PointerEvent, elementNumber: number) => {
    e.stopPropagation()
    e.preventDefault()
    const pos = getRelativePos(e.clientX, e.clientY)
    setDragging({
      source: 'inventory',
      elementNumber,
      x: pos.x - 40,
      y: pos.y - 40,
      offsetX: 40,
      offsetY: 40,
    })
    containerRef.current?.setPointerCapture(e.pointerId)
  }, [getRelativePos])

  // === PLAYGROUND ITEM DRAG ===
  const handlePointerDown = useCallback((e: React.PointerEvent, elementNumber: number, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const pos = getRelativePos(e.clientX, e.clientY)
    setDragging({
      source: 'playground',
      elementNumber,
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

    if (dragging.source === 'inventory') {
      setDragging(prev => prev ? { ...prev, x: newX, y: newY } : prev)
    } else if (dragging.source === 'playground' && dragging.itemId) {
      // Update dragging coords so the render uses live position (item render reads dragging.x/y while isDragging)
      setDragging(prev => prev ? { ...prev, x: newX, y: newY } : prev)
      // Also update the store so item.x/y is correct once isDragging becomes false
      onMove(dragging.itemId, newX, newY)
      setNearMergeId(findNearestItem(newX, newY, dragging.itemId)?.id || null)
      // Detect hover over trash button
      const trashEl = trashRef.current
      if (trashEl) {
        const r = trashEl.getBoundingClientRect()
        const pad = 40
        const isOver = e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad
        setOverTrash(prev => prev !== isOver ? isOver : prev)
      }
      // Detect hover over inventory panel
      const invEl = inventoryRef.current
      if (invEl) {
        const r = invEl.getBoundingClientRect()
        const isOver = e.clientY >= r.top && e.clientX >= r.left && e.clientX <= r.right
        setOverInventory(prev => prev !== isOver ? isOver : prev)
      }
    }
  }, [dragging, getRelativePos, onMove, findNearestItem])

  // === POINTER UP ===
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    e.preventDefault()
    containerRef.current?.releasePointerCapture(e.pointerId)

    const dropTarget = document.elementFromPoint(e.clientX, e.clientY)

    // Check if dropped on trash — use a generous 40px padding around the button
    const trashEl = trashRef.current
    const droppedOnTrash = trashEl ? (() => {
      const r = trashEl.getBoundingClientRect()
      const pad = 40
      return e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad
    })() : false

    // Whether pointer is physically inside the inventory panel rect
    const inventoryRect = inventoryRef.current?.getBoundingClientRect()
    const isInsideInventory = inventoryRect
      ? e.clientY >= inventoryRect.top && e.clientX >= inventoryRect.left && e.clientX <= inventoryRect.right
      : !!inventoryRef.current?.contains(dropTarget)

    setOverTrash(false)
    setOverInventory(false)

    // Delete: only when dragging FROM playground and dropping on trash or back on inventory
    if (dragging.source === 'playground' && dragging.itemId && (droppedOnTrash || isInsideInventory)) {
      const id = dragging.itemId
      setDeletingId(id)
      setDragging(null)
      setNearMergeId(null)
      setTimeout(() => { onRemove(id); setDeletingId(null) }, 280)
      return
    }

    if (dragging.source === 'inventory') {
      // Cancel drag if dropped back on the inventory
      if (isInsideInventory) {
        setDragging(null)
        setNearMergeId(null)
        return
      }
      const nearest = findNearestItem(dragging.x, dragging.y)
      if (nearest) {
        const result = onDropAndMerge(dragging.elementNumber, dragging.x, dragging.y, nearest.id)
        if (result != null) {
          setMergeAnimation({ x: nearest.x, y: nearest.y })
          setPlaygroundFlash('success')
          setTimeout(() => { setMergeAnimation(null); setPlaygroundFlash(null) }, 600)
        } else {
          const newId = onDrop(dragging.elementNumber, dragging.x, dragging.y)
          setShakeId(newId)
          setPlaygroundFlash('fail')
          setTimeout(() => { setShakeId(null); setPlaygroundFlash(null) }, 500)
        }
      } else {
        onDrop(dragging.elementNumber, dragging.x, dragging.y)
      }
    } else if (dragging.source === 'playground' && dragging.itemId) {
      // dragging.x/y are kept in sync via setDragging in handlePointerMove
      const nearest = findNearestItem(dragging.x, dragging.y, dragging.itemId)
      if (nearest) {
        const result = onMerge(dragging.itemId, nearest.id)
        if (result != null) {
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
  }, [dragging, findNearestItem, onDrop, onMerge, onDropAndMerge, onRemove])

  // === SORT ===
  // discovered is Set<number> — map numbers to ElementDef for display
  const discoveredOrder = Array.from(discovered)
  const discoveredElements = discoveredOrder
    .map(num => elements.get(num))
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
      // Recent sort: order by position in discoveredOrder (Set insertion order)
      const ia = discoveredOrder.indexOf(a.number)
      const ib = discoveredOrder.indexOf(b.number)
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
      {/* Canvas area — dot grid + flash overlay, fullscreen on desktop, clipped on mobile */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
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
        const isDeleting = deletingId === item.id
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
              transform: `translate(${x}px, ${y}px) scale(${isDeleting ? 0 : scale})`,
              opacity: isDeleting ? 0 : 1,
              zIndex: isDragging ? 1000 : 10 + index,
              transition: isDeleting ? 'transform 0.25s ease-in, opacity 0.25s ease-in' : isDragging ? 'none' : 'transform 0.15s',
              willChange: isDragging ? 'transform' : undefined,
              contain: 'layout style',
              pointerEvents: isDeleting ? 'none' : undefined,
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
      {dragging?.source === 'inventory' && (() => {
        const ghostEl = elements.get(dragging.elementNumber)
        if (!ghostEl) return null
        return (
          <div
            className="absolute pointer-events-none"
            style={{ left: 0, top: 0, transform: `translate(${dragging.x}px, ${dragging.y}px) scale(1.05)`, zIndex: 9999, opacity: 0.9, willChange: 'transform' }}
          >
            <ElementBadge element={ghostEl} size={playgroundBadgeSize} />
          </div>
        )
      })()}

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



      {/* MOBILE FULLSCREEN PANEL — quests / settings / profile (non-home tabs) */}
      {isMobile && activeTab !== 'home' && (
        <div
          className="fixed inset-0 bg-background flex flex-col"
          style={{
            zIndex: 150,
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Scrollable content */}
          <div
            ref={mobileScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="px-4 py-4">

              {/* ── Quests: logged in ── */}
              {activeTab === 'quests' && sessionUser && <QuestInlinePanel lang={lang} onGoToPlay={() => setActiveTab('home')} />}

              {/* ── Quests: logged out ── */}
              {activeTab === 'quests' && !sessionUser && (
                <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                    <Scroll size={24} weight="regular" className="text-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{lang === 'fr' ? 'Non connecté' : 'Not signed in'}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{lang === 'fr' ? 'Connecte-toi pour accéder aux quêtes' : 'Sign in to access quests'}</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <form action={signInWithGoogle}>
                      <button type="submit" className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        {lang === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
                      </button>
                    </form>
                    <form action={signInWithDiscord}>
                      <button type="submit" className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-[#5865F2] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        {lang === 'fr' ? 'Continuer avec Discord' : 'Continue with Discord'}
                      </button>
                    </form>
                    <div className="flex items-center gap-2 my-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">{lang === 'fr' ? 'ou par email (sans mot de passe !)' : 'or by email (no password!)'}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <EmailSignIn lang={lang} />
                  </div>
                </div>
              )}

              {/* ── Settings ── */}
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
                  pushNotificationsEnabled={pushNotificationsEnabled}
                  onTogglePushNotifications={onTogglePushNotifications}
                  suppressUnlockNotif={suppressUnlockNotif}
                  onToggleSuppressUnlockNotif={onToggleSuppressUnlockNotif}
                  mergeFlashEnabled={mergeFlashEnabled}
                  onToggleMergeFlash={() => setMergeFlashEnabled(!mergeFlashEnabled)}
                  onOpenHelp={() => setActiveTab('help')}
                  sessionUser={sessionUser}
                  onSignOut={() => { try { localStorage.removeItem('alchemy-discovered-v4') } catch {} onReset(); signOut({ callbackUrl: '/' }) }}
                />
              )}

              {/* ── Help ── */}
              {activeTab === 'help' && (
                <HelpPanel lang={lang} onBack={() => setActiveTab('settings')} />
              )}

              {/* ── Profile: logged in ── */}
              {activeTab === 'profile' && sessionUser && (
                profileView === 'leaderboard'
                  ? <LeaderboardInlinePanel lang={lang} totalElements={totalElements} sessionUser={sessionUser} onBack={() => setProfileView('profile')} />
                  : profileView === 'codex'
                    ? <CodexInlinePanel lang={lang} elements={elements} discovered={discovered} totalElements={totalElements} onGoToPlay={() => setProfileView('profile')} />
                    : <ProfileInlinePanel
                        lang={lang}
                        sessionUser={sessionUser}
                        elementsByName={elementsByName}
                        discovered={discovered}
                        totalElements={totalElements}
                        onAvatarChange={setTabAvatarKey}
                        onOpenLeaderboard={() => setProfileView('leaderboard')}
                        onOpenCodex={() => setProfileView('codex')}
                        onSignOut={() => { try { localStorage.removeItem('alchemy-discovered-v4') } catch {} onReset(); signOut({ callbackUrl: '/' }) }}
                      />
              )}

              {/* ── Profile: logged out ── */}
              {activeTab === 'profile' && !sessionUser && (
                <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                    <UserCircle size={24} weight="regular" className="text-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{lang === 'fr' ? 'Non connect��' : 'Not signed in'}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{lang === 'fr' ? 'Connecte-toi pour sauvegarder ta progression' : 'Sign in to save your progress'}</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <form action={signInWithGoogle}>
                      <button type="submit" className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        {lang === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
                      </button>
                    </form>
                    <form action={signInWithDiscord}>
                      <button type="submit" className="w-full flex items-center justify-center gap-2.5 h-11 px-5 rounded-xl bg-[#5865F2] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        {lang === 'fr' ? 'Continuer avec Discord' : 'Continue with Discord'}
                      </button>
                    </form>
                    <div className="flex items-center gap-2 my-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">{lang === 'fr' ? 'ou par email (sans mot de passe !)' : 'or by email (no password!)'}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <EmailSignIn lang={lang} />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* INVENTORY PANEL */}
      <div
        ref={inventoryRef}
        className="absolute bottom-0 left-0 right-0 md:bottom-0 md:left-auto md:top-0 md:right-0 md:h-full md:w-[300px] lg:w-[400px] bg-card/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-border flex flex-col"
        style={{
          zIndex: isMobile && activeTab !== 'home' ? 200 : 120,
          height: isMobile
            ? activeTab !== 'home'
              ? undefined  // auto = just navbar content
              : (inventoryHeight != null ? `${inventoryHeight}px` : '55vh')
            : undefined,
        }}
      >
        {/* Drag handle — mobile only, hidden when fullscreen page is active */}
        {isMobile && activeTab === 'home' && (
          <div
            className="flex-shrink-0 flex items-center justify-center h-6 touch-none select-none"
            onPointerDown={handleDragHandlePointerDown}
            style={{ cursor: 'row-resize', touchAction: 'none' }}
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
        )}

        {/* Header — hidden on mobile when fullscreen page is shown */}
        <div
          className={`flex-shrink-0 px-3 pt-3 pb-3 border-b border-border flex flex-col gap-2.5 ${isMobile && activeTab !== 'home' ? 'hidden' : ''}`}
          onPointerDown={isMobile && activeTab === 'home' ? handleDragHandlePointerDown : undefined}
          style={isMobile && activeTab === 'home' ? { cursor: 'row-resize', touchAction: 'none' } : undefined}
        >
          {/* ── Header row 1: clear (abs left) · centered logo+counter · crown (abs right) ── */}
          <div className="relative flex items-center h-10">

            {/* Clear button — absolute left so it doesn't shift the center */}
            <button
              ref={trashRef}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); if (items.length > 0) onClear() }}
              disabled={items.length === 0}
              title={lang === 'fr' ? 'Vider le terrain' : 'Clear field'}
              className={`absolute left-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-25 disabled:pointer-events-none ${
                overTrash || overInventory
                  ? 'bg-red-500/30 text-red-400 border border-red-500/40 scale-125'
                  : items.length > 0
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 hover:scale-110'
                    : 'bg-muted/40 text-muted-foreground/40 border border-transparent'
              }`}
            >
              {/* Lid rotates open when over trash or inventory */}
              <span className={`transition-transform duration-150 origin-bottom block ${overTrash || overInventory ? '-translate-y-0.5 rotate-[-20deg]' : ''}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* Center: logo + title + counter */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2.5 pointer-events-none select-none">
                <img src="/logo.svg" alt="Elementz" className="w-6 h-6 rounded-full flex-shrink-0" draggable={false} onError={e => { (e.target as HTMLImageElement).src = '/logo.png' }} />
                <span className="font-bold text-base tracking-tight text-foreground">Elementz</span>
                <span className="text-xs tabular-nums font-medium px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground" suppressHydrationWarning>
                  {discovered.size}<span className="opacity-50">/{totalElements}</span>
                </span>
              </div>
            </div>


          </div>

          {/* ── Header row 2: search + sort — only on home tab ── */}
          {activeTab === 'home' && (
            <div className="flex items-center gap-2 pt-0.5">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
                  className="w-full h-9 pl-8 pr-7 bg-muted/40 border border-border/50 rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[3px] focus:border-foreground/30 focus:bg-muted/60 transition-[background-color,border-color]"
                  style={{ fontSize: '16px' }}
                  onPointerDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg bg-muted-foreground/15 active:bg-muted-foreground/25 transition-colors"
                  >
                    <X className="w-4 h-4 text-foreground/60" />
                  </button>
                )}
              </div>
              {/* Sort switcher */}
              <div className="flex h-9 items-center gap-0 flex-shrink-0 border border-border/50 rounded-xl overflow-hidden bg-muted/30">
                {(['name', 'recent'] as const).map((type, i) => {
                  const isActive = sortBy === type
                  const label = type === 'name'
                    ? (lang === 'fr' ? 'Nom' : 'Name')
                    : (lang === 'fr' ? 'Récent' : 'Recent')
                  const Arrow = isActive ? (sortReverse ? ChevronDown : ChevronUp) : null
                  return (
                    <button
                      key={type}
                      onClick={() => toggleSort(type)}
                      className={`flex items-center gap-1 h-full px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                        i === 0 ? 'border-r border-border/50' : ''
                      } ${
                        isActive
                          ? 'bg-muted-foreground/20 text-foreground'
                          : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {label}
                      {Arrow && <Arrow className="w-3 h-3 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable content area — hidden on mobile when fullscreen page is active */}
        <div className={`flex-1 min-h-0 ${isMobile && activeTab !== 'home' ? 'hidden' : ''}`}>
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
                              // On desktop the canvas excludes the sidebar (300px or 400px)
                              // Use a wider grid with more spacing on large screens
                              const isDesktop = !isMobile
                              const COLS = isDesktop ? 5 : 4
                              const ROWS = isDesktop ? 4 : 4
                              const BADGE_W = 72
                              const BADGE_H = 72
                              const GAP = isDesktop ? 46 : 12
                              const PAD_X = isDesktop ? 28 : 0
                              const PAD_Y = isDesktop ? 32 : 16
                              
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
                                    onDrop(element.number, cx, cy)
                                    placed = true
                                  }
                                }
                              }
                              
                              // Fallback: place at a random position if all slots occupied
                              if (!placed) {
                                const fallbackPad = PAD_X + 20
                                const cx = fallbackPad + Math.random() * (rect.width - fallbackPad * 2 - BADGE_W)
                                const cy = PAD_Y + Math.random() * (rect.height * 0.4)
                                onDrop(element.number, cx, cy)
                              }
                            },
                          }
                        : {
                            onPointerDown: (e: React.PointerEvent) => handleInventoryPointerDown(e, element.number),
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
                {activeTab === 'quests' && sessionUser && <QuestInlinePanel lang={lang} onGoToPlay={() => setActiveTab('home')} />}

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
                    pushNotificationsEnabled={pushNotificationsEnabled}
                    onTogglePushNotifications={onTogglePushNotifications}
                    suppressUnlockNotif={suppressUnlockNotif}
                    onToggleSuppressUnlockNotif={onToggleSuppressUnlockNotif}
                    mergeFlashEnabled={mergeFlashEnabled}
                    onToggleMergeFlash={() => setMergeFlashEnabled(!mergeFlashEnabled)}
                    onOpenHelp={() => setActiveTab('help')}
                    sessionUser={sessionUser}
                    onSignOut={() => { try { localStorage.removeItem('alchemy-discovered-v4') } catch {} onReset(); signOut({ callbackUrl: '/' }) }}
                  />
                )}
                {activeTab === 'help' && (
                  <HelpPanel lang={lang} onBack={() => setActiveTab('settings')} />
                )}
                {activeTab === 'profile' && sessionUser && (
                  profileView === 'leaderboard'
                    ? <LeaderboardInlinePanel lang={lang} totalElements={totalElements} sessionUser={sessionUser} onBack={() => setProfileView('profile')} />
                    : profileView === 'codex'
                      ? <CodexInlinePanel lang={lang} elements={elements} discovered={discovered} totalElements={totalElements} onGoToPlay={() => setProfileView('profile')} />
                      : <ProfileInlinePanel
                          lang={lang}
                          sessionUser={sessionUser}
                          elementsByName={elementsByName}
                          discovered={discovered}
                          totalElements={totalElements}
                          onAvatarChange={setTabAvatarKey}
                          onOpenLeaderboard={() => setProfileView('leaderboard')}
                          onOpenCodex={() => setProfileView('codex')}
                          onSignOut={() => { try { localStorage.removeItem('alchemy-discovered-v4') } catch {} onReset(); signOut({ callbackUrl: '/' }) }}
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

        {/* ── TAB BAR — iOS Liquid Glass ───────────────────────�������──�����─ */}
        <div
          className="flex-shrink-0 border-t border-white/[0.06] glass"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 2px)' }}
        >
          <div className="flex items-center">

            {/* Left: Jeu + Quetes */}
            {([
              { id: 'home',   icon: HouseSimple, label: lang === 'fr' ? 'Jeu'    : 'Play'   },
              { id: 'quests', icon: Bell,        label: lang === 'fr' ? 'Quêtes' : 'Quests' },
            ] as const).map(({ id, icon: Icon, label }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (!isActive && typeof navigator !== 'undefined' && 'vibrate' in navigator) { try { navigator.vibrate(10) } catch {} }
                    setActiveTab(prev => { const next = prev === id && id !== 'home' ? 'home' : id; setProfileView('profile'); return next })
                    if (id === 'quests') setQuestBadge(false)
                  }}
                  className="flex-1 flex flex-col items-center justify-center py-3 relative tap-spring"
                  aria-label={label}
                >
                  <div className="relative">
                    <Icon size={26} weight={isActive ? 'fill' : 'regular'} className={`transition-colors duration-150 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                    {id === 'quests' && questBadge && !isActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-card" />
                    )}
                  </div>
                </button>
              )
            })}

            {/* Center: Crown (game complete) or Hint button */}
            <div className="flex-1 flex flex-col items-center justify-center py-3">
              {discovered.size >= totalElements ? (
                <div
                  className="flex items-center justify-center select-none animate-in fade-in zoom-in duration-500"
                  title={lang === 'fr' ? 'Maître alchimiste !' : 'Alchemy master!'}
                  aria-label={lang === 'fr' ? 'Maître alchimiste' : 'Alchemy master'}
                >
                  <span className="text-2xl leading-none" role="img" aria-label="crown">👑</span>
                </div>
              ) : (
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation()
                    setHintIdleGlow(false)
                    if (hintIdleTimer.current) clearTimeout(hintIdleTimer.current)
                    hintIdleTimer.current = setTimeout(() => {
                      setHintIdleGlow(true)
                      setTimeout(() => setHintIdleGlow(false), 15_000)
                    }, 90_000)
                    onRequestHint?.()
                  }}
                  aria-label={lang === 'fr' ? 'Obtenir un indice' : 'Get a hint'}
                  className={`tap-spring select-none active:scale-95 transition-all duration-200 flex items-center justify-center ${hintIdleGlow && !hintShouldPulse ? 'hint-idle-glow' : ''}`}
                >
                  <Lightbulb
                    size={26}
                    weight={hintShouldPulse || hintIdleGlow ? 'fill' : 'regular'}
                    className={`transition-colors duration-200 ${hintShouldPulse || hintIdleGlow ? 'text-amber-400' : 'text-muted-foreground/50'}`}
                  />
                </button>
              )}
            </div>

            {/* Right: Settings + Profile */}
            {([
              { id: 'settings', icon: Gear, label: lang === 'fr' ? 'Réglages' : 'Settings' },
              { id: 'profile',  icon: User, label: lang === 'fr' ? 'Profil'   : 'Profile'  },
            ] as const).map(({ id, icon: Icon, label }) => {
              const isActive = activeTab === id
              const isProfileWithUser = id === 'profile' && !!sessionUser
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (!isActive && typeof navigator !== 'undefined' && 'vibrate' in navigator) { try { navigator.vibrate(10) } catch {} }
                    setActiveTab(prev => { const next = prev === id && id !== 'home' ? 'home' : id; setProfileView('profile'); return next })
                  }}
                  className="flex-1 flex flex-col items-center justify-center py-3 relative tap-spring"
                  aria-label={label}
                >
                  {isProfileWithUser ? (() => {
                    const tabEl = tabAvatarKey
      ? (
          /^\d+$/.test(tabAvatarKey)
            ? elements.get(Number(tabAvatarKey)) ?? null
            : (elementsByName.get(tabAvatarKey)
              ?? elementsByName.get(tabAvatarKey.toLowerCase())
              ?? [...elementsByName.values()].find(e => e.name.toLowerCase() === tabAvatarKey.toLowerCase())
              ?? null)
        )
      : null
                    return (
                      <div
                        className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center transition-all ${isActive ? 'border-[2px] border-foreground' : 'border border-muted-foreground/25'}`}
                        style={tabEl?.color ? { backgroundColor: `${tabEl.color}22` } : undefined}
                      >
                        {tabEl?.imageUrl ? (
                          <img src={tabEl.imageUrl} alt="" className="w-5 h-5 object-contain" draggable={false} />
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">{(sessionUser.name ?? 'P')[0].toUpperCase()}</span>
                        )}
                      </div>
                    )
                  })() : (
                    <Icon size={26} weight={isActive ? 'fill' : 'regular'} className={`transition-colors duration-150 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
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
      {profileOpen && sessionUser && <ProfileModal lang={lang} sessionUser={sessionUser} elementsByName={elementsByName} discovered={discovered} totalElements={totalElements} onClose={() => setProfileOpen(false)} onOpenLeaderboard={() => { setProfileOpen(false); setLeaderboardOpen(true) }} onSignOut={onReset} />}
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

type LeaderboardStats = {
  count: number
  first_unlock: string | null
  last_unlock: string | null
  granularity: 'hour' | 'day' | 'week'
  series: Array<{ bucket: string; cumulative: number; new: number }>
}

function LeaderboardRow({ entry, rank, lang, total, isMe }: {
  entry: { user_id: string; username: string | null; avatar_img: string | null; count: number; first_unlock?: string | null; last_unlock?: string | null }
  rank: number
  lang: 'fr' | 'en'
  total: number
  isMe: boolean
}) {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en
  const name = entry.username ?? t(`Joueur #${rank}`, `Player #${rank}`)
  const pct = Math.round((entry.count / total) * 100)

  const rankLabel =
    rank === 1 ? <Trophy className="w-3.5 h-3.5 text-yellow-400" /> :
    rank === 2 ? <Medal className="w-3.5 h-3.5 text-zinc-400" /> :
    rank === 3 ? <Medal className="w-3.5 h-3.5 text-amber-600" /> :
    <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums w-full text-center">{rank}</span>

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next && !stats && !loadingStats) {
      setLoadingStats(true)
      fetch(`/api/leaderboard/stats?user_id=${entry.user_id}`)
        .then(r => r.json())
        .then(d => { setStats(d); setLoadingStats(false) })
        .catch(() => setLoadingStats(false))
    }
  }

  // Format duration between first and last unlock
  const duration = (() => {
    const f = stats?.first_unlock ?? entry.first_unlock
    const l = stats?.last_unlock ?? entry.last_unlock
    if (!f || !l) return null
    const ms = new Date(l).getTime() - new Date(f).getTime()
    if (ms < 60000) return t('< 1 min', '< 1 min')
    const days = Math.floor(ms / 86400000)
    const hours = Math.floor((ms % 86400000) / 3600000)
    const mins = Math.floor((ms % 3600000) / 60000)
    if (days > 0) return t(`${days}j ${hours}h`, `${days}d ${hours}h`)
    if (hours > 0) return t(`${hours}h ${mins}min`, `${hours}h ${mins}m`)
    return t(`${mins} min`, `${mins} min`)
  })()

  // Format a bucket label based on granularity
  const fmtBucket = (b: string, gran: string) => {
    const d = new Date(b)
    if (gran === 'hour') return d.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    if (gran === 'week') return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
  }

  const chartData = stats?.series.map(s => ({
    label: fmtBucket(s.bucket, stats.granularity),
    value: s.cumulative,
  })) ?? []

  return (
    <div className="border-b border-border/30 last:border-b-0">
      {/* Row */}
      <button
        className="w-full flex items-center gap-3 px-1 py-2.5 text-left cursor-pointer active:bg-muted/30 transition-colors rounded-xl"
        onClick={handleToggle}
        aria-expanded={open}
      >
        <div className="w-5 flex items-center justify-center flex-shrink-0">{rankLabel}</div>
        <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
          {entry.avatar_img
            ? <img src={entry.avatar_img} alt={name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
            : <span className="text-[10px] font-bold text-muted-foreground">{name.slice(0, 2).toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-semibold truncate block ${isMe ? 'text-primary' : 'text-foreground'}`}>
            {name}
            {isMe && <span className="ml-1.5 text-[9px] font-bold text-primary/50 uppercase tracking-wide">{t('Vous', 'You')}</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-bold tabular-nums text-foreground">{entry.count}</span>
          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/30 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Stats dropdown */}
      {open && (
        <div className="pb-4 px-1">
          {loadingStats ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <div className="flex flex-col gap-3">

              {/* Stat pills */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: `${pct}%`, label: t('complété', 'complete') },
                  { value: stats.count.toString(), label: t('éléments', 'elements') },
                  { value: duration ?? '—', label: t('durée', 'duration') },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl bg-muted/40">
                    <span className="text-base font-bold text-foreground tabular-nums leading-none">{value}</span>
                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wide">{label}</span>
                  </div>
                ))}
              </div>

              {/* Discovery curve */}
              {chartData.length > 1 && (
                <div className="rounded-2xl bg-muted/30 px-3 pt-3 pb-1 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-semibold px-1">
                    {t('Découvertes au fil du temps', 'Discoveries over time')}
                  </span>
                  <ResponsiveContainer width="100%" height={90}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id={`grad-${entry.user_id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-foreground"
                              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                              {payload[0].value} {t('éléments', 'elements')}
                            </div>
                          )
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--primary)"
                        strokeWidth={1.5}
                        fill={`url(#grad-${entry.user_id})`}
                        dot={false}
                        activeDot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  {/* X-axis labels — first and last only */}
                  <div className="flex justify-between px-1 -mt-1">
                    <span className="text-[9px] text-muted-foreground/30 tabular-nums">{chartData[0]?.label}</span>
                    <span className="text-[9px] text-muted-foreground/30 tabular-nums">{chartData[chartData.length - 1]?.label}</span>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <p className="text-xs text-muted-foreground/40 text-center py-4">{t('Données indisponibles', 'Data unavailable')}</p>
          )}
        </div>
      )}
    </div>
  )
}

function LeaderboardInlinePanel({ lang, totalElements, sessionUser, onBack }: { lang: 'fr' | 'en'; totalElements: number; sessionUser?: { id?: string | null; email?: string | null } | null; onBack?: () => void }) {
  const TOTAL = totalElements
  const [entries, setEntries] = useState<Array<{
    user_id: string
    username: string | null
    avatar_img: string | null
    count: number
    first_unlock: string | null
    last_unlock: string | null
    is_current_user: boolean
    rank: number
  }>>([])
  const [currentUser, setCurrentUser] = useState<{ rank: number; count: number; username: string | null; avatar_img: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => {
      setEntries(d.leaderboard ?? [])
      setCurrentUser(d.currentUser ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 py-1">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 active:scale-95 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <div className="w-9 h-9 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{t('Classement', 'Leaderboard')}</h2>
          <p className="text-xs text-muted-foreground">{t(`Top ${entries.length} joueurs`, `Top ${entries.length} players`)}</p>
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
          <div className="rounded-2xl border border-border bg-card px-3 overflow-hidden">
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                rank={entry.rank}
                lang={lang}
                total={TOTAL}
                isMe={entry.is_current_user || (!!sessionUser?.id && entry.user_id === sessionUser.id)}
              />
            ))}
          </div>

          {/* Current user rank — only shown if outside top 50 */}
          {currentUser && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 overflow-hidden">
              <div className="flex items-center gap-3 px-1 py-2.5">
                <div className="w-5 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-primary/70 tabular-nums">#{currentUser.rank}</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
                  {currentUser.avatar_img
                    ? <img src={currentUser.avatar_img} alt="" className="w-full h-full object-contain" draggable={false} />
                    : <span className="text-[10px] font-bold text-muted-foreground">{(currentUser.username ?? 'ME').slice(0, 2).toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-primary truncate">
                    {currentUser.username ?? t('Vous', 'You')}
                    <span className="ml-1.5 text-[9px] font-bold text-primary/50 uppercase tracking-wide">{t('Vous', 'You')}</span>
                  </span>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-sm font-bold tabular-nums text-foreground">{currentUser.count}</span>
                  <span className="text-[10px] text-muted-foreground/40 tabular-nums">{Math.round((currentUser.count / TOTAL) * 100)}%</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SettingsPanel({ lang, onSetLang, hintsEnabled, onToggleHints, onClear, itemsCount, gridCols, onSetGridCols, tapMode, onToggleTapMode, hapticEnabled, onToggleHaptic, pushNotificationsEnabled, onTogglePushNotifications, suppressUnlockNotif, onToggleSuppressUnlockNotif, mergeFlashEnabled, onToggleMergeFlash, onOpenHelp, sessionUser, onSignOut }: {
  lang: 'fr' | 'en'; onSetLang: (l: 'fr' | 'en') => void
  hintsEnabled?: boolean; onToggleHints?: () => void
  onClear: () => void; itemsCount: number
  gridCols: 3 | 4 | 5; onSetGridCols: (n: 3 | 4 | 5) => void
  tapMode: boolean; onToggleTapMode: () => void
  hapticEnabled?: boolean; onToggleHaptic?: () => void
  pushNotificationsEnabled?: boolean; onTogglePushNotifications?: () => void
  suppressUnlockNotif?: boolean; onToggleSuppressUnlockNotif?: () => void
  mergeFlashEnabled: boolean; onToggleMergeFlash: () => void
  onOpenHelp?: () => void
  sessionUser?: { id?: string | null; name?: string | null; email?: string | null } | null
  onSignOut?: () => void
}) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  const [deleting, setDeleting] = useState(false)
  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: next }) }).catch(() => {})
  }
  // iOS-style toggle component
  const Toggle = ({ on, onToggle, color = 'var(--primary)' }: { on: boolean; onToggle: () => void; color?: string }) => (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer"
      style={{ backgroundColor: on ? color : 'var(--muted-foreground)' , opacity: on ? 1 : 0.3 }}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )

  return (
    <div className="flex flex-col gap-5 py-1">

      {/* ── Apparence ── */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest px-1 mb-1">{t('Apparence', 'Appearance')}</p>
        <div className="rounded-2xl overflow-hidden bg-card divide-y divide-border/60">

          {/* Language */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0 text-base leading-none">
              {lang === 'fr' ? '🇫🇷' : '🇺🇸'}
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{t('Langue', 'Language')}</span>
            <div className="flex items-center bg-muted/50 rounded-xl p-1 h-8 gap-0.5">
              <button onClick={() => onSetLang('fr')} className={`px-2.5 h-full rounded-lg transition-colors cursor-pointer flex items-center justify-center ${lang === 'fr' ? 'bg-background shadow' : 'opacity-40'}`}>
                <span className="text-sm font-semibold md:hidden">FR</span>
                <img src="/images/flag-fr.png" alt="Français" className="hidden md:block w-5 h-5 object-contain" />
              </button>
              <button onClick={() => onSetLang('en')} className={`px-2.5 h-full rounded-lg transition-colors cursor-pointer flex items-center justify-center ${lang === 'en' ? 'bg-background shadow' : 'opacity-40'}`}>
                <span className="text-sm font-semibold md:hidden">EN</span>
                <img src="/images/flag-en.png" alt="English" className="hidden md:block w-5 h-5 object-contain" />
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              {isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{t('Thème', 'Theme')}</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-muted/50 text-sm font-medium text-foreground transition-colors cursor-pointer"
            >
              <span>{isDark ? (lang === 'fr' ? 'Sombre' : 'Dark') : (lang === 'fr' ? 'Clair' : 'Light')}</span>
            </button>
          </div>

          {/* Grid columns */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-muted-foreground/60 tabular-nums">{gridCols}×</span>
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{t('Colonnes inventaire', 'Inventory columns')}</span>
            <div className="flex items-center bg-muted/50 rounded-xl p-1 h-8 gap-0.5">
              {([3, 4, 5] as const).map(n => (
                <button key={n} onClick={() => onSetGridCols(n)}
                  className={`w-7 h-full text-sm font-semibold rounded-lg transition-colors cursor-pointer ${gridCols === n ? 'bg-background shadow text-foreground' : 'text-muted-foreground/50'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gameplay ── */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest px-1 mb-1">{t('Gameplay', 'Gameplay')}</p>
        <div className="rounded-2xl overflow-hidden bg-card divide-y divide-border/60">

          {/* Tap mode */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Hand size={16} weight="regular" className="text-muted-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t('Mode tap inventaire', 'Tap inventory mode')}</p>
              <p className="text-xs text-muted-foreground/50 mt-0.5">{t('Tap pour poser sur le terrain', 'Tap to place on canvas')}</p>
            </div>
            <Toggle on={tapMode} onToggle={onToggleTapMode} />
          </div>

          {/* Merge flash */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Lightning size={16} weight="regular" className="text-muted-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t('Flash fusion', 'Merge flash')}</p>
              <p className="text-xs text-muted-foreground/50 mt-0.5">{t('Vert/rouge sur le terrain', 'Green/red on canvas')}</p>
            </div>
            <Toggle on={mergeFlashEnabled} onToggle={onToggleMergeFlash} color="#fe8f27" />
          </div>

          {/* Push notifications */}
          {sessionUser && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
                <Bell size={16} weight="regular" className="text-muted-foreground/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t('Notifications push', 'Push notifications')}</p>
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {typeof Notification !== 'undefined' && Notification.permission === 'denied'
                    ? t('Bloquées — modifie les réglages du navigateur', 'Blocked — change browser settings')
                    : t("Alertes sur l'écran d'accueil", 'Alerts on home screen')}
                </p>
              </div>
              <Toggle on={!!pushNotificationsEnabled} onToggle={() => onTogglePushNotifications?.()} />
            </div>
          )}

          {/* Unlock notification bubbles */}
          {sessionUser && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
                <Bell size={16} weight="regular" className="text-muted-foreground/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t('Bulles de découverte', 'Discovery bubbles')}</p>
                <p className="text-xs text-muted-foreground/50 mt-0.5">{t('Afficher quand un nouvel élément est débloqué', 'Show when a new element is unlocked')}</p>
              </div>
              <Toggle on={!suppressUnlockNotif} onToggle={() => onToggleSuppressUnlockNotif?.()} />
            </div>
          )}
        </div>
      </div>

      {/* ── Aide & Infos ── */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest px-1 mb-1">{t('Aide & Infos', 'Help & Info')}</p>
        <div className="rounded-2xl overflow-hidden bg-card divide-y divide-border/60">
          <a href="/about" className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{t('À propos', 'About')}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
          </a>
          <button onClick={onOpenHelp} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors cursor-pointer text-left">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Question size={16} weight="regular" className="text-muted-foreground/70" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{t('Comment jouer', 'How to play')}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
          </button>
          <a href="/privacy" className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{t('Confidentialité', 'Privacy Policy')}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
          </a>
          <a href="/legal" className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Scroll size={16} weight="regular" className="text-muted-foreground/70" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{t('Mentions légales', 'Legal Notice')}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
          </a>
          <a href="/terms" className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-muted-foreground/70" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{t("Conditions d'utilisation", 'Terms of Service')}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
          </a>
        </div>
      </div>

      {/* ── Compte ── */}
      {sessionUser && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest px-1 mb-1">{t('Compte', 'Account')}</p>
          <div className="rounded-2xl overflow-hidden bg-card divide-y divide-border/60">
            <button
              onClick={() => { try { localStorage.removeItem('alchemy-discovered-v4') } catch {} onSignOut?.() }}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-4 h-4 text-muted-foreground/70" />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">{t('Se déconnecter', 'Sign out')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Zone danger ── */}
      {sessionUser && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-red-400/50 uppercase tracking-widest px-1 mb-1">{t('Zone de danger', 'Danger zone')}</p>
          <div className="rounded-2xl overflow-hidden bg-card divide-y divide-border/60">
          {deleteStep === 0 && (
            <button
              onClick={() => setDeleteStep(1)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-red-500/5 transition-colors cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-sm font-medium text-red-400 flex-1">{t('Supprimer mon compte', 'Delete my account')}</span>
            </button>
          )}
          {deleteStep === 1 && (
            <div className="px-4 py-4 bg-red-500/5 flex flex-col gap-3">
              <p className="text-sm font-semibold text-red-400">{t('Supprimer définitivement ?', 'Delete permanently?')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('Toutes tes données (progression, découvertes, profil) seront effacées. Cette action est irréversible.', 'All your data (progress, discoveries, profile) will be erased. This action is irreversible.')}</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteStep(0)} className="flex-1 h-9 rounded-xl bg-muted text-sm font-medium text-foreground cursor-pointer">{t('Annuler', 'Cancel')}</button>
                <button onClick={() => setDeleteStep(2)} className="flex-1 h-9 rounded-xl bg-red-500/15 text-sm font-semibold text-red-400 cursor-pointer">{t('Continuer', 'Continue')}</button>
              </div>
            </div>
          )}
          {deleteStep === 2 && (
            <div className="px-4 py-4 bg-red-500/10 flex flex-col gap-3">
              <p className="text-sm font-bold text-red-400">{t('Derniere confirmation', 'Final confirmation')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('Clique sur "Supprimer" pour confirmer. Il n\'y a pas de retour en arrière possible.', 'Click "Delete" to confirm. There is no going back.')}</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteStep(0)} className="flex-1 h-9 rounded-xl bg-muted text-sm font-medium text-foreground cursor-pointer">{t('Annuler', 'Cancel')}</button>
                <button
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      await fetch('/api/account/delete', { method: 'DELETE' })
                      try { localStorage.removeItem('alchemy-discovered-v4') } catch {}
                      try { localStorage.removeItem('onboarding-done') } catch {}
                      signOut({ callbackUrl: '/' })
                    } catch {
                      setDeleting(false)
                      setDeleteStep(0)
                    }
                  }}
                  className="flex-1 h-9 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? t('Suppression...', 'Deleting...') : t('Supprimer', 'Delete')}
                </button>
              </div>
            </div>
          )}
          </div>{/* end danger zone card */}
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 pb-1 flex flex-col items-center gap-1">
        <p className="text-[11px] text-muted-foreground/40">
          &copy; {new Date().getFullYear()} Elementz. All rights reserved.
        </p>
        <p className="text-[11px] text-muted-foreground/40">
          Made by{' '}
          <a
            href="https://www.instagram.com/eugenelabaleine"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors"
          >
            @eugenelabaleine
          </a>
        </p>
      </div>
    </div>
  )
}

function HelpPanel({ lang, onBack }: { lang: 'fr' | 'en'; onBack?: () => void }) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  return (
    <div className="flex flex-col gap-4 py-1">

      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all flex-shrink-0"
            aria-label={lang === 'fr' ? 'Retour' : 'Back'}
          >
            <ArrowLeft className="w-4 h-4 text-foreground/70" />
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0">
            <Question size={18} weight="regular" className="text-foreground/70" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{t('Comment jouer', 'How to play')}</h2>
            <p className="text-xs text-muted-foreground">{t('Alchimie en 3 minutes', 'Alchemy in 3 minutes')}</p>
          </div>
        </div>
      </div>

      {/* Video */}
      <div className="rounded-2xl overflow-hidden border border-border bg-muted/20">
        <video src="/tutohelp.webm" autoPlay loop muted playsInline preload="auto" className="w-full h-auto block" />
      </div>

      {/* Core mechanic */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3.5 flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{t('Le principe', 'The concept')}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t(
            'Glisse un élément sur un autre pour tenter une combinaison. Si une recette existe, un nouvel élément apparaît. Explore librement — il y a 593 éléments à découvrir.',
            'Drag one element onto another to attempt a combination. If a recipe exists, a new element appears. Explore freely — there are 593 elements to discover.'
          )}
        </p>
      </div>

      {/* Tips list */}
      <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {/* Démarrer */}
        <div className="flex items-start gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
            <HouseSimple size={15} weight="fill" className="text-foreground/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('4 éléments de départ', '4 starting elements')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Eau, Feu, Terre et Air sont disponibles dès le début. Tout part de là.', 'Water, Fire, Earth and Air are available from the start. Everything begins here.')}
            </p>
          </div>
        </div>
        {/* Inventaire */}
        <div className="flex items-start gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
            <Scroll size={15} weight="regular" className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Inventaire', 'Inventory')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Tes éléments découverts sont listés en bas. Appuie dessus pour les poser sur le terrain, ou glisse-les directement.', 'Your discovered elements are listed below. Tap to place them on the board, or drag them directly.')}
            </p>
          </div>
        </div>
        {/* Vider */}
        <div className="flex items-start gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Vider le terrain', 'Clear the board')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Le bouton en haut à gauche retire tous les éléments posés en un coup.', 'The button top-left removes all placed elements at once.')}
            </p>
          </div>
        </div>
        {/* Indice */}
        <div className="flex items-start gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb className="w-3.5 h-3.5 text-foreground/50" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Bouton Indice', 'Hint button')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Le bouton central de la barre de navigation révèle une combinaison possible. Il clignote doucement si tu sembles bloqué.', 'The central button in the navigation bar reveals a possible combination. It glows softly if you seem stuck.')}
            </p>
          </div>
        </div>
        {/* Quêtes */}
        <div className="flex items-start gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell size={15} weight="regular" className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Quêtes', 'Quests')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Accomplis des défis quotidiens et permanents pour gagner des tickets à gratter révélant des recettes secrètes.', 'Complete daily and permanent challenges to earn scratch tickets revealing secret recipes.')}
            </p>
          </div>
        </div>
        {/* Sauvegarde */}
        <div className="flex items-start gap-3 px-4 py-3 bg-card">
          <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
            <User size={15} weight="regular" className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('Sauvegarde', 'Save progress')}</p>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              {t('Sans compte, ta progression reste sur cet appareil. Connecte-toi pour la retrouver partout — sans mot de passe, juste un email.', "Without an account, your progress stays on this device. Sign in to access it everywhere — no password, just an email.")}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

function ProfileDiscoveryChart({ userId, lang }: { userId: string; lang: 'fr' | 'en' }) {
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  useEffect(() => {
    fetch(`/api/leaderboard/stats?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  const fmtBucket = (b: string, gran: string) => {
    const d = new Date(b)
    if (gran === 'hour') return d.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
  }

  const chartData = stats?.series.map(s => ({
    label: fmtBucket(s.bucket, stats.granularity),
    value: s.cumulative,
  })) ?? []

  if (loading) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
    </div>
  )

  if (!stats || chartData.length < 2) return null

  return (
    <div className="rounded-2xl bg-muted/30 px-4 pt-4 pb-3 flex flex-col gap-2">
      <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-semibold">
        {t('Découvertes au fil du temps', 'Discoveries over time')}
      </span>
      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="grad-profile" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.40} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-foreground"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  {payload[0].value} {t('éléments', 'elements')}
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#grad-profile)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {/* First / last date labels */}
      <div className="flex justify-between px-0.5">
        <span className="text-[9px] text-muted-foreground/30 tabular-nums">{chartData[0]?.label}</span>
        <span className="text-[9px] text-muted-foreground/30 tabular-nums">{chartData[chartData.length - 1]?.label}</span>
      </div>
    </div>
  )
}

function ProfileInlinePanel({ lang, sessionUser, elementsByName, discovered, totalElements, onAvatarChange, onOpenLeaderboard, onOpenCodex, onSignOut }: {
  lang: 'fr' | 'en'
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
  /** Keyed by current-lang name (+ FR fallback) — used for avatar display and picker */
  elementsByName: Map<string, ElementDef>
  discovered: Set<number>
  totalElements: number
  onAvatarChange?: (key: string) => void
  onOpenLeaderboard?: () => void
  onOpenCodex?: () => void
  onSignOut?: () => void
}) {
  const TOTAL_ELEMENTS = totalElements
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
  const [nameInputFocused, setNameInputFocused] = useState(false)
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
  const avatarEl = avatarKey
    ? (/^\d+$/.test(avatarKey)
        ? elementsByName.get(avatarKey) ?? [...elementsByName.values()].find(e => e.number === Number(avatarKey)) ?? undefined
        : (elementsByName.get(avatarKey)
          ?? elementsByName.get(avatarKey.toLowerCase())
          ?? [...elementsByName.values()].find(e => e.name.toLowerCase() === avatarKey.toLowerCase())
          ?? undefined))
    : undefined
  const displayName = profile?.username || sessionUser.name?.split(' ')[0] || t('Joueur', 'Player')
  const pct = profile ? Math.round((profile.discovered_count / TOTAL_ELEMENTS) * 100) : 0
  const allDiscovered = Array.from(elementsByName.values()).filter(e => e.imageUrl && discovered.has(e.number))

  const saveName = async () => {
    if (!profile) return
    const trimmed = nameInput.trim()
    if (trimmed.length > 20) { setNameError(t('Max 20 caractères', 'Max 20 characters')); return }
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) { setNameError(t('Lettres, chiffres, _ et -', 'Letters, numbers, _ and -')); return }
    setSaving(true)
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: trimmed || null }) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setNameError(d?.error ?? t('Erreur', 'Error')); setSaving(false); return }
    setProfile(p => p ? { ...p, username: trimmed || null } : p)
    setEditingName(false); setNameInputFocused(false); setNameError(''); setSaving(false)
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

  const [emailRevealed, setEmailRevealed] = useState(false)
  const maskedEmail = sessionUser.email
    ? sessionUser.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '•'.repeat(Math.max(3, b.length)) + c)
    : null

  if (!profile) return (
    <div className="flex justify-center py-12">
      <div className="w-5 h-5 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
    </div>
  )

  return (
    <>
      {/* ── Fullscreen: Avatar picker ── */}
      {pickingAvatar && (
        <div className="fixed inset-0 z-[9998] flex flex-col bg-background animate-in slide-in-from-bottom-4 duration-250"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Sheet handle + header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
            <button
              onClick={() => setPickingAvatar(false)}
              className="text-sm font-medium text-primary cursor-pointer"
            >
              {t('Annuler', 'Cancel')}
            </button>
            <span className="text-sm font-semibold text-foreground">{t('Choisir un avatar', 'Choose avatar')}</span>
            <div className="w-14" />
          </div>

          {/* Current avatar preview */}
          <div className="flex flex-col items-center gap-3 py-6 flex-shrink-0">
            <div
              className="w-24 h-24 rounded-[28px] flex items-center justify-center overflow-hidden p-4"
              style={{ background: avatarEl ? `${avatarEl.color}22` : 'var(--muted)' }}
            >
              {avatarEl?.imageUrl
                ? <img src={avatarEl.imageUrl} alt={avatarEl.name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                : <span className="text-3xl font-bold text-muted-foreground">{displayName[0]?.toUpperCase()}</span>
              }
            </div>
            <p className="text-xs text-muted-foreground/50">{t('Avatar actuel', 'Current avatar')}</p>
          </div>

          {/* Grid of discovered elements */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {allDiscovered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('Découvre des éléments pour débloquer des avatars.', 'Discover elements to unlock avatars.')}
              </p>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground/40 uppercase tracking-widest font-semibold mb-3 px-1">
                  {allDiscovered.length} {t('éléments disponibles', 'elements available')}
                </p>
                <div className="grid grid-cols-5 gap-2.5">
                  {allDiscovered.map(el => {
                    const isSelected = avatarKey === el.name
                    return (
                      <button
                        key={el.name}
                        onClick={() => saveAvatar(el.name)}
                        title={el.name}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all active:scale-95 cursor-pointer ${isSelected ? 'ring-2 ring-primary/60 ring-offset-1 ring-offset-background' : 'opacity-75 hover:opacity-100'}`}
                        style={{ background: `${el.color}15` }}
                      >
                        <img src={el.imageUrl!} alt={el.name} className="w-9 h-9 object-contain pointer-events-none" draggable={false} />
                        <span className="text-[9px] text-muted-foreground/60 truncate w-full text-center leading-none">{el.name}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Fullscreen: Username editor ── */}
      {editingName && (
        <div className="fixed inset-0 z-[9998] flex flex-col bg-background animate-in slide-in-from-bottom-4 duration-250"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Top bar — hidden when keyboard is open on mobile */}
          <div className={`flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 transition-all duration-150 ${nameInputFocused ? 'opacity-0 pointer-events-none h-0 pt-0 pb-0 overflow-hidden' : 'opacity-100'}`}>
            <button
              onClick={() => { setEditingName(false); setNameError(''); setNameInput(profile?.username ?? '') }}
              className="text-sm font-medium text-primary cursor-pointer"
            >
              {t('Annuler', 'Cancel')}
            </button>
            <span className="text-sm font-semibold text-foreground">{t('Pseudo', 'Username')}</span>
            <button
              onClick={saveName}
              disabled={saving}
              className="text-sm font-semibold text-primary disabled:opacity-40 cursor-pointer"
            >
              {saving ? t('Enregistrement…', 'Saving…') : t('Enregistrer', 'Save')}
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start pt-10 px-6 gap-5">
            {/* Live preview — hidden when keyboard open to save space */}
            {!nameInputFocused && (
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-4xl font-bold text-foreground text-balance leading-tight">
                  {nameInput || <span className="text-muted-foreground/30">{t('Ton pseudo', 'Your username')}</span>}
                </span>
                <span className="text-xs text-muted-foreground/40">{nameInput.length}/20</span>
              </div>
            )}

            <input
              ref={inputRef}
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setNameError('') }}
              onKeyDown={e => e.key === 'Enter' && !saving && saveName()}
              onFocus={() => setNameInputFocused(true)}
              onBlur={() => setNameInputFocused(false)}
              maxLength={20}
              placeholder={t('Ton pseudo…', 'Your username…')}
              className="w-full max-w-xs h-12 px-4 rounded-2xl bg-muted text-base text-center text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              autoFocus
              autoComplete="off"
              style={{ fontSize: '16px' }}
            />

            {nameError
              ? <p className="text-sm text-red-400 text-center">{nameError}</p>
              : <p className="text-xs text-muted-foreground/40 text-center">
                  {t('Lettres, chiffres, _ et - uniquement. Max 20 caractères.', 'Letters, numbers, _ and - only. Max 20 chars.')}
                </p>
            }

            {/* When keyboard is open: show inline Cancel / Save below the input */}
            {nameInputFocused && (
              <div className="flex items-center gap-3 w-full max-w-xs">
                <button
                  onMouseDown={e => { e.preventDefault(); setEditingName(false); setNameError(''); setNameInput(profile?.username ?? '') }}
                  className="flex-1 h-11 rounded-2xl border border-border text-sm font-medium text-muted-foreground cursor-pointer"
                >
                  {t('Annuler', 'Cancel')}
                </button>
                <button
                  onMouseDown={e => { e.preventDefault(); saveName() }}
                  disabled={saving}
                  className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {saving ? '…' : t('Enregistrer', 'Save')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 py-1">

        {/* ── Hero: avatar + identity ── */}
        <div className="flex flex-col items-center gap-4 pt-4 pb-2">

          {/* Avatar with edit badge */}
          <button
            onClick={() => setPickingAvatar(true)}
            className="relative group active:scale-95 transition-transform cursor-pointer"
            aria-label={t('Changer avatar', 'Change avatar')}
          >
            <div
              className="w-[88px] h-[88px] rounded-[26px] flex items-center justify-center overflow-hidden p-[18px] transition-opacity group-active:opacity-80"
              style={{ background: avatarEl ? `${avatarEl.color}22` : 'var(--muted)' }}
            >
              {avatarEl?.imageUrl
                ? <img src={avatarEl.imageUrl} alt={avatarEl.name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                : <span className="text-3xl font-bold text-muted-foreground">{displayName[0]?.toUpperCase()}</span>
              }
            </div>
            {/* Edit badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-foreground border-2 border-background flex items-center justify-center shadow-sm">
              <Pencil className="w-2.5 h-2.5 text-background" />
            </div>
          </button>

          {/* Name */}
          <button
            onClick={() => { setEditingName(true); setTimeout(() => inputRef.current?.focus(), 80) }}
            className="flex flex-col items-center gap-0.5 cursor-pointer group"
          >
            <span className="text-[22px] font-bold text-foreground leading-tight tracking-tight group-active:opacity-70 transition-opacity">
              {displayName}
            </span>
            <span className="text-[11px] text-primary/60 font-medium">{t('Modifier le pseudo', 'Edit username')}</span>
          </button>

          {/* Email — masked, tap to reveal */}
          {maskedEmail && (
            <button
              onClick={() => setEmailRevealed(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 cursor-pointer"
            >
              {emailRevealed
                ? <EyeOff className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                : <Eye className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
              }
              <span className="text-[11px] text-muted-foreground/60 font-mono tracking-tight">
                {emailRevealed ? sessionUser.email : maskedEmail}
              </span>
            </button>
          )}
        </div>

        {/* ── Stats ─��� */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: profile.discovered_count, label: t('éléments', 'elements') },
            { value: `${pct}%`, label: t('complété', 'complete') },
            { value: profile.rank ? `#${profile.rank}` : '—', label: t('rang', 'rank') },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-muted/40">
              <span className="text-[22px] font-bold text-foreground tabular-nums leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground/50 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wide">{t('Progression', 'Progress')}</span>
            <span className="text-[11px] text-muted-foreground/50 tabular-nums">{profile.discovered_count} / {TOTAL_ELEMENTS}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
          </div>
        </div>

        {/* ── Discovery chart ── */}
        <ProfileDiscoveryChart userId={sessionUser.id!} lang={lang} />

        {/* ── iOS-style grouped rows ── */}
        <div className="rounded-2xl overflow-hidden bg-card divide-y divide-border/60">
          <button
            onClick={onOpenLeaderboard}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t('Classement', 'Leaderboard')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
          </button>
          <button
            onClick={onOpenCodex}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Books size={16} weight="regular" className="text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t('Recettes', 'Recipes')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
          </button>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Medal className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t('Visible dans le classement', 'Show in leaderboard')}</p>
            </div>
            <button
              onClick={() => {
                setProfile(p => p ? { ...p, show_in_leaderboard: !p.show_in_leaderboard } : p)
                patch({ show_in_leaderboard: !profile.show_in_leaderboard })
              }}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${profile.show_in_leaderboard ? 'bg-primary' : 'bg-muted-foreground/25'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${profile.show_in_leaderboard ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Recent discoveries */}
        {profile.last_discovered.length > 0 && (
          <div className="rounded-2xl overflow-hidden bg-card divide-y divide-border/60">
            <div className="px-4 py-2.5">
              <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest">{t('Dernières découvertes', 'Recent discoveries')}</p>
            </div>
            {profile.last_discovered.map((el, i) => {
              const name = lang === 'fr' ? el.name_french : el.name_english
              const diff = Date.now() - new Date(el.discovered_at).getTime()
              const mins = Math.floor(diff / 60000)
              const hours = Math.floor(diff / 3600000)
              const days = Math.floor(diff / 86400000)
              const ago = days > 0 ? t(`${days}j`, `${days}d`) : hours > 0 ? t(`${hours}h`, `${hours}h`) : t(`${mins}min`, `${mins}m`)
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted/60 p-1.5">
                    {el.img
                      ? <img src={el.img} alt={name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                      : <AtomIcon className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <span className="text-sm text-foreground font-medium flex-1 truncate">{name}</span>
                  <span className="text-[11px] text-muted-foreground/40 flex-shrink-0 tabular-nums">{ago}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Admin panel */}
        {profile?.is_admin && (
          <a
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-blue-500/8 active:bg-blue-500/14 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/12 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-blue-400 flex-1">{t('Panel admin', 'Admin panel')}</span>
            <ChevronRight className="w-4 h-4 text-blue-400/40 flex-shrink-0" />
          </a>
        )}

      </div>
    </>
  )
}

