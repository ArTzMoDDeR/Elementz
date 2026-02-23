'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Check, Search, FileUp, Moon, Sun, ChevronDown, ChevronUp } from 'lucide-react'

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

export default function AdminPanel() {
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'with' | 'without'>('without')
  const [isDragging, setIsDragging] = useState(false)
  const [expandedElement, setExpandedElement] = useState<number | null>(null)
  const [recipes, setRecipes] = useState<Record<number, Recipe[]>>({})
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    fetchElements()
  }, [])

  async function fetchElements() {
    try {
      const res = await fetch('/api/elements')
      const data = await res.json()
      
      if (Array.isArray(data)) {
        setElements(data)
      } else {
        console.error('[v0] Database not configured:', data.error)
        setElements([])
      }
    } catch (error) {
      console.error('[v0] Error fetching elements:', error)
      setElements([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecipes(elementNumber: number) {
    if (recipes[elementNumber]) return // Already loaded

    try {
      const res = await fetch(`/api/elements/${elementNumber}/recipes`)
      const data = await res.json()
      setRecipes(prev => ({ ...prev, [elementNumber]: data }))
    } catch (error) {
      console.error('[v0] Error fetching recipes:', error)
    }
  }

  function toggleExpand(elementNumber: number) {
    if (expandedElement === elementNumber) {
      setExpandedElement(null)
    } else {
      setExpandedElement(elementNumber)
      fetchRecipes(elementNumber)
    }
  }

  async function handleFileUpload(elementNumber: number, file: File) {
    setUploading(prev => new Set(prev).add(elementNumber))
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/elements/${elementNumber}/image`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setElements((prev) =>
          prev.map((el) =>
            el.number === elementNumber ? { ...el, img: data.url } : el
          )
        )
      }
    } catch (error) {
      console.error('[v0] Error uploading:', error)
    } finally {
      setUploading(prev => {
        const next = new Set(prev)
        next.delete(elementNumber)
        return next
      })
    }
  }

  async function handleBulkUpload(files: FileList | File[]) {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      // Extract element number or name from filename
      const fileName = file.name.replace(/\.(jpg|jpeg|png)$/i, '')
      
      // Try to match by number first, then by name
      const element = elements.find(el => 
        el.number.toString() === fileName ||
        el.name_french.toLowerCase() === fileName.toLowerCase() ||
        el.name_english.toLowerCase() === fileName.toLowerCase()
      )
      
      if (element) {
        await handleFileUpload(element.number, file)
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files.length > 0) {
      handleBulkUpload(e.dataTransfer.files)
    }
  }

  const filteredElements = elements.filter((el) => {
    const matchesSearch = 
      el.name_french.toLowerCase().includes(search.toLowerCase()) ||
      el.name_english.toLowerCase().includes(search.toLowerCase()) ||
      el.number.toString().includes(search)
    
    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'with') return matchesSearch && el.img
    if (filterStatus === 'without') return matchesSearch && !el.img
    return matchesSearch
  })

  const stats = {
    total: elements.length,
    withImage: elements.filter((el) => el.img).length,
    withoutImage: elements.filter((el) => !el.img).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (elements.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">Database non configurée</h2>
          <p className="text-muted-foreground mb-4">
            La table elements n'existe pas ou DATABASE_URL n'est pas configurée.
          </p>
          <div className="text-left bg-muted p-4 rounded-lg text-sm">
            <p className="font-semibold mb-2">Pour configurer:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Vérifie que DATABASE_URL est dans les variables d'environnement</li>
              <li>Exécute le SQL dans /scripts/001-rebuild-schema.sql sur Neon</li>
              <li>Exécute le SQL dans /scripts/002-insert-base-elements.sql</li>
              <li>Redémarre l'application</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-background p-4 lg:p-8"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-dashed border-primary rounded-2xl p-12 flex flex-col items-center gap-4">
            <FileUp className="w-16 h-16 text-primary" />
            <p className="text-xl font-semibold text-foreground">Déposez vos images ici</p>
            <p className="text-sm text-muted-foreground">Format: [numéro ou nom].jpg</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Panel d'administration</h1>
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Gestion des éléments et recettes (format: [numéro ou nom].jpg)
              </p>
              <div className="flex items-center gap-2 text-sm">
                <FileUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Glissez-déposez plusieurs fichiers ou utilisez les boutons Upload individuels
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground mb-1">Avec image</p>
            <p className="text-2xl font-bold text-green-600">{stats.withImage}</p>
          </div>
          <div className="bg-card rounded-lg p-4 border">
            <p className="text-sm text-muted-foreground mb-1">Sans image</p>
            <p className="text-2xl font-bold text-orange-600">{stats.withoutImage}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par numéro ou nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              size="sm"
            >
              Tous
            </Button>
            <Button
              variant={filterStatus === 'with' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('with')}
              size="sm"
            >
              Avec image
            </Button>
            <Button
              variant={filterStatus === 'without' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('without')}
              size="sm"
            >
              Sans image
            </Button>
          </div>
        </div>

        {/* Elements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredElements.map((element) => (
            <div
              key={element.number}
              className="bg-card rounded-lg border overflow-hidden"
            >
              <div className="p-3 flex flex-col gap-2">
                {/* Image */}
                <div className="aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
                  {element.img ? (
                    <img
                      src={element.img}
                      alt={element.name_french}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl text-muted-foreground font-bold">
                      #{element.number}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-mono">#{element.number}</span>
                  </div>
                  <p className="text-sm font-semibold truncate" title={element.name_french}>
                    {element.name_french}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title={element.name_english}>
                    {element.name_english}
                  </p>
                </div>

                {/* Upload button */}
                <div>
                  <input
                    type="file"
                    id={`upload-${element.number}`}
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    disabled={uploading.has(element.number)}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(element.number, file)
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    variant={element.img ? 'outline' : 'default'}
                    disabled={uploading.has(element.number)}
                    onClick={() => document.getElementById(`upload-${element.number}`)?.click()}
                  >
                    {uploading.has(element.number) ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Upload...
                      </>
                    ) : element.img ? (
                      <>
                        <Check className="w-3 h-3" />
                        Changer
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>

                {/* Recipes toggle */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => toggleExpand(element.number)}
                >
                  {expandedElement === element.number ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Masquer recettes
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Voir recettes
                    </>
                  )}
                </Button>
              </div>

              {/* Recipes list */}
              {expandedElement === element.number && (
                <div className="border-t p-3 bg-muted/30">
                  {recipes[element.number] ? (
                    recipes[element.number].length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Recettes pour créer cet élément:
                        </p>
                        {recipes[element.number].map((recipe) => (
                          <div key={recipe.id} className="text-xs bg-card rounded px-2 py-1.5 flex items-center gap-1">
                            <span className="font-mono text-muted-foreground">#{recipe.ingredient1_number}</span>
                            <span className="font-medium">{recipe.ingredient1_name}</span>
                            <span className="text-muted-foreground">+</span>
                            <span className="font-mono text-muted-foreground">#{recipe.ingredient2_number}</span>
                            <span className="font-medium">{recipe.ingredient2_name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">
                        Aucune recette
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      Chargement...
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredElements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun élément trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}
