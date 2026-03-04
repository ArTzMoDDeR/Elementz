'use client'

import { useEffect, useState, useRef } from 'react'
import { X, LogOut, Pencil, Check, Trophy, ChevronRight, Medal, Atom } from 'lucide-react'
import { signOut } from 'next-auth/react'
import type { ElementDef } from '@/lib/game-data'

type Lang = 'fr' | 'en'

const TOTAL_ELEMENTS = 592

interface LastDiscovered {
  name_french: string
  name_english: string
  img: string | null
  discovered_at: string
}

interface ProfileData {
  username: string | null
  show_in_leaderboard: boolean
  haptic_feedback: boolean
  discovered_count: number
  avatar: string | null
  rank: number | null
  total_players: number
  last_discovered: LastDiscovered[]
}

interface ProfileModalProps {
  lang: Lang
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
  elements: Map<string, ElementDef>
  discovered: Set<string>
  onClose: () => void
  onOpenLeaderboard?: () => void
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

// Grouped section iOS-style
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-border divide-y divide-border ${className}`}>
      {children}
    </div>
  )
}

function Row({ children, onClick, chevron = false, className = '' }: {
  children: React.ReactNode
  onClick?: () => void
  chevron?: boolean
  className?: string
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 bg-card ${onClick ? 'cursor-pointer active:bg-muted/60' : ''} ${className}`}
    >
      <div className="flex-1 flex items-center gap-3 min-w-0">{children}</div>
      {chevron && <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export function ProfileModal({ lang, sessionUser, elements, discovered, onClose, onOpenLeaderboard }: ProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setNameInput(data.username ?? '')
      })
  }, [])

  const displayName = profile?.username || sessionUser.name?.split(' ')[0] || 'Player'
  const pct = profile ? Math.round((profile.discovered_count / TOTAL_ELEMENTS) * 100) : 0

  // Avatar
  const STARTERS = ['eau', 'feu', 'terre', 'air']
  const avatarKey = profile?.avatar ?? STARTERS[Math.abs(hashStr(sessionUser.email ?? 'x')) % 4]
  const avatarEl = elements.get(avatarKey)

  // Only unlocked elements for avatar picker
  const allDiscovered = Array.from(elements.values()).filter(e => e.imageUrl && discovered.has(e.name))

  const saveName = async () => {
    if (!profile) return
    const trimmed = nameInput.trim()
    if (trimmed.length > 20) { setNameError(t('Max 20 caractères', 'Max 20 characters')); return }
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
      setNameError(t('Lettres, chiffres, _ et - uniquement', 'Letters, numbers, _ and - only'))
      return
    }
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed || null }),
    })
    if (res.status === 409) {
      setNameError(t('Ce pseudo est déjà pris', 'Username already taken'))
      setSaving(false)
      return
    }
    setProfile(p => p ? { ...p, username: trimmed || null } : p)
    setEditingName(false)
    setNameError('')
    setSaving(false)
  }

  const patch = async (fields: Record<string, unknown>) => {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
  }

  const saveAvatar = (key: string) => {
    setProfile(p => p ? { ...p, avatar: key } : p)
    setPickingAvatar(false)
    patch({ avatar: key })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={pickingAvatar ? () => setPickingAvatar(false) : onClose}
      />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[400px] md:max-h-[90vh] bg-background md:rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden [padding-top:calc(env(safe-area-inset-top,0px)+0px)] [padding-bottom:calc(env(safe-area-inset-bottom,0px)+0px)]">

        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
          <h2 className="text-base font-semibold">{t('Profil', 'Profile')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Hero: avatar + name */}
          <div className="flex flex-col items-center gap-3 pt-8 pb-6 px-4">
            {/* Avatar */}
            <button
              onClick={() => setPickingAvatar(v => !v)}
              className="relative w-20 h-20 rounded-3xl flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-border p-3 group"
              style={{ background: avatarEl ? `${avatarEl.color}20` : 'var(--muted)' }}
            >
              {avatarEl?.imageUrl ? (
                <img src={avatarEl.imageUrl} alt={avatarEl.name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">{displayName[0]?.toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                <Pencil className="w-5 h-5 text-white" />
              </div>
            </button>

            {/* Name */}
            {editingName ? (
              <div className="flex flex-col items-center gap-1.5 w-full max-w-[200px]">
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
                  />
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-50 flex-shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                {nameError && <p className="text-xs text-red-400">{nameError}</p>}
              </div>
            ) : (
              <button
                onClick={() => { setEditingName(true); setTimeout(() => inputRef.current?.focus(), 50) }}
                className="flex items-center gap-1.5 group"
              >
                <span className="text-lg font-bold text-foreground">{displayName}</span>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </button>
            )}

            <p className="text-xs text-muted-foreground/50">{sessionUser.email}</p>
          </div>

          {/* Avatar picker */}
          {pickingAvatar && (
            <div className="mx-4 mb-4 p-3 rounded-2xl bg-card border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {t('Choisir un avatar', 'Choose an avatar')}
              </p>
              <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
                {allDiscovered.map(el => {
                  const isSelected = avatarKey === el.name
                  return (
                    <button
                      key={el.name}
                      onClick={() => saveAvatar(el.name)}
                      title={el.name}
                      className={`aspect-square rounded-xl p-1.5 flex items-center justify-center transition-all border ${
                        isSelected
                          ? 'border-foreground/40 ring-2 ring-foreground/20'
                          : 'bg-muted/40 border-transparent hover:border-border'
                      }`}
                      style={{ background: `${el.color}18` }}
                    >
                      <img src={el.imageUrl!} alt={el.name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-5 px-4 pb-8">

            {/* Stats row */}
            {profile && (
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
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {profile.rank ? `#${profile.rank}` : '—'}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{t('rang', 'rank')}</span>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {profile && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t('Progression', 'Progress')}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{profile.discovered_count} / {TOTAL_ELEMENTS}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: 'var(--primary)' }}
                  />
                </div>
              </div>
            )}

            {/* Recent discoveries */}
            {profile && profile.last_discovered.length > 0 && (
              <Section>
                <div className="px-4 py-2.5 bg-card">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('Dernières découvertes', 'Recent discoveries')}
                  </p>
                </div>
                {profile.last_discovered.map((el, i) => {
                  const name = lang === 'fr' ? el.name_french : el.name_english
                  const when = new Date(el.discovered_at)
                  const diff = Date.now() - when.getTime()
                  const mins = Math.floor(diff / 60000)
                  const hours = Math.floor(diff / 3600000)
                  const days = Math.floor(diff / 86400000)
                  const ago = days > 0
                    ? t(`il y a ${days}j`, `${days}d ago`)
                    : hours > 0
                    ? t(`il y a ${hours}h`, `${hours}h ago`)
                    : t(`il y a ${mins}min`, `${mins}m ago`)
                  return (
                    <Row key={i}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted p-1 border border-border">
                        {el.img
                          ? <img src={el.img} alt={name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                          : <Atom className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                      <span className="text-sm text-foreground font-medium flex-1 truncate">{name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{ago}</span>
                    </Row>
                  )
                })}
              </Section>
            )}

            {/* Leaderboard + visibility */}
            <Section>
              <Row
                onClick={() => { onClose(); onOpenLeaderboard?.() }}
                chevron
              >
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t('Classement', 'Leaderboard')}</p>
                  {profile?.rank && (
                    <p className="text-xs text-muted-foreground">
                      {t(`Tu es #${profile.rank} sur ${profile.total_players} joueurs`, `You're #${profile.rank} of ${profile.total_players} players`)}
                    </p>
                  )}
                </div>
              </Row>
              {profile && (
                <Row>
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Medal className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t('Visible dans le classement', 'Show in leaderboard')}</p>
                    <p className="text-xs text-muted-foreground">{t('Apparaître dans le top joueurs', 'Appear in the rankings')}</p>
                  </div>
                  <Toggle
                    value={profile.show_in_leaderboard}
                    onChange={val => {
                      setProfile(p => p ? { ...p, show_in_leaderboard: val } : p)
                      patch({ show_in_leaderboard: val })
                    }}
                  />
                </Row>
              )}
            </Section>

            {/* Sign out */}
            <Section>
              <Row
                onClick={() => {
                  try { localStorage.removeItem('alchemy-discovered-v3') } catch {}
                  signOut({ callbackUrl: '/login' })
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-sm font-medium text-red-400">{t('Se déconnecter', 'Sign out')}</span>
              </Row>
            </Section>

          </div>
        </div>

      </div>
    </>
  )
}
