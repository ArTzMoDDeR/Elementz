'use client'

import { useEffect, useState, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Upload, Check, Search, FileUp, Moon, Sun,
  ChevronDown, ChevronUp, Pencil, Plus, X, Trash2, Save,
} from 'lucide-react'

type Element = {
  number: number
  name_english: string
  name_french: string
  img: string | null
}

type Recipe = {
  id: number
  ingredient1_number: number
  ingredient1_name: string
  ingredient2_number: number
  ingredient2_name: string
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────
function EditModal({
  element,
  elements,
  onClose,
  onSaved,
}: {
  element: Element
  elements: Element[]
  onClose: () => void
  onSaved: (updated: Element) => void
}) {
  const [nameFr, setNameFr] = useState(element.name_french)
  const [nameEn, setNameEn] = useState(element.name_english)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [img, setImg] = useState(element.img)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [newIng1, setNewIng1] = useState('')
  const [newIng2, setNewIng2] = useState('')
  const [addingRecipe, setAddingRecipe] = useState(false)
  const [deletingRecipe, setDeletingRecipe] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/elements/${element.number}/recipes`)
      .then(r => r.json())
      .then(data => { setRecipes(Array.isArray(data) ? data : []); setLoadingRecipes(false) })
      .catch(() => setLoadingRecipes(false))
  }, [element.number])

  async function save() {
    setSaving(true)
    await fetch(`/api/elements/${element.number}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_french: nameFr, name_english: nameEn }),
    })
    setSaving(false)
    onSaved({ ...element, name_french: nameFr, name_english: nameEn, img })
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/elements/${element.number}/image`, { method: 'POST', body: formData })
    if (res.ok) {
      const data = await res.json()
      setImg(data.url)
      onSaved({ ...element, name_french: nameFr, name_english: nameEn, img: data.url })
    }
    setUploading(false)
  }

  async function addRecipe() {
    const ing1 = elements.find(e =>
      e.number.toString() === newIng1 ||
      e.name_french.toLowerCase() === newIng1.toLowerCase()
    )
    const ing2 = elements.find(e =>
      e.number.toString() === newIng2 ||
      e.name_french.toLowerCase() === newIng2.toLowerCase()
    )
    if (!ing1 || !ing2) return
    setAddingRecipe(true)
    const res = await fetch(`/api/elements/${element.number}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredient1_number: ing1.number, ingredient2_number: ing2.number }),
    })
    if (res.ok) {
      // Refresh recipes
      const data = await fetch(`/api/elements/${element.number}/recipes`).then(r => r.json())
      setRecipes(Array.isArray(data) ? data : [])
      setNewIng1('')
      setNewIng2('')
    }
    setAddingRecipe(false)
  }

  async function deleteRecipe(id: number) {
    setDeletingRecipe(id)
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== id))
    setDeletingRecipe(null)
  }

  // Autocomplete suggestions
  const suggestions1 = newIng1.length >= 2
    ? elements.filter(e =>
        e.name_french.toLowerCase().includes(newIng1.toLowerCase()) ||
        e.number.toString().startsWith(newIng1)
      ).slice(0, 5)
    : []
  const suggestions2 = newIng2.length >= 2
    ? elements.filter(e =>
        e.name_french.toLowerCase().includes(newIng2.toLowerCase()) ||
        e.number.toString().startsWith(newIng2)
      ).slice(0, 5)
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <span className="text-xs text-muted-foreground font-mono">#{element.number}</span>
            <h2 className="text-lg font-bold">{element.name_french}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-5 space-y-6">
          {/* Image */}
          <div>
            <p className="text-sm font-semibold mb-2">Image</p>
            <div className="flex gap-3 items-center">
              <div className="w-20 h-20 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {img
                  ? <img src={img} alt="" className="w-full h-full object-contain" />
                  : <span className="text-2xl text-muted-foreground font-bold">#{element.number}</span>
                }
              </div>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                {img ? 'Changer' : 'Uploader'}
              </Button>
            </div>
          </div>

          {/* Names */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Noms</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Français</label>
              <Input value={nameFr} onChange={e => setNameFr(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Anglais</label>
              <Input value={nameEn} onChange={e => setNameEn(e.target.value)} />
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
              Sauvegarder
            </Button>
          </div>

          {/* Recipes */}
          <div>
            <p className="text-sm font-semibold mb-3">Combinaisons pour créer cet élément</p>

            {loadingRecipes ? (
              <p className="text-xs text-muted-foreground">Chargement...</p>
            ) : recipes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucune combinaison enregistrée</p>
            ) : (
              <div className="space-y-1.5 mb-4">
                {recipes.map(r => (
                  <div key={r.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium">{r.ingredient1_name}</span>
                    <span className="text-muted-foreground">+</span>
                    <span className="font-medium">{r.ingredient2_name}</span>
                    <Button
                      variant="ghost" size="icon"
                      className="ml-auto h-6 w-6 text-muted-foreground hover:text-destructive"
                      disabled={deletingRecipe === r.id}
                      onClick={() => deleteRecipe(r.id)}
                    >
                      {deletingRecipe === r.id
                        ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add recipe */}
            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Ajouter une combinaison</p>
              <div className="relative">
                <Input
                  placeholder="Ingrédient 1 (nom ou #)"
                  value={newIng1}
                  onChange={e => setNewIng1(e.target.value)}
                  className="text-sm h-8"
                />
                {suggestions1.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 bg-popover border border-border rounded-lg shadow-lg mt-0.5 overflow-hidden">
                    {suggestions1.map(e => (
                      <button key={e.number}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex gap-2"
                        onClick={() => setNewIng1(e.name_french)}>
                        <span className="text-muted-foreground font-mono text-xs">#{e.number}</span>
                        <span>{e.name_french}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  placeholder="Ingrédient 2 (nom ou #)"
                  value={newIng2}
                  onChange={e => setNewIng2(e.target.value)}
                  className="text-sm h-8"
                />
                {suggestions2.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 bg-popover border border-border rounded-lg shadow-lg mt-0.5 overflow-hidden">
                    {suggestions2.map(e => (
                      <button key={e.number}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex gap-2"
                        onClick={() => setNewIng2(e.name_french)}>
                        <span className="text-muted-foreground font-mono text-xs">#{e.number}</span>
                        <span>{e.name_french}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                size="sm" variant="outline" className="w-full"
                disabled={addingRecipe || !newIng1 || !newIng2}
                onClick={addRecipe}
              >
                {addingRecipe ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : <Plus className="w-3 h-3 mr-2" />}
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Element Modal ────────────────────────────────────────────────────────
function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: (el: Element) => void }) {
  const [nameFr, setNameFr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    if (!nameFr.trim()) { setError('Le nom français est requis'); return }
    setSaving(true)
    const res = await fetch('/api/elements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_french: nameFr.trim(), name_english: nameEn.trim() }),
    })
    if (res.ok) {
      const el = await res.json()
      onAdded(el)
    } else {
      const err = await res.json().catch(() => ({}))
      console.error('[v0] create element error:', err)
      setError(`Erreur: ${err.detail || err.error || res.status}`)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Nouvel élément</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nom français *</label>
          <Input placeholder="ex: nuage" value={nameFr} onChange={e => setNameFr(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nom anglais</label>
          <Input placeholder="ex: cloud" value={nameEn} onChange={e => setNameEn(e.target.value)} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button className="w-full" disabled={saving} onClick={create}>
          {saving ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : <Plus className="w-3 h-3 mr-2" />}
          Créer l'élément
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'with' | 'without'>('all')
  const [isDragging, setIsDragging] = useState(false)
  const [editingElement, setEditingElement] = useState<Element | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => { fetchElements() }, [])

  async function fetchElements() {
    try {
      const res = await fetch('/api/elements')
      const data = await res.json()
      setElements(Array.isArray(data) ? data : [])
    } catch { setElements([]) }
    finally { setLoading(false) }
  }

  async function handleFileUpload(elementNumber: number, file: File) {
    setUploading(prev => new Set(prev).add(elementNumber))
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/elements/${elementNumber}/image`, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setElements(prev => prev.map(el => el.number === elementNumber ? { ...el, img: data.url } : el))
      }
    } finally {
      setUploading(prev => { const n = new Set(prev); n.delete(elementNumber); return n })
    }
  }

  function normalizeForMatch(str: string) {
    return str.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  }

  async function handleBulkUpload(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const fileName = file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '')
      const fileNorm = normalizeForMatch(fileName)
      const element = elements.find(el =>
        el.number.toString() === fileName ||
        normalizeForMatch(el.name_french) === fileNorm ||
        normalizeForMatch(el.name_english) === fileNorm
      )
      if (element) await handleFileUpload(element.number, file)
    }
  }

  const filteredElements = elements.filter(el => {
    const q = search.toLowerCase()
    const matches = el.name_french.toLowerCase().includes(q) ||
      el.name_english.toLowerCase().includes(q) ||
      el.number.toString().includes(q)
    if (!matches) return false
    if (filterStatus === 'with') return !!el.img
    if (filterStatus === 'without') return !el.img
    return true
  })

  const stats = {
    total: elements.length,
    withImage: elements.filter(el => el.img).length,
    withoutImage: elements.filter(el => !el.img).length,
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
    </div>
  )

  return (
    <div
      className="min-h-screen bg-background p-4 lg:p-8"
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
      onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) handleBulkUpload(e.dataTransfer.files) }}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-dashed border-primary rounded-2xl p-12 flex flex-col items-center gap-4">
            <FileUp className="w-16 h-16 text-primary" />
            <p className="text-xl font-semibold">Déposez vos images ici</p>
            <p className="text-sm text-muted-foreground">Format: [numéro ou nom].jpg</p>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingElement && (
        <EditModal
          element={editingElement}
          elements={elements}
          onClose={() => setEditingElement(null)}
          onSaved={updated => {
            setElements(prev => prev.map(el => el.number === updated.number ? updated : el))
            setEditingElement(updated)
          }}
        />
      )}

      {/* Add modal */}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdded={el => {
            setElements(prev => [...prev, el])
            setShowAdd(false)
            setEditingElement(el)
          }}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Panel d'administration</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Glissez-déposez des images (nom ou numéro.jpg) pour upload en masse
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Avec image', value: stats.withImage, color: 'text-emerald-500' },
            { label: 'Sans image', value: stats.withoutImage, color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color ?? ''}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par numéro ou nom..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'with', 'without'] as const).map(f => (
              <Button key={f} size="sm" variant={filterStatus === f ? 'default' : 'outline'} onClick={() => setFilterStatus(f)}>
                {f === 'all' ? 'Tous' : f === 'with' ? 'Avec image' : 'Sans image'}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredElements.map(element => (
            <div key={element.number} className="bg-card rounded-xl border border-border overflow-hidden group flex flex-col">
              {/* Image */}
              <div className="aspect-square bg-muted relative flex items-center justify-center overflow-hidden">
                {element.img
                  ? <img src={element.img} alt={element.name_french} className="w-full h-full object-contain p-1" />
                  : <span className="text-2xl font-bold text-muted-foreground/40">#{element.number}</span>
                }
                {/* Edit overlay */}
                <button
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                  onClick={() => setEditingElement(element)}
                >
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-2">
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                </button>
              </div>

              {/* Info + actions */}
              <div className="p-2 flex flex-col gap-1.5 flex-1">
                <div>
                  <p className="text-[10px] text-muted-foreground font-mono">#{element.number}</p>
                  <p className="text-xs font-semibold leading-tight truncate" title={element.name_french}>{element.name_french}</p>
                  {element.name_english && (
                    <p className="text-[10px] text-muted-foreground truncate">{element.name_english}</p>
                  )}
                </div>
                <div className="flex gap-1 mt-auto">
                  {/* Upload */}
                  <label className="flex-1 cursor-pointer">
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(element.number, f) }} />
                    <div className={`h-7 flex items-center justify-center gap-1 rounded-md text-[10px] font-medium border transition-colors ${element.img ? 'border-border text-muted-foreground hover:bg-muted' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                      {uploading.has(element.number)
                        ? <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : element.img ? <><Check className="w-2.5 h-2.5" />OK</> : <><Upload className="w-2.5 h-2.5" />Upload</>
                      }
                    </div>
                  </label>
                  {/* Edit */}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 flex-shrink-0" onClick={() => setEditingElement(element)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredElements.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Aucun élément trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}
