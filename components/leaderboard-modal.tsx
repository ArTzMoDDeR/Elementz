'use client'

import { useEffect, useState } from 'react'
import { X, Trophy, Medal } from 'lucide-react'

type Lang = 'fr' | 'en'

interface LeaderboardEntry {
  user_id: string
  username: string | null
  avatar: string | null
  avatar_img: string | null
  count: number
  updated_at: string
}

interface LeaderboardModalProps {
  lang: Lang
  onClose: () => void
}

function AvatarCell({ avatarImg, fallbackLabel }: { avatarImg: string | null; fallbackLabel: string }) {
  return (
    <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
      {avatarImg ? (
        <img src={avatarImg} alt="" draggable={false} className="w-full h-full object-contain pointer-events-none" />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">{fallbackLabel}</span>
      )}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-400" />
  if (rank === 2) return <Medal className="w-4 h-4 text-zinc-400" />
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
  return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank}</span>
}

export function LeaderboardModal({ lang, onClose }: LeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setEntries(data.leaderboard ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[440px] md:max-h-[80vh] bg-card md:rounded-2xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden">

        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {lang === 'fr' ? 'Classement' : 'Leaderboard'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-muted-foreground">
                {lang === 'fr' ? "Aucun joueur pour l'instant." : 'No players yet.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry, i) => {
                const rank = i + 1
                const displayName = entry.username || (lang === 'fr' ? `Joueur #${rank}` : `Player #${rank}`)
                const fallback = displayName.slice(0, 2).toUpperCase()
                return (
                  <li key={entry.user_id} className={`flex items-center gap-3 px-5 py-3.5 ${rank === 1 ? 'bg-yellow-500/5' : ''}`}>
                    <div className="w-6 flex items-center justify-center flex-shrink-0">
                      <RankBadge rank={rank} />
                    </div>
                    <AvatarCell avatarImg={entry.avatar_img} fallbackLabel={fallback} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-sm font-bold text-foreground tabular-nums">{entry.count}</span>
                      <span className="text-xs text-muted-foreground">
                        {lang === 'fr' ? 'éléments' : 'elements'}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex-shrink-0 px-5 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {lang === 'fr' ? 'Connecte-toi pour apparaître dans le classement' : 'Sign in to appear on the leaderboard'}
          </p>
        </div>

      </div>
    </>
  )
}


type Lang = 'fr' | 'en'

interface LeaderboardEntry {
  user_id: string
  username: string | null
  avatar: string | null
  count: number
  updated_at: string
}

interface LeaderboardModalProps {
  lang: Lang
  elements: Map<string, ElementDef>
  onClose: () => void
}

// Same ElementIcon helper as profile-modal — image only, no label
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
  return <span className="text-xs font-bold text-white/70">{element.name[0].toUpperCase()}</span>
}

function AvatarCell({ avatarKey, elements, fallbackLabel }: { avatarKey: string | null; elements: Map<string, ElementDef>; fallbackLabel: string }) {
  const el = avatarKey ? elements.get(avatarKey) : null
  return (
    <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
      {el ? (
        <ElementIcon element={el} className="w-full h-full" />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">{fallbackLabel}</span>
      )}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-400" />
  if (rank === 2) return <Medal className="w-4 h-4 text-zinc-400" />
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
  return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank}</span>
}

export function LeaderboardModal({ lang, elements, onClose }: LeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setEntries(data.leaderboard ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div
        className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[440px] md:max-h-[80vh] bg-card md:rounded-2xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-foreground">
              {lang === 'fr' ? 'Classement' : 'Leaderboard'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-muted-foreground">
                {lang === 'fr' ? "Aucun joueur pour l'instant." : 'No players yet.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry, i) => {
                const rank = i + 1
                const displayName = entry.username || (lang === 'fr' ? `Joueur #${rank}` : `Player #${rank}`)
                const fallback = displayName.slice(0, 2).toUpperCase()
                return (
                  <li
                    key={entry.user_id}
                    className={`flex items-center gap-3 px-5 py-3.5 ${rank === 1 ? 'bg-yellow-500/5' : ''}`}
                  >
                    <div className="w-6 flex items-center justify-center flex-shrink-0">
                      <RankBadge rank={rank} />
                    </div>

                    <AvatarCell avatarKey={entry.avatar} elements={elements} fallbackLabel={fallback} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-sm font-bold text-foreground tabular-nums">{entry.count}</span>
                      <span className="text-xs text-muted-foreground">
                        {lang === 'fr' ? 'éléments' : 'elements'}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {lang === 'fr'
              ? 'Connecte-toi pour apparaître dans le classement'
              : 'Sign in to appear on the leaderboard'}
          </p>
        </div>

      </div>
    </>
  )
}
