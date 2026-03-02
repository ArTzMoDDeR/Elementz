'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import {
  Search, Upload, Check, FileUp, Moon, Sun, Plus, X, Trash2, Save, Hash,
  ArrowDownAZ, Pencil, ChevronLeft, ChevronRight, RefreshCw, Shield, ShieldOff,
  Users, Layers, Scroll, BarChart3, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    zinc: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
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
        <StatCard label="Joueurs" value={stats.users} sub={`+${stats.newUsersToday} aujourd'hui`} color="text-blue-400" />
        <StatCard label="Découvertes" value={stats.unlocks.toLocaleString('fr')} sub={`${stats.activeToday} joueurs actifs aujourd'hui`} color="text-emerald-400" />
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

// ─── Tab: Users ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

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
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Admin</th>
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
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
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
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleAdmin(u)}
                      disabled={!!toggling}
                      title={u.is_admin ? 'Révoquer admin' : 'Donner admin'}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${u.is_admin ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400' : 'border-border text-muted-foreground hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400'}`}
                    >
                      {toggling === u.id ? <Spinner /> : u.is_admin ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                    </button>
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
                    <td className="px-4 py-3 text-center tabular-nums text-emerald-400 font-semibold">{q.claimed_count}</td>
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
    <div className="bg-card rounded-xl border border-border overflow-hidden group flex flex-col hover:border-border/80 transition-colors">
      <div className="aspect-square bg-muted relative flex items-center justify-center overflow-hidden">
        {element.img
          ? <img src={element.img} alt={element.name_french} className="w-full h-full object-contain p-2" />
          : <span className="text-xl font-bold text-muted-foreground/20 font-mono">#{element.number}</span>
        }
        <button
          className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
          onClick={() => onEdit(element)}
        >
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2">
            <Pencil className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
        {(element.recipe_count ?? 0) === 0 && (
          <div className="absolute top-1.5 right-1.5">
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/80 text-white leading-none">0 combo</span>
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground/50">#{element.number}</p>
          <p className="text-xs font-semibold leading-tight truncate">{element.name_french}</p>
          {element.name_english && <p className="text-[10px] text-muted-foreground truncate">{element.name_english}</p>}
        </div>
        <label className="mt-auto cursor-pointer">
          <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(element.number, f) }} />
          <div className={`h-6 flex items-center justify-center gap-1 rounded text-[10px] font-medium border transition-colors ${element.img ? 'border-border text-muted-foreground hover:bg-muted' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            {uploading.has(element.number) ? <Spinner /> : element.img ? <><Check className="w-2.5 h-2.5" />OK</> : <><Upload className="w-2.5 h-2.5" />Upload</>}
          </div>
        </label>
      </div>
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
    if (!nameFr.trim()) { setError('Le nom français est requis'); return }
    setSaving(true)
    const res = await fetch('/api/elements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name_french: nameFr.trim(), name_english: nameEn.trim() }) })
    if (res.ok) { const el = await res.json(); onAdded(el) }
    else { const err = await res.json().catch(() => ({})); setError(`Erreur: ${err.detail || err.error || res.status}`) }
    setSaving(false)
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

  useEffect(() => { fetchElements() }, [])

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

  const filteredElements = elements.filter(el => {
    const q = search.toLowerCase()
    const matches = el.name_french.toLowerCase().includes(q) || el.name_english.toLowerCase().includes(q) || el.number.toString().includes(q)
    if (!matches) return false
    if (filterStatus === 'with') return !!el.img
    if (filterStatus === 'without') return !el.img
    if (filterStatus === 'no-recipe') return (el.recipe_count ?? 0) === 0
    return true
  }).sort((a, b) => sortBy === 'alpha' ? a.name_french.localeCompare(b.name_french, 'fr') : a.number - b.number)

  const stats = {
    total: elements.length,
    withImage: elements.filter(el => el.img).length,
    withoutImage: elements.filter(el => !el.img).length,
    noRecipe: elements.filter(el => (el.recipe_count ?? 0) === 0).length,
  }

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
            { key: 'all', label: `Tous`, value: stats.total },
            { key: 'with', label: 'Avec image', value: stats.withImage, color: 'text-emerald-400' },
            { key: 'without', label: 'Sans image', value: stats.withoutImage, color: 'text-amber-400' },
            { key: 'no-recipe', label: 'Sans combo', value: stats.noRecipe, color: 'text-red-400' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key as typeof filterStatus)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm border transition-colors ${filterStatus === f.key ? 'bg-foreground text-background border-foreground' : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'}`}>
              <span className={`tabular-nums font-bold ${filterStatus !== f.key && (f as {color?: string}).color}`}>{f.value}</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
            {filteredElements.map(el => (
              <ElementCard key={el.number} element={el} uploading={uploading} onEdit={setEditingElement} onUpload={handleFileUpload} />
            ))}
          </div>
        )
      }
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

type Tab = 'overview' | 'elements' | 'quests' | 'users'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'elements', label: 'Éléments', icon: Layers },
  { id: 'quests', label: 'Quêtes', icon: Scroll },
  { id: 'users', label: 'Utilisateurs', icon: Users },
]

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview')
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Top bar */}
      <header
        className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </a>
              <div className="w-px h-4 bg-border" />
              <span className="text-sm font-semibold">Admin</span>
            </div>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>

          {/* Tab nav — equal-width on mobile, auto on desktop */}
          <nav className="grid grid-cols-4 sm:flex sm:items-center sm:gap-1 -mb-px">
            {TABS.map(t => {
              const Icon = t.icon
              const isActive = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="leading-none">{t.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main
        className="max-w-7xl mx-auto px-4 lg:px-8 py-6"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        {tab === 'overview' && <OverviewTab />}
        {tab === 'elements' && <ElementsTab />}
        {tab === 'quests' && <QuestsTab />}
        {tab === 'users' && <UsersTab />}
      </main>
    </div>
  )
}
