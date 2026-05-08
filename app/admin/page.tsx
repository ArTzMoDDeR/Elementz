'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'

import {
  Search, Upload, Check, FileUp, Plus, X, Trash2, Save, Hash,
  ArrowDownAZ, Pencil, ChevronLeft, ChevronRight, RefreshCw, Shield, ShieldOff,
  Users, Layers, Scroll, BarChart3, AlertCircle, CheckCircle2, Clock, Mail, Send, CheckCheck,
  TrendingUp, Activity, Repeat2, Download, Bell, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ResponsiveContainer, AreaChart, BarChart, LineChart,
  Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Element = {
  number: number
  name_english: string
  name_french: string
  img: string | null
  recipe_count?: number
}

type Recipe = {
  id: number
  ingredient1_number: number
  ingredient1_name: string
  ingredient2_number: number
  ingredient2_name: string
}

type ProducesEntry = {
  id: number
  other_number: number
  other_name: string
  other_img: string | null
  result_number: number
  result_name: string
  result_img: string | null
}

type AdminUser = {
  id: string
  email: string
  name: string | null
  created_at: string
  is_admin: number
  username: string | null
  show_in_leaderboard: boolean
  discovered: number
  last_active: string | null
}

type AdminStats = {
  elements: number
  recipes: number
  users: number
  unlocks: number
  quests: number
  rewards: number
  noImg: number
  noRecipe: number
  newUsersToday: number
  activeToday: number
  topDiscoverers: { username: string | null; email: string; count: number }[]
  recentSignups: { id: string; email: string; name: string | null; created_at: string }[]
}

type QuestDef = {
  id: number
  type: string
  title_fr: string
  title_en: string
  desc_fr: string
  desc_en: string
  target_value: number
  icon: string
  sort_order: number
  is_daily: boolean
  completed_count: number
  claimed_count: number
  in_progress_count: number
}

// ─── Shared components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1 min-w-0">
      <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-none ${color ?? 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground/60 truncate">{sub}</p>}
    </div>
  )
}

function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  return <div className={`${cls} border-2 border-current border-t-transparent rounded-full animate-spin`} />
}

function Badge({ color, label }: { color: 'green' | 'amber' | 'red' | 'blue' | 'zinc'; label: string }) {
  const colors = {
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    blue: 'bg-primary/10 text-primary border-primary/20',
    zinc: 'bg-muted text-muted-foreground border-border',
  }
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${colors[color]}`}>{label}</span>
}

// ─── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20"><Spinner size="md" /></div>
  )
  if (!stats) return <p className="text-sm text-muted-foreground text-center py-20">Erreur de chargement</p>

  const imgPct = Math.round(((stats.elements - stats.noImg) / Math.max(stats.elements, 1)) * 100)
  const recipePct = Math.round(((stats.elements - stats.noRecipe) / Math.max(stats.elements, 1)) * 100)

  return (
    <div className="space-y-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Éléments" value={stats.elements} sub={`${stats.noImg} sans image`} />
        <StatCard label="Recettes" value={stats.recipes} sub={`${stats.noRecipe} éléments sans recette`} />
        <StatCard label="Joueurs" value={stats.users} sub={`+${stats.newUsersToday} aujourd'hui`} color="text-primary" />
        <StatCard label="Découvertes" value={stats.unlocks.toLocaleString()} sub={stats.activeToday + " joueurs actifs aujourd'hui"} color="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Couverture images</p>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-muted-foreground">{stats.elements - stats.noImg} / {stats.elements} éléments</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{imgPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${imgPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-muted-foreground">{stats.elements - stats.noRecipe} / {stats.elements} avec recette</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{recipePct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${recipePct}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold">Quêtes</p>
          <div className="flex gap-3">
            <StatCard label="Définitions" value={stats.quests} />
            <StatCard label="Récompenses grattées" value={stats.rewards} />
          </div>
        </div>
      </div>

      {/* Top discoverers + Recent signups side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Top 5 découvreurs</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {stats.topDiscoverers.map((u, i) => (
                <tr key={u.email} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 w-8 text-xs font-mono text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 max-w-0">
                    <p className="font-medium truncate">{u.username ?? u.email}</p>
                    {u.username && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-foreground w-12">{u.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Inscriptions récentes</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {stats.recentSignups.map(u => (
                <tr key={u.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 max-w-0">
                    <p className="font-medium truncate">{u.name ?? u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Missing Elements Modal ──────────────────────────────────────────────────

type MissingElement = { number: number; name_french: string; name_english: string }

function MissingElementsModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [items, setItems] = useState<MissingElement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`/api/admin/users/missing?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d.missing) ? d.missing : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user.id])

  const filtered = items.filter(el =>
    el.name_french.toLowerCase().includes(search.toLowerCase()) ||
    el.name_english.toLowerCase().includes(search.toLowerCase()) ||
    String(el.number).includes(search)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.name ?? user.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading ? '…' : `${user.discovered} découverts · ${items.length} manquant${items.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={onClose} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          {!loading && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Progression</span>
                <span className="text-[10px] font-semibold tabular-nums text-foreground">
                  {Math.round((user.discovered / (user.discovered + items.length)) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.round((user.discovered / (user.discovered + items.length)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        {!loading && items.length > 10 && (
          <div className="px-5 py-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Filtrer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="md" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? 'Aucun résultat' : 'Ce joueur a tout découvert !'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {filtered.map(el => (
                <div key={el.number} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-[10px] tabular-nums text-muted-foreground/60 w-6 flex-shrink-0">#{el.number}</span>
                  <span className="text-xs truncate">{el.name_french}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Users ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [missingUser, setMissingUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(debouncedSearch)}&page=${page}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } catch {}
    setLoading(false)
  }, [debouncedSearch, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const toggleAdmin = async (user: AdminUser) => {
    setToggling(user.id)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_admin: !user.is_admin }),
    })
    await fetchUsers()
    setToggling(null)
  }

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Rechercher email, nom, pseudo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <span className="text-xs text-muted-foreground">{total} utilisateur{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Utilisateur</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Pseudo</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Découvertes</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Classement</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Dernière activité</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Inscription</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="flex justify-center"><Spinner size="md" /></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Aucun utilisateur trouvé</td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium truncate">{u.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono truncate max-w-[120px]">
                    {u.username ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold">{u.discovered}</td>
                  <td className="px-4 py-3 text-center">
                    {u.show_in_leaderboard
                      ? <Badge color="green" label="Visible" />
                      : <Badge color="zinc" label="Caché" />
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {u.last_active ? new Date(u.last_active).toLocaleDateString('fr', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('fr', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setMissingUser(u)}
                        title="Voir les éléments manquants"
                        className="inline-flex items-center gap-1 px-2 py-1 h-7 rounded-lg border border-border text-xs text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                      >
                        <Layers className="w-3 h-3 flex-shrink-0" />
                        <span className="hidden sm:inline">Manquants</span>
                      </button>
                      <button
                        onClick={() => toggleAdmin(u)}
                        disabled={!!toggling}
                        title={u.is_admin ? 'Révoquer admin' : 'Donner admin'}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${u.is_admin ? 'bg-primary/10 border-primary/30 text-primary hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive' : 'border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary'}`}
                      >
                        {toggling === u.id ? <Spinner /> : u.is_admin ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {missingUser && (
        <MissingElementsModal user={missingUser} onClose={() => setMissingUser(null)} />
      )}
    </div>
  )
}

// ─── Tab: Quests ─────────────────────────────────────────────────────────────────

const QUEST_ICONS: Record<string, string> = {
  sparkles: '✦', flask: '⚗', compass: '◎', microscope: '🔬', crown: '♛', gem: '◈',
  droplets: '💧', flame: '🔥', wind: '〜', mountain: '△', sun: '☀', star: '★',
}

function QuestsTab() {
  const [quests, setQuests] = useState<QuestDef[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<QuestDef | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const fetchQuests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/quests')
      const data = await res.json()
      setQuests(data.quests ?? [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchQuests() }, [fetchQuests])

  const saveQuest = async () => {
    if (!editing) return
    setSaving(true)
    await fetch('/api/admin/quests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    await fetchQuests()
    setSaving(false)
    setEditing(null)
  }

  const deleteQuest = async (id: number) => {
    if (!confirm('Supprimer cette quête ?')) return
    setDeleting(id)
    await fetch('/api/admin/quests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await fetchQuests()
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{quests.length} quête{quests.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Nouvelle quête
        </Button>
      </div>

      {/* Add modal */}
      {showAdd && <AddQuestModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); fetchQuests() }} />}

      {/* Edit sheet */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Modifier la quête #{editing.id}</h3>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Titre FR</label><Input value={editing.title_fr} onChange={e => setEditing({ ...editing, title_fr: e.target.value })} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Titre EN</label><Input value={editing.title_en} onChange={e => setEditing({ ...editing, title_en: e.target.value })} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Desc FR</label><Input value={editing.desc_fr} onChange={e => setEditing({ ...editing, desc_fr: e.target.value })} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Desc EN</label><Input value={editing.desc_en} onChange={e => setEditing({ ...editing, desc_en: e.target.value })} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Objectif</label><Input type="number" value={editing.target_value} onChange={e => setEditing({ ...editing, target_value: parseInt(e.target.value) || 1 })} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Ordre</label><Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} className="h-8 text-sm" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Icône</label><Input value={editing.icon} onChange={e => setEditing({ ...editing, icon: e.target.value })} className="h-8 text-sm" /></div>
              <div className="flex items-end gap-2 pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.is_daily} onChange={e => setEditing({ ...editing, is_daily: e.target.checked })} className="rounded" />
                  <span className="text-sm">Quête daily</span>
                </label>
              </div>
            </div>
            <Button className="w-full" disabled={saving} onClick={saveQuest}>
              {saving ? <><Spinner /><span className="ml-2">Sauvegarde...</span></> : <><Save className="w-3.5 h-3.5 mr-1.5" />Sauvegarder</>}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="md" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-8">ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Quête</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Objectif</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">En cours</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Complétées</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Réclamées</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Daily</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {quests.map(q => (
                  <tr key={q.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{q.id}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-medium truncate">{q.title_fr}</p>
                      <p className="text-xs text-muted-foreground truncate">{q.desc_fr}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{q.type}</span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums font-bold">{q.target_value}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{q.in_progress_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{q.completed_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{q.claimed_count}</td>
                    <td className="px-4 py-3 text-center">
                      {q.is_daily ? <Badge color="amber" label="Daily" /> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditing(q)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent hover:border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteQuest(q.id)} disabled={deleting === q.id} className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                          {deleting === q.id ? <Spinner /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function AddQuestModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ type: 'discover_n', title_fr: '', title_en: '', desc_fr: '', desc_en: '', target_value: 10, icon: 'star', sort_order: 100, is_daily: false })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/quests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    onAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Nouvelle quête</h3>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full h-8 rounded-md border border-border bg-background text-sm px-2">
              {['discover_n','use_water_n','use_fire_n','use_air_n','use_earth_n','daily_login','daily_combo'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Objectif</label><Input type="number" value={form.target_value} onChange={e => setForm({ ...form, target_value: parseInt(e.target.value) || 1 })} className="h-8 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Titre FR</label><Input value={form.title_fr} onChange={e => setForm({ ...form, title_fr: e.target.value })} className="h-8 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Titre EN</label><Input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} className="h-8 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Desc FR</label><Input value={form.desc_fr} onChange={e => setForm({ ...form, desc_fr: e.target.value })} className="h-8 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Desc EN</label><Input value={form.desc_en} onChange={e => setForm({ ...form, desc_en: e.target.value })} className="h-8 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Icône</label><Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="h-8 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Ordre</label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="h-8 text-sm" /></div>
          <div className="flex items-center gap-2 col-span-2">
            <input type="checkbox" id="is_daily_new" checked={form.is_daily} onChange={e => setForm({ ...form, is_daily: e.target.checked })} className="rounded" />
            <label htmlFor="is_daily_new" className="text-sm cursor-pointer">Quête daily (réinitialisée chaque jour)</label>
          </div>
        </div>
        <Button className="w-full" disabled={saving || !form.title_fr} onClick={save}>
          {saving ? <><Spinner /><span className="ml-2">Création...</span></> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Créer</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Tab: Elements (refactored, same logic, new look) ─────────────────────────

function ElementCard({ element, uploading, onEdit, onUpload }: {
  element: Element
  uploading: Set<number>
  onEdit: (el: Element) => void
  onUpload: (number: number, file: File) => void
}) {
  return (
    <div className="relative group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors cursor-pointer" onClick={() => onEdit(element)}>
      {/* Image area */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden p-2">
        {element.img
          ? <img src={element.img} alt={element.name_french} className="w-full h-full object-contain" loading="lazy" decoding="async" />
          : <span className="text-[10px] font-mono text-muted-foreground/30">#{element.number}</span>
        }
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-1.5">
          <label className="cursor-pointer" onClick={e => e.stopPropagation()}>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(element.number, f) }} />
            <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors">
              {uploading.has(element.number) ? <Spinner /> : <Upload className="w-3 h-3" />}
            </div>
          </label>
          <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
            <Pencil className="w-3 h-3" />
          </div>
        </div>
      </div>
      {/* Label */}
      <div className="px-2 py-1.5">
        <p className="text-[10px] font-semibold truncate leading-tight text-foreground">{element.name_french}</p>
        <p className="text-[9px] font-mono text-muted-foreground/40 leading-tight">#{element.number}</p>
      </div>
      {/* No-image dot */}
      {!element.img && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}
    </div>
  )
}

function EditModal({ element, elements, onClose, onSaved }: {
  element: Element; elements: Element[]; onClose: () => void; onSaved: (updated: Element) => void
}) {
  const [nameFr, setNameFr] = useState(element.name_french)
  const [nameEn, setNameEn] = useState(element.name_english)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [img, setImg] = useState(element.img)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [produces, setProduces] = useState<ProducesEntry[]>([])
  const [loadingProduces, setLoadingProduces] = useState(true)
  const [selected, setSelected] = useState<[Element | null, Element | null]>([null, null])
  const [recipeSearch, setRecipeSearch] = useState('')
  const [addingRecipe, setAddingRecipe] = useState(false)
  const [deletingRecipe, setDeletingRecipe] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/elements/${element.number}/recipes`).then(r => r.json()).then(d => { setRecipes(Array.isArray(d) ? d : []); setLoadingRecipes(false) }).catch(() => setLoadingRecipes(false))
    fetch(`/api/elements/${element.number}/produces`).then(r => r.json()).then(d => { setProduces(Array.isArray(d) ? d : []); setLoadingProduces(false) }).catch(() => setLoadingProduces(false))
  }, [element.number])

  const save = async () => {
    setSaving(true)
    await fetch(`/api/elements/${element.number}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name_french: nameFr, name_english: nameEn }) })
    setSaving(false)
    onSaved({ ...element, name_french: nameFr, name_english: nameEn, img })
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch(`/api/elements/${element.number}/image`, { method: 'POST', body: fd })
    if (res.ok) { const d = await res.json(); setImg(d.url); onSaved({ ...element, name_french: nameFr, name_english: nameEn, img: d.url }) }
    setUploading(false)
  }

  const selectIngredient = (el: Element) => {
    setSelected(prev => !prev[0] ? [el, null] : !prev[1] ? [prev[0], el] : [el, null])
  }

  const addRecipe = async () => {
    const [ing1, ing2] = selected
    if (!ing1 || !ing2) return
    setAddingRecipe(true)
    const res = await fetch(`/api/elements/${element.number}/recipes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredient1_number: ing1.number, ingredient2_number: ing2.number }) })
    if (res.ok) { const d = await fetch(`/api/elements/${element.number}/recipes`).then(r => r.json()); setRecipes(Array.isArray(d) ? d : []); setSelected([null, null]); setRecipeSearch('') }
    setAddingRecipe(false)
  }

  const deleteRecipe = async (id: number) => {
    setDeletingRecipe(id)
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== id))
    setDeletingRecipe(null)
  }

  const filteredForRecipe = recipeSearch.length >= 1
    ? elements.filter(e => e.name_french.toLowerCase().includes(recipeSearch.toLowerCase()) || e.number.toString().includes(recipeSearch)).slice(0, 30)
    : elements.slice(0, 30)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
              {img ? <img src={img} alt="" className="w-full h-full object-contain" /> : <span className="text-[10px] font-mono text-muted-foreground">#{element.number}</span>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">#{element.number}</p>
              <h2 className="text-lg font-bold leading-tight">{element.name_french}</h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-5 space-y-6">
          {/* Image + Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Image</p>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {img ? <img src={img} alt="" className="w-full h-full object-contain" /> : <span className="text-2xl text-muted-foreground font-bold">?</span>}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Spinner /> : <Upload className="w-3 h-3 mr-1.5" />}
                    {img ? "Changer" : "Uploader"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Noms</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Français</label>
                <Input value={nameFr} onChange={e => setNameFr(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Anglais</label>
                <Input value={nameEn} onChange={e => setNameEn(e.target.value)} className="h-8 text-sm" placeholder="(optionnel)" />
              </div>
              <Button onClick={save} disabled={saving} size="sm" className="w-full">
                {saving ? <Spinner /> : <Save className="w-3 h-3 mr-1.5" />}Sauvegarder
              </Button>
            </div>
          </div>

          {/* Recipes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Combinaisons pour créer cet élément</p>
            {loadingRecipes ? <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Spinner />Chargement...</div>
              : recipes.length === 0 ? <p className="text-xs text-muted-foreground italic py-2">Aucune combinaison</p>
              : (
                <div className="flex flex-wrap gap-2 mb-4">
                  {recipes.map(r => {
                    const el1 = elements.find(e => e.number === r.ingredient1_number)
                    const el2 = elements.find(e => e.number === r.ingredient2_number)
                    return (
                      <div key={r.id} className="flex items-center gap-1.5 bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-xs group">
                        {el1?.img && <img src={el1.img} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                        <span className="font-medium">{r.ingredient1_name}</span>
                        <span className="text-muted-foreground">+</span>
                        {el2?.img && <img src={el2.img} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                        <span className="font-medium">{r.ingredient2_name}</span>
                        <button className="ml-1 text-muted-foreground hover:text-destructive transition-colors" disabled={deletingRecipe === r.id} onClick={() => deleteRecipe(r.id)}>
                          {deletingRecipe === r.id ? <Spinner /> : <X className="w-3 h-3" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

            {/* Add recipe picker */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="p-3 bg-muted/20 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {!selected[0] ? 'Sélectionne le 1er ingrédient' : !selected[1] ? 'Sélectionne le 2ème ingrédient' : 'Prêt'}
                </p>
                <div className="flex items-center gap-2">
                  {[0, 1].map(slot => (
                    <div key={slot} className={`flex-1 flex items-center gap-2 rounded-lg px-3 h-9 border text-sm transition-colors ${selected[slot] ? 'bg-background border-border' : 'border-dashed border-muted-foreground/30 bg-muted/20'}`}>
                      {selected[slot] ? (
                        <>
                          {selected[slot]!.img && <img src={selected[slot]!.img!} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                          <span className="flex-1 truncate font-medium text-xs">{selected[slot]!.name_french}</span>
                          <button onClick={() => setSelected(prev => slot === 0 ? [prev[1], null] : [prev[0], null])} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X className="w-3 h-3" /></button>
                        </>
                      ) : <span className="text-xs text-muted-foreground">Ingrédient {slot + 1}</span>}
                    </div>
                  ))}
                  <span className="text-muted-foreground font-bold text-sm">+</span>
                  <Button size="sm" disabled={!selected[0] || !selected[1] || addingRecipe} onClick={addRecipe} className="flex-shrink-0 h-9">
                    {addingRecipe ? <Spinner /> : <Plus className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input type="text" placeholder="Rechercher..." value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 bg-muted/40 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-44 overflow-y-auto">
                  {filteredForRecipe.map(el => {
                    const isSel = selected[0]?.number === el.number || selected[1]?.number === el.number
                    return (
                      <button key={el.number} onClick={() => selectIngredient(el)}
                        className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all text-center ${isSel ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-muted/20 hover:bg-muted/60'}`}>
                        <div className="w-8 h-8 flex items-center justify-center">
                          {el.img ? <img src={el.img} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full rounded bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">#{el.number}</div>}
                        </div>
                        <span className="text-[9px] leading-tight line-clamp-2 w-full">{el.name_french}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Produces */}
          {!loadingProduces && produces.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Crée aussi… ({produces.length})</p>
              <div className="flex flex-wrap gap-2">
                {produces.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs">
                    <span className="text-muted-foreground">+</span>
                    {p.other_img && <img src={p.other_img} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                    <span className="font-medium">{p.other_name}</span>
                    <span className="text-muted-foreground mx-0.5">=</span>
                    {p.result_img && <img src={p.result_img} className="w-4 h-4 object-contain flex-shrink-0" alt="" />}
                    <span className="font-semibold">{p.result_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: (el: Element) => void }) {
  const [nameFr, setNameFr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (saving) return
    if (!nameFr.trim()) { setError('Le nom français est requis'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/elements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name_french: nameFr.trim(), name_english: nameEn.trim() }) })
      if (res.ok) { const el = await res.json(); onAdded(el) }
      else { const err = await res.json().catch(() => ({})); setError(`Erreur: ${err.detail || err.error || res.status}`) }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Nouvel élément</h3>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
        </div>
        <div><label className="text-xs text-muted-foreground mb-1 block">Nom français *</label><Input value={nameFr} onChange={e => setNameFr(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground mb-1 block">Nom anglais</label><Input value={nameEn} onChange={e => setNameEn(e.target.value)} /></div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button className="w-full" disabled={saving} onClick={create}>
          {saving ? <Spinner /> : <Plus className="w-3 h-3 mr-1.5" />}Créer
        </Button>
      </div>
    </div>
  )
}

const PAGE_SIZE = 120

function ElementsTab() {
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'with' | 'without' | 'no-recipe'>('all')
  const [sortBy, setSortBy] = useState<'number' | 'alpha'>('number')
  const [isDragging, setIsDragging] = useState(false)
  const [editingElement, setEditingElement] = useState<Element | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { fetchElements() }, [])

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [search, filterStatus, sortBy])

  const fetchElements = async () => {
    try {
      const res = await fetch('/api/elements')
      const data = await res.json()
      setElements(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  const handleFileUpload = async (elementNumber: number, file: File) => {
    setUploading(prev => new Set(prev).add(elementNumber))
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`/api/elements/${elementNumber}/image`, { method: 'POST', body: fd })
      if (res.ok) { const data = await res.json(); setElements(prev => prev.map(el => el.number === elementNumber ? { ...el, img: data.url } : el)) }
    } finally { setUploading(prev => { const n = new Set(prev); n.delete(elementNumber); return n }) }
  }

  const normalizeForMatch = (str: string) => str.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim()

  const handleBulkUpload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const fileName = file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '')
      const fileNorm = normalizeForMatch(fileName)
      const element = elements.find(el => el.number.toString() === fileName || normalizeForMatch(el.name_french) === fileNorm || normalizeForMatch(el.name_english) === fileNorm)
      if (element) await handleFileUpload(element.number, file)
    }
  }

  const filteredElements = useMemo(() => {
    const q = search.toLowerCase()
    return elements
      .filter(el => {
        const matches = !q || el.name_french.toLowerCase().includes(q) || el.name_english.toLowerCase().includes(q) || el.number.toString().includes(q)
        if (!matches) return false
        if (filterStatus === 'with') return !!el.img
        if (filterStatus === 'without') return !el.img
        return true
      })
      .sort((a, b) => sortBy === 'alpha' ? a.name_french.localeCompare(b.name_french, 'fr') : a.number - b.number)
  }, [elements, search, filterStatus, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredElements.length / PAGE_SIZE))
  const visibleElements = filteredElements.slice(0, page * PAGE_SIZE)
  const hasMore = page * PAGE_SIZE < filteredElements.length

  const stats = useMemo(() => ({
    total: elements.length,
    withImage: elements.filter(el => el.img).length,
    withoutImage: elements.filter(el => !el.img).length,
  }), [elements])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="md" /></div>

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) handleBulkUpload(e.dataTransfer.files) }}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-dashed border-primary rounded-2xl p-12 flex flex-col items-center gap-3">
            <FileUp className="w-12 h-12 text-primary" />
            <p className="text-lg font-semibold">Déposez vos images ici</p>
            <p className="text-sm text-muted-foreground">Format: [numéro ou nom].jpg</p>
          </div>
        </div>
      )}
      {editingElement && (
        <EditModal element={editingElement} elements={elements} onClose={() => setEditingElement(null)}
          onSaved={u => { setElements(prev => prev.map(el => el.number === u.number ? u : el)); setEditingElement(u) }} />
      )}
      {showAdd && (
        <AddModal onClose={() => setShowAdd(false)} onAdded={el => { setElements(prev => [...prev, el]); setShowAdd(false); setEditingElement(el) }} />
      )}

      {/* Filters + toolbar */}
      <div className="space-y-3 mb-5">
        {/* Stat pills */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all',     label: 'Tous',        value: stats.total        },
            { key: 'with',    label: 'Avec image',  value: stats.withImage    },
            { key: 'without', label: 'Sans image',  value: stats.withoutImage },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key as typeof filterStatus)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm border transition-colors ${filterStatus === f.key ? 'bg-foreground text-background border-foreground' : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'}`}>
              <span className="tabular-nums font-bold">{f.value}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
        {/* Search + sort + add */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Numéro ou nom..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {([['number', Hash, 'N°'], ['alpha', ArrowDownAZ, 'A-Z']] as const).map(([key, Icon, lbl]) => (
              <button key={key} onClick={() => setSortBy(key)}
                className={`flex items-center gap-1 px-3 h-7 rounded-md text-xs font-medium transition-colors ${sortBy === key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="w-3 h-3" />{lbl}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="h-9">
            <Plus className="w-3.5 h-3.5 mr-1" />Ajouter
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filteredElements.length === 0
        ? <p className="text-sm text-muted-foreground text-center py-16">Aucun élément trouvé</p>
        : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {visibleElements.map(el => (
                <ElementCard key={el.number} element={el} uploading={uploading} onEdit={setEditingElement} onUpload={handleFileUpload} />
              ))}
            </div>
            {hasMore && (
              <div className="flex flex-col items-center gap-1.5 pt-6 pb-2">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-6 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
                >
                  Charger plus ({filteredElements.length - visibleElements.length} restants)
                </button>
              </div>
            )}
          </>
        )
      }
    </div>
  )
}

// ─── Tab: Email ──────────────────────────────────────────────────────────────

type EmailUser = { id: string; email: string; display: string; email_subscribed: boolean }
type SendResult = { sent: number; failed: { email: string; error?: string }[]; total: number } | null

type BlockType = 'text' | 'image' | 'button' | 'divider' | 'heading'
type EmailBlock = {
  id: string
  type: BlockType
  // text / heading
  content?: string
  align?: 'left' | 'center' | 'right'
  // image
  url?: string
  uploading?: boolean
  // button
  label?: string
  href?: string
  color?: string
}

function uid() { return Math.random().toString(36).slice(2) }

function blockToHtml(b: EmailBlock, displayName: string, unsubUrl: string): string {
  const sub = (s: string) => s.replace(/\{username\}/gi, displayName)
  switch (b.type) {
    case 'heading': return `<h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#e5e5e5;text-align:${b.align ?? 'left'};letter-spacing:-0.3px;">${sub(b.content ?? '')}</h2>`
    case 'text': return `<p style="margin:0 0 16px;line-height:1.75;font-size:15px;color:#c0c0c0;text-align:${b.align ?? 'left'};">${sub(b.content ?? '').split('\n').join('<br/>')}</p>`
    case 'image': return b.url ? `<img src="${b.url}" alt="" style="width:100%;max-width:520px;border-radius:12px;display:block;margin:0 0 20px;" />` : ''
    case 'button': return `<div style="text-align:${b.align ?? 'center'};margin:0 0 20px;"><a href="${sub(b.href ?? '#')}" style="display:inline-block;padding:12px 28px;background:${b.color ?? '#ffffff'};color:#000000;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">${sub(b.label ?? 'Cliquer ici')}</a></div>`
    case 'divider': return `<hr style="border:none;border-top:1px solid #2a2a2a;margin:8px 0 24px;" />`
    default: return ''
  }
}

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: EmailBlock; onChange: (b: EmailBlock) => void; onDelete: () => void
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean
}) {
  const uploadImage = async (file: File) => {
    onChange({ ...block, uploading: true })
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/admin/email-image', { method: 'POST', body: fd })
    const data = await res.json()
    onChange({ ...block, url: data.url, uploading: false })
  }

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {block.type === 'text' ? 'Texte' : block.type === 'image' ? 'Image' : block.type === 'button' ? 'Bouton' : block.type === 'heading' ? 'Titre' : 'Séparateur'}
        </span>
        <div className="flex items-center gap-1">
          <button disabled={isFirst} onClick={onMoveUp} className="p-1 rounded hover:bg-muted/60 disabled:opacity-30 transition-colors"><ChevronLeft className="w-3 h-3 rotate-90" /></button>
          <button disabled={isLast} onClick={onMoveDown} className="p-1 rounded hover:bg-muted/60 disabled:opacity-30 transition-colors"><ChevronRight className="w-3 h-3 rotate-90" /></button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Align (text, heading, button) */}
        {(block.type === 'text' || block.type === 'heading' || block.type === 'button') && (
          <div className="flex items-center gap-1">
            {(['left', 'center', 'right'] as const).map(a => (
              <button key={a} onClick={() => onChange({ ...block, align: a })}
                className={`flex-1 py-1 text-xs rounded border transition-colors ${block.align === a ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/40'}`}>
                {a === 'left' ? 'Gauche' : a === 'center' ? 'Centre' : 'Droite'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {(block.type === 'text' || block.type === 'heading') && (
          <textarea
            placeholder={block.type === 'heading' ? 'Titre...' : 'Texte... ({username} sera remplacé)'}
            value={block.content ?? ''}
            onChange={e => onChange({ ...block, content: e.target.value })}
            rows={block.type === 'heading' ? 1 : 4}
            className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground leading-relaxed"
          />
        )}

        {/* Image */}
        {block.type === 'image' && (
          <div className="space-y-2">
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${block.url ? 'border-border' : 'border-border hover:border-foreground/30'}`}>
              {block.uploading ? (
                <Spinner size="md" />
              ) : block.url ? (
                <img src={block.url} alt="" className="max-h-32 rounded-lg object-contain" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Cliquer pour uploader (max 5 Mo)</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
            </label>
            {block.url && (
              <button onClick={() => onChange({ ...block, url: undefined })} className="text-xs text-red-400 hover:underline">Supprimer l&apos;image</button>
            )}
          </div>
        )}

        {/* Button */}
        {block.type === 'button' && (
          <div className="space-y-2">
            <Input placeholder="Texte du bouton" value={block.label ?? ''} onChange={e => onChange({ ...block, label: e.target.value })} className="h-8 text-sm" />
            <Input placeholder="URL (https://...)" value={block.href ?? ''} onChange={e => onChange({ ...block, href: e.target.value })} className="h-8 text-sm font-mono" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Couleur :</span>
              <input type="color" value={block.color ?? '#ffffff'} onChange={e => onChange({ ...block, color: e.target.value })} className="w-8 h-7 rounded border border-border bg-transparent cursor-pointer" />
              <span className="text-xs text-muted-foreground font-mono">{block.color ?? '#ffffff'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmailPreview({ blocks, subject }: { blocks: EmailBlock[]; subject: string }) {
  const bodyHtml = blocks.map(b => blockToHtml(b, '{username}', '#')).join('')
  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-xs text-muted-foreground truncate">{subject || 'Aperçu de l\'e-mail'}</span>
      </div>
      <div className="p-4 overflow-auto max-h-[500px]">
        <div className="max-w-[520px] mx-auto bg-[#141414] rounded-2xl border border-[#2a2a2a] overflow-hidden">
          <div className="px-8 py-6 border-b border-[#2a2a2a]">
            <span className="text-lg font-bold text-white">Elementz</span>
          </div>
          <div className="px-8 py-6"
            dangerouslySetInnerHTML={{ __html: bodyHtml || '<p style="color:#555;font-size:14px;">Ajoutez des blocs pour prévisualiser...</p>' }}
          />
          <div className="px-8 py-5 border-t border-[#2a2a2a]">
            <p style={{ margin: 0, fontSize: 11, color: '#555', lineHeight: 1.6 }}>
              Tu reçois cet e-mail car tu as un compte sur elementz.fun.{' '}
              <span style={{ color: '#555', textDecoration: 'underline' }}>Se désabonner</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmailTab() {
  const [users, setUsers] = useState<EmailUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showUnsub, setShowUnsub] = useState(false)
  const [subject, setSubject] = useState('')
  const [blocks, setBlocks] = useState<EmailBlock[]>([{ id: uid(), type: 'text', content: '', align: 'left' }])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult>(null)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  useEffect(() => {
    fetch('/api/admin/email')
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const subscribedUsers = users.filter(u => u.email_subscribed)
  const unsubCount = users.length - subscribedUsers.length
  const filtered = (showUnsub ? users : subscribedUsers).filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.display ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const allSelected = filtered.length > 0 && filtered.filter(u => u.email_subscribed).every(u => selected.has(u.email))

  const toggleAll = () => {
    const next = new Set(selected)
    if (allSelected) filtered.forEach(u => next.delete(u.email))
    else filtered.forEach(u => { if (u.email_subscribed) next.add(u.email) })
    setSelected(next)
  }
  const toggle = (u: EmailUser) => {
    if (!u.email_subscribed) return
    const next = new Set(selected); next.has(u.email) ? next.delete(u.email) : next.add(u.email); setSelected(next)
  }

  const addBlock = (type: BlockType) => setBlocks(prev => [...prev, { id: uid(), type, content: '', align: 'left', label: 'Cliquer ici', color: '#ffffff' }])
  const updateBlock = (id: string, b: EmailBlock) => setBlocks(prev => prev.map(x => x.id === id ? b : x))
  const deleteBlock = (id: string) => setBlocks(prev => prev.filter(x => x.id !== id))
  const moveBlock = (id: string, dir: -1 | 1) => setBlocks(prev => {
    const i = prev.findIndex(x => x.id === id); if (i < 0) return prev
    const next = [...prev]; const [item] = next.splice(i, 1); next.splice(i + dir, 0, item); return next
  })

  const hasContent = blocks.some(b => b.type === 'divider' || (b.type === 'image' && b.url) || ((b.content ?? '').trim().length > 0) || ((b.label ?? '').trim().length > 0))
  const canSend = selected.size > 0 && subject.trim().length > 0 && hasContent

  const send = async () => {
    if (!canSend) return
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: Array.from(selected), subject, blocks }),
      })
      setResult(await res.json())
    } catch { setResult({ sent: 0, failed: [], total: 0 }) }
    setSending(false)
  }

  const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ElementType }[] = [
    { type: 'heading', label: 'Titre', icon: Hash },
    { type: 'text', label: 'Texte', icon: Pencil },
    { type: 'image', label: 'Image', icon: Upload },
    { type: 'button', label: 'Bouton', icon: ChevronRight },
    { type: 'divider', label: 'Séparateur', icon: ArrowDownAZ },
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
      {/* Left — recipients */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Destinataires</p>
          <div className="flex items-center gap-2">
            {unsubCount > 0 && (
              <button onClick={() => setShowUnsub(v => !v)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${showUnsub ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {unsubCount} désabonné{unsubCount > 1 ? 's' : ''}
              </button>
            )}
            <span className="text-xs text-muted-foreground">{selected.size} / {subscribedUsers.length}</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Filtrer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button onClick={toggleAll}
            className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-muted/30 transition-colors text-left">
            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allSelected ? 'bg-foreground border-foreground' : 'border-border'}`}>
              {allSelected && <Check className="w-2.5 h-2.5 text-background" />}
            </div>
            <span className="text-xs font-medium text-muted-foreground">Tout sélectionner ({filtered.filter(u => u.email_subscribed).length})</span>
          </button>
          <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
            {loading ? (
              <div className="flex justify-center py-8"><Spinner size="md" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun utilisateur</p>
            ) : filtered.map(u => (
              <button key={u.email} onClick={() => toggle(u)} disabled={!u.email_subscribed}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${u.email_subscribed ? 'hover:bg-muted/20' : 'opacity-40 cursor-not-allowed'}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.has(u.email) ? 'bg-foreground border-foreground' : 'border-border'}`}>
                  {selected.has(u.email) && <Check className="w-2.5 h-2.5 text-background" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.display}</p>
                  {u.display !== u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                </div>
                {!u.email_subscribed && <span className="text-[10px] text-muted-foreground flex-shrink-0">désabonné</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right — email builder */}
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Composer l&apos;e-mail</p>
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border">
            {(['edit', 'preview'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'edit' ? 'Éditer' : 'Aperçu'}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Sujet</label>
          <Input placeholder="Sujet de l'e-mail..." value={subject} onChange={e => setSubject(e.target.value)} className="h-9 text-sm" />
        </div>

        {activeTab === 'edit' ? (
          <>
            {/* Add block buttons */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Ajouter un bloc</p>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                  <button key={type} onClick={() => addBlock(type)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors text-xs font-medium text-foreground">
                    <Icon className="w-3 h-3 text-muted-foreground" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocks */}
            <div className="space-y-2">
              {blocks.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground">Ajoutez des blocs ci-dessus pour composer votre e-mail</p>
                </div>
              ) : blocks.map((b, i) => (
                <BlockEditor key={b.id} block={b}
                  onChange={nb => updateBlock(b.id, nb)}
                  onDelete={() => deleteBlock(b.id)}
                  onMoveUp={() => moveBlock(b.id, -1)}
                  onMoveDown={() => moveBlock(b.id, 1)}
                  isFirst={i === 0} isLast={i === blocks.length - 1}
                />
              ))}
            </div>
          </>
        ) : (
          <EmailPreview blocks={blocks} subject={subject} />
        )}

        {/* Result */}
        {result && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${result.sent > 0 && result.failed.length === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
            {result.failed.length === 0 ? <CheckCheck className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">{result.sent}/{result.total} e-mail{result.sent !== 1 ? 's' : ''} envoyé{result.sent !== 1 ? 's' : ''}</p>
              {result.failed.length > 0 && <p className="text-xs mt-0.5 opacity-80">Echecs : {result.failed.map(f => f.email).join(', ')}</p>}
            </div>
          </div>
        )}

        <Button className="w-full h-10" disabled={!canSend || sending} onClick={send}>
          {sending ? <><Spinner /><span className="ml-2">Envoi en cours...</span></> : <><Send className="w-4 h-4 mr-2" />Envoyer à {selected.size} destinataire{selected.size !== 1 ? 's' : ''}</>}
        </Button>
        <p className="text-xs text-muted-foreground text-center">Via Resend · max 50 par envoi · désabonnement inclus automatiquement</p>
      </div>
    </div>
  )
}

// ─── Tab: Stats ──────────────────────────────────────────────────────────────

type DayCount = { day: string; count: number }
type Granularity = 'hour' | 'day' | 'week'
type SeriesKey = 'discoveries' | 'signups' | 'active'
type ChartKind = 'area' | 'bar' | 'line'
type UsageStats = {
  gran: Granularity
  discoveriesPerDay: DayCount[]
  signupsPerDay: DayCount[]
  activePerDay: DayCount[]
  retention: { d1: number | null; d7: number | null; d30: number | null }
  combosToday: number
  combosYesterday: number
  avgDiscoveries: number
  medianDiscoveries: number
  playerDistribution: { casual: number; engaged: number; active: number; hardcore: number }
  topPlayers: { name: string; discoveries: number }[]
  totalUsers: number
  totalUnlocks: number
  newUsersMonth: number
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={['text-2xl font-bold tabular-nums leading-none', color].filter(Boolean).join(' ')}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function StatsTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1 min-w-[140px]">
      <p className="text-muted-foreground font-medium mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-bold tabular-nums">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function buildSeries(gran: Granularity, discoveries: DayCount[], signups: DayCount[], activeData: DayCount[]) {
  const now = new Date()
  const buckets: { key: string; label: string }[] = []
  if (gran === 'hour') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now)
      d.setUTCHours(d.getUTCHours() - i, 0, 0, 0)
      const y = d.getUTCFullYear()
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const hh = String(d.getUTCHours()).padStart(2, '0')
      buckets.push({ key: y + '-' + mo + '-' + dd + ' ' + hh + ':00', label: hh + 'h' })
    }
  } else if (gran === 'week') {
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now)
      d.setUTCDate(d.getUTCDate() - d.getUTCDay() + 1 - i * 7)
      const key = d.toISOString().split('T')[0]
      const dt = new Date(key + 'T12:00:00Z')
      buckets.push({ key, label: dt.getDate() + '/' + (dt.getMonth() + 1) })
    }
  } else {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setUTCDate(d.getUTCDate() - i)
      const key = d.toISOString().split('T')[0]
      const dt = new Date(key + 'T12:00:00Z')
      buckets.push({ key, label: dt.getDate() + '/' + (dt.getMonth() + 1) })
    }
  }
  const find = (arr: DayCount[], k: string) => Number(arr.find(r => r.day === k)?.count ?? 0)
  return buckets.map(b => ({
    label: b.label,
    discoveries: find(discoveries, b.key),
    signups: find(signups, b.key),
    active: find(activeData, b.key),
  }))
}

const SERIES_CFG: { key: SeriesKey; label: string; color: string }[] = [
  { key: 'discoveries', label: 'Decouvertes', color: '#22c55e' },
  { key: 'signups', label: 'Inscriptions', color: '#3b82f6' },
  { key: 'active', label: 'Actifs', color: '#f59e0b' },
]
const PIE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6']

function StatsTab() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [gran, setGran] = useState<Granularity>('day')
  const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(new Set(['discoveries', 'signups', 'active']))
  const [chartKind, setChartKind] = useState<ChartKind>('area')

  const load = useCallback((g: Granularity) => {
    setLoading(true)
    fetch('/api/admin/usage?gran=' + g)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load(gran) }, [gran, load])

  const toggleSeries = (key: SeriesKey) => {
    setActiveSeries(prev => {
      const next = new Set(prev)
      if (next.has(key) && next.size > 1) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!stats && loading) return <div className="flex justify-center py-20"><Spinner size="md" /></div>
  if (!stats) return <p className="text-sm text-muted-foreground text-center py-20">Erreur de chargement</p>

  const comboDelta = stats.combosToday - stats.combosYesterday
  const dist = stats.playerDistribution
  const totalPlayers = Math.max(dist.casual + dist.engaged + dist.active + dist.hardcore, 1)
  const series = buildSeries(gran, stats.discoveriesPerDay, stats.signupsPerDay, stats.activePerDay)
  const activeSer = SERIES_CFG.filter(s => activeSeries.has(s.key))

  const retentionData = [
    { label: 'D1', value: stats.retention.d1 == null ? 0 : Math.round(stats.retention.d1 * 100) },
    { label: 'D7', value: stats.retention.d7 == null ? 0 : Math.round(stats.retention.d7 * 100) },
    { label: 'D30', value: stats.retention.d30 == null ? 0 : Math.round(stats.retention.d30 * 100) },
  ]

  const pieData = [
    { name: 'Casual 1-10', value: dist.casual },
    { name: 'Engage 11-50', value: dist.engaged },
    { name: 'Actif 51-150', value: dist.active },
    { name: 'Hardcore 150+', value: dist.hardcore },
  ].filter(d => d.value > 0)

  const gridEl = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
  const xEl = <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
  const yEl = <YAxis tick={{ fontSize: 10, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} width={36} />

  const retentionColor = (v: number) => {
    if (v >= 30) return '#22c55e'
    if (v >= 15) return '#f59e0b'
    return '#ef4444'
  }

  const d1Pct = stats.retention.d1 == null ? null : Math.round(stats.retention.d1 * 100)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Decouvertes aujourd'hui"
          value={stats.combosToday.toLocaleString()}
          sub={'vs hier: ' + (comboDelta > 0 ? '+' : '') + comboDelta}
        />
        <KpiCard
          label="Total joueurs"
          value={stats.totalUsers.toLocaleString()}
          sub={'+' + stats.newUsersMonth + ' ce mois'}
        />
        <KpiCard
          label="Total decouvertes"
          value={stats.totalUnlocks.toLocaleString()}
          sub={'moy. ' + (stats.avgDiscoveries ?? '0') + '/joueur'}
        />
        <KpiCard
          label="Retention D1"
          value={d1Pct == null ? '—' : d1Pct + '%'}
          sub="reviennent le lendemain"
          color={d1Pct != null && d1Pct >= 30 ? 'text-emerald-400' : 'text-amber-400'}
        />
      </div>

      {/* Main chart */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5 border border-border">
            {(['hour', 'day', 'week'] as Granularity[]).map(g => {
              const labels: Record<Granularity, string> = { hour: '24h', day: '14 jours', week: '13 sem.' }
              return (
                <button key={g} onClick={() => setGran(g)}
                  className={'px-3 py-1.5 text-xs font-semibold rounded-md transition-all ' + (gran === g ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {labels[g]}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5 border border-border">
              {(['area', 'bar', 'line'] as ChartKind[]).map(c => {
                const labels: Record<ChartKind, string> = { area: 'Aire', bar: 'Barres', line: 'Lignes' }
                return (
                  <button key={c} onClick={() => setChartKind(c)}
                    className={'px-3 py-1.5 text-xs font-semibold rounded-md transition-all ' + (chartKind === c ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                    {labels[c]}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SERIES_CFG.map(s => (
                <button key={s.key} onClick={() => toggleSeries(s.key)}
                  className={'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ' + (activeSeries.has(s.key) ? 'text-foreground' : 'border-border text-muted-foreground opacity-40')}
                  style={activeSeries.has(s.key) ? { background: s.color + '15', borderColor: s.color + '45' } : undefined}>
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: 420 }} className="px-2 pt-4 pb-2">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Spinner size="md" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartKind === 'bar' ? (
                <BarChart data={series} barGap={2} barCategoryGap={28}>
                  {gridEl}{xEl}{yEl}
                  <Tooltip content={<StatsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  {activeSer.map(s => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} opacity={0.85} />)}
                </BarChart>
              ) : chartKind === 'line' ? (
                <LineChart data={series}>
                  {gridEl}{xEl}{yEl}
                  <Tooltip content={<StatsTooltip />} />
                  {activeSer.map(s => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />)}
                </LineChart>
              ) : (
                <AreaChart data={series}>
                  <defs>
                    {SERIES_CFG.map(s => (
                      <linearGradient key={s.key} id={'sg-' + s.key} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  {gridEl}{xEl}{yEl}
                  <Tooltip content={<StatsTooltip />} />
                  {activeSer.map(s => (
                    <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                      stroke={s.color} strokeWidth={2} fill={'url(#sg-' + s.key + ')'}
                      dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Retention + Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Repeat2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Retention</p>
          </div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retentionData} layout="vertical" barCategoryGap={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v + '%'} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fontWeight: 600, fill: 'oklch(0.85 0 0)' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  content={({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-popover border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
                        <span className="text-muted-foreground">{label}: </span>
                        <span className="font-bold">{payload[0].value}%</span>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {retentionData.map((r, i) => <Cell key={i} fill={retentionColor(r.value)} opacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Distribution joueurs</p>
          </div>
          <div className="flex items-center gap-5">
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={0.9} />)}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-popover border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
                          <p className="font-semibold">{payload[0].name}</p>
                          <p className="text-muted-foreground">{Number(payload[0].value).toLocaleString()} joueurs</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 min-w-0">
              {pieData.map((d, i) => {
                const pct = Math.round((d.value / totalPlayers) * 100)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs flex-1 truncate text-muted-foreground">{d.name}</span>
                    <span className="text-xs tabular-nums font-semibold w-8 text-right">{d.value}</span>
                    <span className="text-[10px] text-muted-foreground w-6 text-right">{pct + '%'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Push Notifications Tab ───────────────────────────────────────────────────
type Subscriber = { id: number; label: string; lang: string; last_seen: string; email: string }
type SendResult = { id: number; label: string; lang: string; status: 'sent' | 'failed' | 'expired' }
type LogEntry = {
  ts: string
  titleFr?: string; bodyFr?: string
  titleEn?: string; bodyEn?: string
  target: string
  results: SendResult[]
  sent: number; failed: number; cleaned: number
}

function PushTab() {
  const [titleFr,      setTitleFr]      = useState('')
  const [bodyFr,       setBodyFr]       = useState('')
  const [titleEn,      setTitleEn]      = useState('')
  const [bodyEn,       setBodyEn]       = useState('')
  const [url,          setUrl]          = useState('https://elementz.fun')
  const [loading,      setLoading]      = useState(false)
  const [counts,       setCounts]       = useState<{ count: number; fr: number; en: number } | null>(null)
  const [subscribers,  setSubscribers]  = useState<Subscriber[]>([])
  const [selected,     setSelected]     = useState<Set<number>>(new Set())
  const [filterLang,   setFilterLang]   = useState<'all' | 'fr' | 'en'>('all')
  const [log,          setLog]          = useState<LogEntry[]>([])
  const [error,        setError]        = useState('')
  const consoleRef = useRef<HTMLDivElement>(null)

  const loadSubscribers = () => {
    fetch('/api/admin/push')
      .then(r => r.json())
      .then(d => {
        setCounts({ count: d.count, fr: d.fr, en: d.en })
        setSubscribers(d.subscribers ?? [])
        // Select all by default
        setSelected(new Set((d.subscribers ?? []).map((s: Subscriber) => s.id)))
      })
      .catch(() => {})
  }

  useEffect(() => { loadSubscribers() }, [])

  // Scroll console to bottom on new log entry
  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }, [log])

  const filteredSubs = subscribers.filter(s => filterLang === 'all' || s.lang === filterLang)
  const allFilteredSelected = filteredSubs.length > 0 && filteredSubs.every(s => selected.has(s.id))

  const toggleSub = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const n = new Set(prev); filteredSubs.forEach(s => n.delete(s.id)); return n })
    } else {
      setSelected(prev => { const n = new Set(prev); filteredSubs.forEach(s => n.add(s.id)); return n })
    }
  }

  const selectedSubs = subscribers.filter(s => selected.has(s.id))
  const selectedFr = selectedSubs.filter(s => s.lang === 'fr')
  const selectedEn = selectedSubs.filter(s => s.lang === 'en')
  const needsFr = selectedFr.length > 0
  const needsEn = selectedEn.length > 0

  const send = async () => {
    if (selected.size === 0) { setError('Selectionne au moins un destinataire'); return }
    if (needsFr && (!titleFr.trim() || !bodyFr.trim())) { setError('Titre et message FR requis'); return }
    if (needsEn && (!titleEn.trim() || !bodyEn.trim())) { setError('Titre et message EN requis'); return }
    setError(''); setLoading(true)

    const allResults: SendResult[] = []
    let totalSent = 0, totalFailed = 0, totalCleaned = 0

    try {
      const requests: Promise<Response>[] = []
      if (needsFr) {
        requests.push(fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleFr, body: bodyFr, url, icon: '/logo.png', targetIds: selectedFr.map(s => s.id) }) }))
      }
      if (needsEn) {
        requests.push(fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleEn, body: bodyEn, url, icon: '/logo.png', targetIds: selectedEn.map(s => s.id) }) }))
      }
      const responses = await Promise.all(requests)
      const bodies = await Promise.all(responses.map(r => r.json()))
      for (const d of bodies) {
        totalSent    += d.sent    ?? 0
        totalFailed  += d.failed  ?? 0
        totalCleaned += d.cleaned ?? 0
        allResults.push(...(d.results ?? []))
      }

      const entry: LogEntry = {
        ts: new Date().toLocaleTimeString('fr-FR'),
        ...(needsFr && { titleFr, bodyFr }),
        ...(needsEn && { titleEn, bodyEn }),
        target: `${selected.size} destinataire${selected.size > 1 ? 's' : ''}`,
        results: allResults,
        sent: totalSent, failed: totalFailed, cleaned: totalCleaned,
      }
      setLog(prev => [...prev, entry])
      loadSubscribers()
    } catch { setError('Erreur reseau') }
    finally { setLoading(false) }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 max-w-6xl">

      {/* ── Left column: compose + subscriber list ── */}
      <div className="space-y-5">

        {/* Stats bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-foreground mr-2">Notifications push</h2>
          {counts ? (
            <>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-muted-foreground/70">
                Total <strong className="text-foreground">{counts.count}</strong>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                FR <strong>{counts.fr}</strong>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                EN <strong>{counts.en}</strong>
              </span>
              <button onClick={loadSubscribers} className="ml-auto text-muted-foreground/40 hover:text-foreground transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          ) : <span className="text-sm text-muted-foreground/40">Chargement...</span>}
        </div>

        {/* Subscriber list with checkboxes */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {/* List header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <button onClick={toggleAll}
              className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0 ${allFilteredSelected ? 'bg-foreground border-foreground' : 'border-white/20 hover:border-white/40'}`}>
              {allFilteredSelected && <Check className="w-2.5 h-2.5 text-background" />}
            </button>
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest flex-1">
              {selected.size > 0 ? `${selected.size} selectionne${selected.size > 1 ? 's' : ''}` : 'Destinataires'}
            </span>
            {/* Lang filter */}
            <div className="flex gap-1">
              {(['all', 'fr', 'en'] as const).map(l => (
                <button key={l} onClick={() => setFilterLang(l)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${filterLang === l ? 'bg-white/10 text-foreground' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}>
                  {l === 'all' ? 'Tous' : l}
                </button>
              ))}
            </div>
          </div>
          {/* Subscriber rows */}
          <div className="max-h-72 overflow-y-auto no-scrollbar divide-y divide-white/[0.04]">
            {filteredSubs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground/30">Aucun abonne</div>
            ) : filteredSubs.map(sub => (
              <button key={sub.id} onClick={() => toggleSub(sub.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03] ${selected.has(sub.id) ? 'bg-white/[0.02]' : ''}`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0 ${selected.has(sub.id) ? 'bg-foreground border-foreground' : 'border-white/20'}`}>
                  {selected.has(sub.id) && <Check className="w-2.5 h-2.5 text-background" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{sub.label}</p>
                  <p className="text-[10px] text-muted-foreground/40 truncate">{sub.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${sub.lang === 'fr' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    {sub.lang}
                  </span>
                  <span className="text-[10px] text-muted-foreground/30">{formatDate(sub.last_seen)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message compose */}
        <div className="space-y-4">
          {needsFr && (
            <div className="space-y-3 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Francais</p>
              <div>
                <label className="text-xs text-muted-foreground/50 block mb-1">Titre</label>
                <Input value={titleFr} onChange={e => setTitleFr(e.target.value)} placeholder="Nouvel element disponible !" maxLength={64} />
              </div>
              <div>
                <textarea value={bodyFr} onChange={e => setBodyFr(e.target.value)} placeholder="Un nouvel element vient d'etre ajoute..." maxLength={160} rows={2}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-white/20 transition-all" />
                <p className="text-[10px] text-muted-foreground/30 mt-0.5 text-right">{bodyFr.length}/160</p>
              </div>
            </div>
          )}
          {needsEn && (
            <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">English</p>
              <div>
                <label className="text-xs text-muted-foreground/50 block mb-1">Title</label>
                <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="New element available!" maxLength={64} />
              </div>
              <div>
                <textarea value={bodyEn} onChange={e => setBodyEn(e.target.value)} placeholder="A new element was just added..." maxLength={160} rows={2}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:ring-1 focus:ring-white/20 transition-all" />
                <p className="text-[10px] text-muted-foreground/30 mt-0.5 text-right">{bodyEn.length}/160</p>
              </div>
            </div>
          )}
          {!needsFr && !needsEn && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm text-muted-foreground/40">
              Selectionne des destinataires pour composer le message
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest block mb-1.5">URL de destination</label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://elementz.fun" />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <button onClick={send} disabled={loading || selected.size === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.97] transition-all w-full justify-center">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Envoi en cours...</> : <><Send className="w-4 h-4" /> Envoyer a {selected.size} destinataire{selected.size > 1 ? 's' : ''}</>}
        </button>
      </div>

      {/* ── Right column: console ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Console</p>
          {log.length > 0 && (
            <button onClick={() => setLog([])} className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors">
              Effacer
            </button>
          )}
        </div>

        <div ref={consoleRef}
          className="h-[520px] rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-y-auto no-scrollbar font-mono text-xs p-3 space-y-4">
          {log.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/20 select-none">
              <Bell className="w-8 h-8" />
              <p>En attente d&apos;envoi...</p>
            </div>
          ) : log.map((entry, i) => (
            <div key={i} className="space-y-2">
              {/* Entry header */}
              <div className="flex items-center gap-2 text-muted-foreground/40">
                <span className="text-[10px]">{entry.ts}</span>
                <span className="flex-1 border-t border-white/[0.06]" />
                <span>{entry.target}</span>
              </div>
              {/* Messages sent */}
              {entry.titleFr && (
                <p className="text-indigo-400/70"><span className="text-muted-foreground/30">FR </span>&quot;{entry.titleFr}&quot; — {entry.bodyFr}</p>
              )}
              {entry.titleEn && (
                <p className="text-amber-400/70"><span className="text-muted-foreground/30">EN </span>&quot;{entry.titleEn}&quot; — {entry.bodyEn}</p>
              )}
              {/* Summary */}
              <div className="flex gap-3">
                <span className="text-emerald-400">{entry.sent} envoye{entry.sent > 1 ? 's' : ''}</span>
                {entry.failed > 0 && <span className="text-red-400">{entry.failed} echoue{entry.failed > 1 ? 's' : ''}</span>}
                {entry.cleaned > 0 && <span className="text-orange-400">{entry.cleaned} expire{entry.cleaned > 1 ? 's' : ''}</span>}
              </div>
              {/* Per-user results */}
              <div className="space-y-0.5 pl-2 border-l border-white/[0.06]">
                {entry.results.map((r, j) => (
                  <div key={j} className="flex items-center gap-2">
                    {r.status === 'sent'    && <span className="text-emerald-500">+</span>}
                    {r.status === 'failed'  && <span className="text-red-500">!</span>}
                    {r.status === 'expired' && <span className="text-orange-400">x</span>}
                    <span className={
                      r.status === 'sent'    ? 'text-foreground/70' :
                      r.status === 'failed'  ? 'text-red-400/80' :
                      'text-orange-400/60 line-through'
                    }>{r.label}</span>
                    <span className={`text-[9px] font-bold uppercase ${r.lang === 'fr' ? 'text-blue-500/50' : 'text-amber-500/50'}`}>{r.lang}</span>
                    {r.status === 'failed'  && <span className="text-red-500/50 text-[9px]">FAIL</span>}
                    {r.status === 'expired' && <span className="text-orange-500/50 text-[9px]">EXPIRE</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

type Tab = 'overview' | 'elements' | 'quests' | 'users' | 'email' | 'stats' | 'push'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',  label: 'Vue d\'ensemble', icon: BarChart3  },
  { id: 'stats',     label: 'Statistiques',    icon: TrendingUp },
  { id: 'elements',  label: 'Éléments',        icon: Layers     },
  { id: 'quests',    label: 'Quêtes',          icon: Scroll     },
  { id: 'users',     label: 'Utilisateurs',    icon: Users      },
  { id: 'email',     label: 'E-mail',          icon: Mail       },
  { id: 'push',      label: 'Notifications',   icon: Bell       },
]

// ─── CSV download helper ──────────────────────────────────────────────────────
async function downloadCsv(type: 'elements' | 'recipes') {
  const res = await fetch(`/api/admin/export?type=${type}`)
  if (!res.ok) { alert(`Export "${type}" échoué (${res.status})`); return }
  const blob = await res.blob()
  const url = URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = `${type}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="h-[100dvh] bg-background flex overflow-hidden">

      {/* ── Desktop Sidebar (right, 300px) ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-[300px] border-l border-white/[0.06] z-30 no-scrollbar"
        style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <a href="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="Elementz" className="w-9 h-9 rounded-xl shadow-sm flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Elementz</p>
              <p className="text-[10px] font-semibold text-muted-foreground/50 tracking-wider uppercase leading-tight">Admin Panel</p>
            </div>
          </a>
        </div>

        <div className="h-px bg-white/[0.05] mx-4" />

        {/* Nav items */}
        <nav className="flex flex-col flex-1 gap-0.5 p-3 overflow-y-auto no-scrollbar">
          <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest px-3 pt-2 pb-1.5">Navigation</p>
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left tap-spring ${
                  isActive
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'bg-foreground/15' : 'bg-white/[0.04]'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {t.label}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-foreground/60 flex-shrink-0" />}
              </button>
            )
          })}
        </nav>

        <div className="h-px bg-white/[0.05] mx-4" />

        {/* Exports + back */}
        <div className="flex flex-col gap-0.5 p-3">
          <p className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-widest px-3 pt-1 pb-1.5">Exports</p>
          <button onClick={() => downloadCsv('elements')}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            Éléments CSV
          </button>
          <button onClick={() => downloadCsv('recipes')}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            Recettes CSV
          </button>
          <div className="h-px bg-white/[0.05] mx-0 my-1" />
          <a href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </div>
            Retour au jeu
          </a>
        </div>
      </aside>

      {/* ── Top bar (mobile) ─────────────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 border-b border-white/[0.06] flex items-end justify-between px-4 pb-3"
        style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', paddingTop: 'calc(env(safe-area-inset-top) + 12px)', minHeight: 'calc(env(safe-area-inset-top) + 56px)' }}
      >
        <a href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Elementz" className="w-7 h-7 rounded-xl" />
          <span className="text-sm font-semibold text-foreground">Elementz</span>
          <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-md px-1.5 py-0.5">ADMIN</span>
        </a>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">
            <div className="flex flex-col gap-[4px] items-center justify-center">
              <span className="w-4 h-[1.5px] rounded-full bg-current block" />
              <span className="w-4 h-[1.5px] rounded-full bg-current block" />
              <span className="w-4 h-[1.5px] rounded-full bg-current block" />
            </div>
          </button>
        </div>
      </header>

      {/* ── Mobile menu overlay ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative ml-auto w-72 h-full flex flex-col border-l border-white/[0.06]"
            style={{ background: 'rgba(12,12,12,0.97)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Elementz" className="w-7 h-7 rounded-xl" />
                <span className="text-sm font-semibold text-foreground">Admin Panel</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 flex flex-col gap-0.5 p-3 overflow-y-auto no-scrollbar">
              {TABS.map(t => {
                const Icon = t.icon
                const isActive = tab === t.id
                return (
                  <button key={t.id} onClick={() => { setTab(t.id); setMobileOpen(false) }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      isActive ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {t.label}
                  </button>
                )
              })}
            </nav>
            <div className="p-3 border-t border-white/[0.06] flex flex-col gap-1">
              <button onClick={() => downloadCsv('elements')}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Download className="w-4 h-4" /> Éléments CSV
              </button>
              <button onClick={() => downloadCsv('recipes')}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Download className="w-4 h-4" /> Recettes CSV
              </button>
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4" /> Retour au jeu
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:mr-[300px] min-w-0 h-full overflow-y-auto no-scrollbar pb-10 lg:pt-10 px-4 lg:px-10 xl:px-16 2xl:px-24"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)' }}
      >
        {tab === 'overview'  && <OverviewTab />}
        {tab === 'stats'     && <StatsTab />}
        {tab === 'elements'  && <ElementsTab />}
        {tab === 'quests'    && <QuestsTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'email'     && <EmailTab />}
        {tab === 'push'      && <PushTab />}
      </main>
    </div>
  )
}
