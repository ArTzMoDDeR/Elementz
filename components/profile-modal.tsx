'use client'

import { useEffect, useState, useRef } from 'react'
import { X, LogOut, Pencil, Check, Trophy } from 'lucide-react'
import { signOut } from 'next-auth/react'
import type { ElementDef } from '@/lib/game-data'

// Renders only the image/svg of an element, no label
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

type Lang = 'fr' | 'en'

// Starting 4 elements (both langs) used as default avatars
const STARTING_ELEMENTS_FR = ['eau', 'feu', 'terre', 'air']
const STARTING_ELEMENTS_EN = ['water', 'fire', 'earth', 'air']

interface ProfileModalProps {
  lang: Lang
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
  elements: Map<string, ElementDef>
  onClose: () => void
}

interface ProfileData {
  username: string | null
  show_in_leaderboard: boolean
  discovered_count: number
  avatar: string | null
  discovered: string[]
}

export function ProfileModal({ lang, sessionUser, elements, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
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

  // Determine avatar element key to display
  const startingElements = lang === 'fr' ? STARTING_ELEMENTS_FR : STARTING_ELEMENTS_EN
  const avatarKey = profile?.avatar
    ?? startingElements[Math.abs(hashStr(sessionUser.email ?? 'x')) % 4]

  const avatarEl = elements.get(avatarKey)

  const saveName = async () => {
    if (!profile) return
    const trimmed = nameInput.trim()
    if (trimmed.length > 20) { setNameError(t('Max 20 caractères', 'Max 20 characters')); return }
    if (trimmed.length > 0 && !/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
      setNameError(t('Lettres, chiffres, _ et - uniquement', 'Letters, numbers, _ and - only'))
      return
    }
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed || null }),
    })
    setProfile(p => p ? { ...p, username: trimmed || null } : p)
    setEditingName(false)
    setNameError('')
    setSaving(false)
  }

  const toggleLeaderboard = async (val: boolean) => {
    if (!profile) return
    setProfile(p => p ? { ...p, show_in_leaderboard: val } : p)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_in_leaderboard: val }),
    })
  }

  const saveAvatar = async (key: string) => {
    setProfile(p => p ? { ...p, avatar: key } : p)
    setPickingAvatar(false)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: key }),
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={pickingAvatar ? () => setPickingAvatar(false) : onClose}
      />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[400px] md:max-h-[90vh] bg-card md:rounded-2xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden [padding-top:calc(env(safe-area-inset-top,0px)+16px)] [padding-bottom:calc(env(safe-area-inset-bottom,0px)+12px)] md:[padding-top:0px] md:[padding-bottom:0px]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">{t('Profil', 'Profile')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col px-5 gap-5 overflow-y-auto pb-6">

          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            {/* Avatar button */}
            <button
              onClick={() => setPickingAvatar(true)}
              className="relative w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden hover:border-foreground/30 transition-colors group p-2"
            >
              {avatarEl ? (
                <ElementIcon element={avatarEl} className="w-full h-full" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{displayName[0]?.toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Pencil className="w-4 h-4 text-white" />
              </div>
            </button>

            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={inputRef}
                      value={nameInput}
                      onChange={e => { setNameInput(e.target.value); setNameError('') }}
                      onKeyDown={e => e.key === 'Enter' && saveName()}
                      maxLength={20}
                      placeholder={t('Ton pseudo', 'Your username')}
                      className="flex-1 h-8 px-2.5 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/30 transition-colors"
                      autoFocus
                    />
                    <button
                      onClick={saveName}
                      disabled={saving}
                      className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center disabled:opacity-50 flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {nameError && <p className="text-xs text-red-400">{nameError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <button
                    onClick={() => { setEditingName(true); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                {showEmail ? (
                  <p className="text-xs text-muted-foreground truncate">{sessionUser.email}</p>
                ) : (
                  <p className="text-xs text-muted-foreground/40 truncate select-none tracking-widest">••••••••••••</p>
                )}
                <button
                  onClick={() => setShowEmail(v => !v)}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0"
                >
                  {showEmail ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Avatar picker */}
          {pickingAvatar && profile && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('Choisir un avatar', 'Choose an avatar')}
              </p>
              <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
                {profile.discovered.map(key => {
                  const el = elements.get(key)
                  if (!el) return null
                  const isSelected = (profile.avatar ?? avatarKey) === key
                  return (
                    <button
                      key={key}
                      onClick={() => saveAvatar(key)}
                      title={el.name}
                      className={`aspect-square rounded-xl p-2 flex items-center justify-center transition-all border ${
                        isSelected
                          ? 'bg-foreground/10 border-foreground/50 ring-2 ring-foreground/30'
                          : 'bg-muted/40 border-border hover:bg-muted/70 hover:border-foreground/20'
                      }`}
                      style={{ backgroundColor: `${el.color}18` }}
                    >
                      <ElementIcon element={el} className="w-full h-full" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          {profile && (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-xl font-bold text-foreground">{profile.discovered_count}</span>
                <span className="text-xs text-muted-foreground">{t('éléments', 'elements')}</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-xl font-bold text-foreground">
                  {Math.round((profile.discovered_count / 593) * 100)}%
                </span>
                <span className="text-xs text-muted-foreground">{t('complété', 'completed')}</span>
              </div>
            </div>
          )}

          {/* Leaderboard visibility */}
          {profile && (
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t('Classement', 'Leaderboard')}</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {t('Apparaître dans le top joueurs', 'Appear in the top players')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleLeaderboard(!profile.show_in_leaderboard)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${profile.show_in_leaderboard ? 'bg-foreground' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${profile.show_in_leaderboard ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}
        </div>

        {/* Footer: logout */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('Se déconnecter', 'Sign out')}
          </button>
        </div>

      </div>
    </>
  )
}

// Simple deterministic hash for stable default avatar based on email
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}
