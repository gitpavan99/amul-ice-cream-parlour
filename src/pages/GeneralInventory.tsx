import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Edit2, Package } from 'lucide-react'

type Asset = {
  id: string
  name: string
  quantity: number
  unit: string
  location: string | null
  condition: string
  notes: string | null
}

export default function GeneralInventory() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    quantity: '1',
    unit: 'PCS',
    location: '',
    condition: 'Good',
    notes: '',
  })

  useEffect(() => {
    fetchAssets()
  }, [])

  async function fetchAssets() {
    setLoading(true)
    const { data } = await supabase
      .from('general_inventory')
      .select('*')
      .order('name')
    if (data) setAssets(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      quantity: Number(form.quantity) || 1,
      unit: form.unit,
      location: form.location || null,
      condition: form.condition,
      notes: form.notes || null,
    }

    if (editingId) {
      await supabase.from('general_inventory').update(payload).eq('id', editingId)
    } else {
      await supabase.from('general_inventory').insert(payload)
    }

    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', quantity: '1', unit: 'PCS', location: '', condition: 'Good', notes: '' })
    fetchAssets()
  }

  const handleEdit = (asset: Asset) => {
    setForm({
      name: asset.name,
      quantity: String(asset.quantity),
      unit: asset.unit,
      location: asset.location || '',
      condition: asset.condition,
      notes: asset.notes || '',
    })
    setEditingId(asset.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return
    await supabase.from('general_inventory').delete().eq('id', id)
    fetchAssets()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">General Assets</h1>
          <p className="text-gray-500">Fridges, tables, chairs, utensils, etc.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setForm({ name: '', quantity: '1', unit: 'PCS', location: '', condition: 'Good', notes: '' })
          }}
          className="flex items-center gap-2 bg-[#0056A4] text-white px-4 py-2.5 rounded-lg"
        >
          <Plus size={18} /> Add Asset
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">{editingId ? 'Edit Asset' : 'Add New Asset'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g. Deep Freezer"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Location</label>
              <input
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g. Main Counter"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Condition</label>
              <select
                value={form.condition}
                onChange={e => setForm({ ...form, condition: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option>Good</option>
                <option>Needs Repair</option>
                <option>Out of Order</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-[#0056A4] text-white rounded-lg">
              {editingId ? 'Update' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p>No assets added yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Condition</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-right">{a.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{a.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      a.condition === 'Good' ? 'bg-green-100 text-green-700' :
                      a.condition === 'Needs Repair' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {a.condition}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEdit(a)} className="p-1 text-gray-500 hover:text-blue-600 mr-2">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1 text-gray-500 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}