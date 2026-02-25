'use client'

import { useRef, useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Playground } from './playground'
import { useGameStore } from '@/hooks/use-game-store'
import { ElementBadge } from './element-badge'
import { Sparkles, LogOut, LogIn, Trash2 } from 'lucide-react'
import Link from 'next/link'

export function AlchemyGame() {
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()
  const {
    lang,
    setLang,
    elements,
    discovered,
    playground,
    newlyDiscovered,
    initialized,
    totalElements,
    addToPlayground,
    moveOnPlayground,
    removeFromPlayground,
    clearPlayground,
    tryMerge,
    dropAndMerge,
    resetProgress,
    unlockAll,
  } = useGameStore()

  useEffect(() => { setMounted(true) }, [])

  if (!mounted || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="game-container bg-background">
      <Playground
        items={playground}
        elements={elements}
        discovered={discovered}
        lang={lang}
        onSetLang={setLang}
        onDrop={addToPlayground}
        onMove={moveOnPlayground}
        onMerge={tryMerge}
        onDropAndMerge={dropAndMerge}
        onRemove={removeFromPlayground}
        onClear={clearPlayground}
        onReset={resetProgress}
        onUnlockAll={unlockAll}
      />

      {/* Top-left fixed cluster: user widget + HUD (counter + clear) */}
      <div className="fixed top-3 left-3 z-[102] flex flex-col items-start gap-2 pointer-events-none">
        {/* User row */}
        <div className="pointer-events-auto">
          {session?.user ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-card/80 border border-border/60 rounded-xl backdrop-blur-sm">
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-6 h-6 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
              )}
              <span className="text-xs text-muted-foreground max-w-[100px] truncate hidden sm:block">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card/80 border border-border/60 rounded-xl backdrop-blur-sm text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Se connecter</span>
            </Link>
          )}
        </div>
        {/* HUD row: counter + clear */}
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums px-2.5 py-1.5 rounded-lg bg-card/80 border border-border/60 backdrop-blur-sm text-muted-foreground" suppressHydrationWarning>
            {discovered.size}<span className="opacity-50">/{totalElements}</span>
          </span>
          <button
            onClick={clearPlayground}
            disabled={playground.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/80 border border-border/60 hover:bg-card text-muted-foreground hover:text-foreground text-xs font-medium backdrop-blur-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {lang === 'fr' ? 'Vider' : 'Clear'}
          </button>
        </div>
      </div>

      {newlyDiscovered && elements.get(newlyDiscovered) && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-popover border border-border rounded-xl shadow-lg">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-foreground">
              {lang === 'fr' ? 'Nouveau !' : 'New!'}
            </span>
            <ElementBadge element={elements.get(newlyDiscovered)!} size="sm" />
          </div>
        </div>
      )}
    </div>
  )
}
