'use client'

import { useEffect, useState } from 'react'
import { X, Trophy, Medal } from 'lucide-react'

type Lang = 'fr' | 'en'

interface LeaderboardEntry {
  user_id: string
  rank: number
  username: string | null
  avatar_img: string | null
  count: number
  first_unlock: string | null
  last_unlock: string | null
  is_current_user: boolean
}

interface CurrentUser {
  rank: number
  count: number
  username: string | null
  avatar_img: string | null
}

interface LeaderboardModalProps {
  lang: Lang
  onClose: () => void
}

function AvatarCell({ avatarImg, fallbackLabel, highlight }: { avatarImg: string | null; fallbackLabel: string; highlight?: boolean }) {
  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden p-1 ${highlight ? 'bg-primary/20 border border-primary/40' : 'bg-muted/50'}`}>
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
  return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground/60 tabular-nums">{rank}</span>
}

/** Format duration between two ISO timestamps into a human-readable string */
function formatDuration(first: string | null, last: string | null, lang: Lang): string | null {
  if (!first || !last) return null
  const ms = new Date(last).getTime() - new Date(first).getTime()
  if (ms < 60_000) return null
  const mins = Math.floor(ms / 60_000)
  const hours = Math.floor(ms / 3_600_000)
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return lang === 'fr' ? `${days}j` : `${days}d`
  if (hours >= 1) return `${hours}h`
  return `${mins}min`
}

export function LeaderboardModal({ lang, onClose }: LeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setEntries(data.leaderboard ?? [])
        setCurrentUser(data.currentUser ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[460px] md:max-h-[80vh] bg-background md:rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h2 className="text-base font-semibold text-foreground">
              {t('Classement', 'Leaderboard')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-sm text-muted-foreground">{t("Aucun joueur pour l'instant.", 'No players yet.')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              {entries.map((entry) => {
                const displayName = entry.username || (lang === 'fr' ? `Joueur #${entry.rank}` : `Player #${entry.rank}`)
                const fallback = displayName.slice(0, 2).toUpperCase()
                const duration = formatDuration(entry.first_unlock, entry.last_unlock, lang)
                const isFirst = entry.rank === 1

                return (
                  <li
                    key={entry.user_id}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                      entry.is_current_user ? 'bg-primary/6' : isFirst ? 'bg-yellow-500/4' : ''
                    }`}
                  >
                    <div className="w-5 flex items-center justify-center flex-shrink-0">
                      <RankBadge rank={entry.rank} />
                    </div>
                    <AvatarCell avatarImg={entry.avatar_img} fallbackLabel={fallback} highlight={entry.is_current_user} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${entry.is_current_user ? 'text-primary' : 'text-foreground'}`}>
                        {displayName}
                        {entry.is_current_user && <span className="ml-1.5 text-[10px] text-primary/60 font-normal">{t('toi', 'you')}</span>}
                      </p>
                      {duration && (
                        <p className="text-[10px] text-muted-foreground/40 tabular-nums">{t(`en ${duration}`, `in ${duration}`)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-sm font-bold text-foreground tabular-nums">{entry.count}</span>
                      <span className="text-[11px] text-muted-foreground/50">{t('él.', 'el.')}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Current user rank (if outside top 50) */}
        {!loading && currentUser && (
          <div className="flex-shrink-0 border-t border-border/40">
            <div className="flex items-center gap-3 px-5 py-3 bg-primary/5">
              <div className="w-5 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary/70 tabular-nums">#{currentUser.rank}</span>
              </div>
              <AvatarCell
                avatarImg={currentUser.avatar_img}
                fallbackLabel={(currentUser.username ?? '?').slice(0, 2).toUpperCase()}
                highlight
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  {currentUser.username ?? t('Toi', 'You')}
                  <span className="ml-1.5 text-[10px] text-primary/50 font-normal">{t('toi', 'you')}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-sm font-bold text-foreground tabular-nums">{currentUser.count}</span>
                <span className="text-[11px] text-muted-foreground/50">{t('él.', 'el.')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && !currentUser && (
          <div className="flex-shrink-0 px-5 py-3.5 border-t border-border/40">
            <p className="text-xs text-muted-foreground/50 text-center">
              {t('Connecte-toi pour apparaître dans le classement', 'Sign in to appear on the leaderboard')}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
