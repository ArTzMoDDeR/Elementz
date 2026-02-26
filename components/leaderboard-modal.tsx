'use client'

import { useEffect, useState } from 'react'
import { X, Trophy, Medal } from 'lucide-react'

type Lang = 'fr' | 'en'

interface LeaderboardEntry {
  user_id: string
  count: number
  updated_at: string
}

interface LeaderboardModalProps {
  lang: Lang
  onClose: () => void
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-400" />
  if (rank === 2) return <Medal className="w-4 h-4 text-zinc-400" />
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
  return (
    <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">
      {rank}
    </span>
  )
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
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-sm text-muted-foreground">
                {lang === 'fr' ? 'Aucun joueur pour l\'instant.' : 'No players yet.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry, i) => {
                const rank = i + 1
                return (
                  <li
                    key={entry.user_id}
                    className={`flex items-center gap-3 px-5 py-3.5 ${rank === 1 ? 'bg-yellow-500/5' : ''}`}
                  >
                    {/* Rank */}
                    <div className="w-6 flex items-center justify-center flex-shrink-0">
                      <RankBadge rank={rank} />
                    </div>

                    {/* Avatar placeholder */}
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {entry.user_id.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* User id (anonymous) */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {lang === 'fr' ? `Joueur #${rank}` : `Player #${rank}`}
                      </p>
                    </div>

                    {/* Count */}
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
