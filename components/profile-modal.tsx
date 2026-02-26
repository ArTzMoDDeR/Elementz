'use client'

import { useEffect, useState, useRef } from 'react'
import { X, LogOut, Pencil, Check, Trophy } from 'lucide-react'
import { signOut } from 'next-auth/react'

type Lang = 'fr' | 'en'

interface ProfileModalProps {
  lang: Lang
  sessionUser: { name?: string | null; email?: string | null; image?: string | null }
  onClose: () => void
}

interface ProfileData {
  username: string | null
  show_in_leaderboard: boolean
  discovered_count: number
}

export function ProfileModal({ lang, sessionUser, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
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

  return (
    <>
      <div
        className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[999] flex flex-col md:w-[400px] md:max-h-[90vh] bg-card md:rounded-2xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-250 overflow-hidden">

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
            {sessionUser.image ? (
              <img src={sessionUser.image} alt="" className="w-14 h-14 rounded-2xl border border-border flex-shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-xl font-bold text-muted-foreground flex-shrink-0">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
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
              <p className="text-xs text-muted-foreground truncate mt-0.5">{sessionUser.email}</p>
            </div>
          </div>

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
              {/* Toggle */}
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
