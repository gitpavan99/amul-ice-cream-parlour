import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Upload, Check, Plus, Trash2, Edit2 } from 'lucide-react'

type Category = {
  id: string
  name: string
  description: string | null
  sort_order: number
}

export default function Settings() {
  const { user } = useAuth()
  const [parlour, setParlour] = useState({
    name: 'Amul Ice Cream Parlour',
    address: '',
    phone: '',
    gstin: '',
    footer: 'Thank you for your purchase! Visit again.',
    logo_url: '',
  })
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({ name: '', description: '' })

  useEffect(() => {
    const savedSettings = localStorage.getItem('parlour_settings')
    if (savedSettings) {
      try {
        setParlour(JSON.parse(savedSettings))
      } catch {}
    }
    fetchCategories()
  }, [])

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')
    if (data) setCategories(data)
  }

  const handleSave = () => {
    localStorage.setItem('parlour_settings', JSON.stringify(parlour))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('parlour-assets')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage
      .from('parlour-assets')
      .getPublicUrl(fileName)

    setParlour(prev => ({ ...prev, logo_url: data.publicUrl }))
    setUploading(false)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catForm.name.trim()) return

    if (editingCatId) {
      await supabase
        .from('categories')
        .update({ name: catForm.name.trim(), description: catForm.description || null })
        .eq('id', editingCatId)
    } else {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0
      await supabase.from('categories').insert({
        name: catForm.name.trim(),
        description: catForm.description || null,
        sort_order: maxOrder + 1,
      })
    }

    setShowCatForm(false)
    setEditingCatId(null)
    setCatForm({ name: '', description: '' })
    fetchCategories()
  }

  const handleEditCategory = (cat: Category) => {
    setCatForm({ name: cat.name, description: cat.description || '' })
    setEditingCatId(cat.id)
    setShowCatForm(true)
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Products using it will become uncategorized.')) return
    await supabase.from('categories').delete().eq('id', id)
    fetchCategories()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500">Parlour details & preferences</p>
      </div>

      {/* Parlour Info */}
      <div className="bg-white rounded-xl border p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Parlour Information</h3>
        <p className="text-sm text-gray-500">These details appear on printed bills</p>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Parlour Logo</label>
          <div className="flex items-center gap-4">
            {parlour.logo_url ? (
              <img src={parlour.logo_url} alt="Logo" className="w-20 h-20 object-contain border rounded-lg" />
            ) : (
              <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 text-xs">
                No Logo
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload Logo'}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Parlour Name</label>
          <input
            value={parlour.name}
            onChange={e => setParlour({ ...parlour, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Address</label>
          <textarea
            value={parlour.address}
            onChange={e => setParlour({ ...parlour, address: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone</label>
            <input
              value={parlour.phone}
              onChange={e => setParlour({ ...parlour, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">GSTIN</label>
            <input
              value={parlour.gstin}
              onChange={e => setParlour({ ...parlour, gstin: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Bill Footer Text</label>
          <input
            value={parlour.footer}
            onChange={e => setParlour({ ...parlour, footer: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0056A4] text-white rounded-lg hover:bg-[#003d7a]"
        >
          {saved ? <><Check size={16} /> Saved!</> : 'Save Settings'}
        </button>
      </div>

      {/* Categories Management */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Categories</h3>
          <button
            onClick={() => {
              setShowCatForm(true)
              setEditingCatId(null)
              setCatForm({ name: '', description: '' })
            }}
            className="flex items-center gap-1 text-sm bg-[#0056A4] text-white px-3 py-1.5 rounded-lg"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {showCatForm && (
          <form onSubmit={handleSaveCategory} className="bg-gray-50 p-4 rounded-lg space-y-3">
            <input
              value={catForm.name}
              onChange={e => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="Category name"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
            <input
              value={catForm.description}
              onChange={e => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 bg-[#0056A4] text-white rounded-lg text-sm">
                {editingCatId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowCatForm(false)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="divide-y">
          {categories.map(cat => (
            <div key={cat.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{cat.name}</p>
                {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditCategory(cat)} className="p-1 text-gray-500 hover:text-blue-600">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 text-gray-500 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-800 mb-2">Account</h3>
        <p className="text-sm text-gray-600">Logged in as: <strong>{user?.email}</strong></p>
      </div>
    </div>
  )
}