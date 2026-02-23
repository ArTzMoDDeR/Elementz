'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Check, Search, FileUp, Moon, Sun } from 'lucide-react'

type Element = {
  id: number
  name: string
  category: string
  image_url: string | null
  created_at: string
  updated_at: string
}

export default function AdminPanel() {
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'with' | 'without'>('without')
  const [isDragging, setIsDragging] = useState(false)
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

  async function handleFileUpload(elementName: string, file: File) {
    setUploading(prev => new Set(prev).add(elementName))
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/elements/${encodeURIComponent(elementName)}/image`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setElements((prev) =>
          prev.map((el) =>
            el.name === elementName ? { ...el, image_url: data.url } : el
          )
        )
      }
    } catch (error) {
      console.error('[v0] Error uploading:', error)
    } finally {
      setUploading(prev => {
        const next = new Set(prev)
        next.delete(elementName)
        return next
      })
    }
  }

  async function handleBulkUpload(files: FileList | File[]) {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      // Extract element name from filename (remove .jpg/.jpeg extension)
      const fileName = file.name.replace(/\.(jpg|jpeg)$/i, '')
      
      // Find matching element (case insensitive)
      const element = elements.find(el => 
        el.name.toLowerCase() === fileName.toLowerCase()
      )
      
      if (element) {
        await handleFileUpload(element.name, file)
      } else {
        console.warn(`[v0] No element found for file: ${file.name}`)
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
    const matchesSearch = el.name.toLowerCase().includes(search.toLowerCase())
    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'with') return matchesSearch && el.image_url
    if (filterStatus === 'without') return matchesSearch && !el.image_url
    return matchesSearch
  })

  const stats = {
    total: elements.length,
    withImage: elements.filter((el) => el.image_url).length,
    withoutImage: elements.filter((el) => !el.image_url).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
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
            <p className="text-xl font-semibold text-foreground">Deposez vos images ici</p>
            <p className="text-sm text-muted-foreground">Format: [nom_element].jpg</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Panel d'administration</h1>
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Upload rapide des images d'éléments (format: [nom_element].jpg)
              </p>
              <div className="flex items-center gap-2 text-sm">
                <FileUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Glissez-deposez plusieurs fichiers ou utilisez les boutons Upload individuels
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
              placeholder="Rechercher un élément..."
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredElements.map((element) => (
            <div
              key={element.id}
              className="bg-card rounded-lg border p-3 flex flex-col gap-2"
            >
              <div className="aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
                {element.image_url ? (
                  <img
                    src={element.image_url}
                    alt={element.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl text-muted-foreground">
                    {element.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <p className="text-sm font-medium truncate" title={element.name}>
                  {element.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {element.category}
                </p>
              </div>
              <div>
                <label className="block">
                  <input
                    type="file"
                    accept=".jpg,.jpeg"
                    className="hidden"
                    disabled={uploading.has(element.name)}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(element.name, file)
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="w-full cursor-pointer"
                    variant={element.image_url ? 'outline' : 'default'}
                    disabled={uploading.has(element.name)}
                  >
                    {uploading.has(element.name) ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Upload...
                      </>
                    ) : element.image_url ? (
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
                </label>
              </div>
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
