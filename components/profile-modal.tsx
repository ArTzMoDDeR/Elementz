'use client'

import { useEffect, useState, useRef } from 'react'
import { X, LogOut, Pencil, Check, Trophy, ChevronRight, Medal, Atom, Eye, EyeOff } from 'lucide-react'
import { signOut } from 'next-auth/react'
import type { ElementDef } from '@/lib/game-data'

type Lang = 'fr' | 'en'

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
  elementsByName: Map<string, ElementDef>
  discovered: Set<number>
  totalElements: number
  onClose: () => void
  onOpenLeaderboard?: () => void
  onSignOut?: () => void
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-primary' : 'bg-muted-foreground/25'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export function ProfileModal({ lang, sessionUser, elementsByName, discovered, totalElements, onClose, onOpenLeaderboard, onSignOut }: ProfileModalProps) {
  const TOTAL_ELEMENTS = totalElements
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickingAvatar, setPickingAvatar] = useState(false)
  const [emailRevealed, setEmailRevealed] = useState(false)
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

  const STARTERS = ['eau', 'feu', 'terre', 'air']
  const avatarKey = profile?.avatar ?? STARTERS[Math.abs(hashStr(sessionUser.email ?? 'x')) % 4]
  const avatarEl = elementsByName.get(avatarKey)

  const allDiscovered = Array.from(elementsByName.values()).filter(e => e.imageUrl && discovered.has(e.number))

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
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setNameError(data?.error ?? t('Erreur', 'Error'))
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

  const maskedEmail = sessionUser.email
    ? sessionUser.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.max(2, b.length)) + c)
    : null

  return (
    <>
      <div
        className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={pickingAvatar ? () => setPickingAvatar(false) : onClose}
      />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[420px] md:max-h-[90vh] bg-background md:rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">{t('Profil', 'Profile')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Hero */}
          <div className="flex flex-col items-center gap-4 px-5 pb-6">

            {/* Avatar */}
            <button
              onClick={() => setPickingAvatar(v => !v)}
              className="relative group"
              aria-label={t('Changer avatar', 'Change avatar')}
            >
              <div
                className="w-24 h-24 rounded-[28px] flex items-center justify-center overflow-hidden border border-white/8 p-4 transition-transform group-active:scale-95"
                style={{ background: avatarEl ? `${avatarEl.color}22` : 'var(--muted)' }}
              >
                {avatarEl?.imageUrl ? (
                  <img src={avatarEl.imageUrl} alt={avatarEl.name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">{displayName[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-foreground flex items-center justify-center shadow-md">
                <Pencil className="w-3 h-3 text-background" />
              </div>
            </button>

            {/* Name edit */}
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
                    className="flex-1 h-10 px-3 rounded-xl bg-muted border border-border text-sm text-center text-foreground outline-none focus:border-foreground/30 transition-colors"
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-50 flex-shrink-0 cursor-pointer"
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
                <span className="text-xl font-bold text-foreground">{displayName}</span>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </button>
            )}

            {/* Email (hidden by default) */}
            {maskedEmail && (
              <button
                onClick={() => setEmailRevealed(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                {emailRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span className="font-mono tracking-tight">
                  {emailRevealed ? sessionUser.email : maskedEmail}
                </span>
              </button>
            )}
          </div>

          {/* Avatar picker */}
          {pickingAvatar && (
            <div className="mx-5 mb-5 p-3 rounded-2xl bg-muted/30 border border-border/50">
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3">
                {t('Choisir un avatar', 'Choose an avatar')}
              </p>
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {allDiscovered.map(el => {
                  const isSelected = avatarKey === el.name
                  return (
                    <button
                      key={el.name}
                      onClick={() => saveAvatar(el.name)}
                      title={el.name}
                      className={`aspect-square rounded-xl p-1.5 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'ring-2 ring-foreground/30 ring-offset-1 ring-offset-background'
                          : 'opacity-70 hover:opacity-100'
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

          <div className="flex flex-col gap-4 px-5 pb-8">

            {/* Stats */}
            {profile && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: profile.discovered_count, label: t('éléments', 'elements') },
                  { value: `${pct}%`, label: t('complété', 'complete') },
                  { value: profile.rank ? `#${profile.rank}` : '—', label: t('rang', 'rank') },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-muted/30">
                    <span className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</span>
                    <span className="text-[10px] text-muted-foreground/60 text-center">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Progress bar */}
            {profile && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground/60">{t('Progression', 'Progress')}</span>
                  <span className="text-xs text-muted-foreground/60 tabular-nums">{profile.discovered_count} / {TOTAL_ELEMENTS}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: 'var(--primary)' }}
                  />
                </div>
              </div>
            )}

            {/* Recent discoveries */}
            {profile && profile.last_discovered.length > 0 && (
              <div className="flex flex-col gap-1 rounded-2xl overflow-hidden bg-muted/20">
                <div className="px-4 pt-3 pb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                    {t('Dernières découvertes', 'Recent discoveries')}
                  </p>
                </div>
                {profile.last_discovered.map((el, i) => {
                  const name = lang === 'fr' ? el.name_french : el.name_english
                  const diff = Date.now() - new Date(el.discovered_at).getTime()
                  const mins = Math.floor(diff / 60000)
                  const hours = Math.floor(diff / 3600000)
                  const days = Math.floor(diff / 86400000)
                  const ago = days > 0 ? t(`${days}j`, `${days}d`) : hours > 0 ? t(`${hours}h`, `${hours}h`) : t(`${mins}min`, `${mins}m`)
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-border/30 first:border-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/60 p-1">
                        {el.img
                          ? <img src={el.img} alt={name} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                          : <Atom className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>
                      <span className="text-sm text-foreground font-medium flex-1 truncate">{name}</span>
                      <span className="text-[11px] text-muted-foreground/50 flex-shrink-0 tabular-nums">{ago}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Leaderboard */}
            <div className="rounded-2xl overflow-hidden bg-muted/20">
              <button
                onClick={() => { onClose(); onOpenLeaderboard?.() }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted/40 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t('Classement', 'Leaderboard')}</p>
                  {profile?.rank && (
                    <p className="text-xs text-muted-foreground/60">
                      {t(`#${profile.rank} sur ${profile.total_players} joueurs`, `#${profile.rank} of ${profile.total_players} players`)}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
              </button>

              {profile && (
                <div className="flex items-center gap-3 px-4 py-3.5 border-t border-border/30">
                  <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <Medal className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t('Visible dans le classement', 'Show in leaderboard')}</p>
                    <p className="text-xs text-muted-foreground/60">{t('Apparaître dans le top joueurs', 'Appear in the rankings')}</p>
                  </div>
                  <Toggle
                    value={profile.show_in_leaderboard}
                    onChange={val => {
                      setProfile(p => p ? { ...p, show_in_leaderboard: val } : p)
                      patch({ show_in_leaderboard: val })
                    }}
                  />
                </div>
              )}
            </div>

            {/* Sign out */}
            <button
              onClick={() => {
                try { localStorage.removeItem('alchemy-discovered-v4') } catch {}
                onSignOut?.()
                signOut({ callbackUrl: '/login' })
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-red-500/8 hover:bg-red-500/14 active:bg-red-500/20 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-red-500/12 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-sm font-medium text-red-400">{t('Se déconnecter', 'Sign out')}</span>
            </button>

          </div>
        </div>
      </div>
    </>
  )
}
