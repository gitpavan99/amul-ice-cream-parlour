import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'
import { ArrowLeft } from 'lucide-react'

export default function AddProduct() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    unit: 'PCS',
    barcode: '',
    selling_price: '',
    cost_price: '',
    min_stock_level: '5',
  })

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setCategories(data)
      })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.from('products').insert({
      name: form.name.trim(),
      category_id: form.category_id || null,
      unit: form.unit,
      barcode: form.barcode || null,
      selling_price: Number(form.selling_price) || 0,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      min_stock_level: Number(form.min_stock_level) || 5,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      navigate('/inventory')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/inventory')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Add Product</h1>
          <p className="text-gray-500">Create a new product in inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
            placeholder="e.g. Bulk Vanilla 5Ltr"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
            >
              <option value="PCS">PCS</option>
              <option value="BOX">BOX</option>
              <option value="LTR">LTR</option>
              <option value="PAC">PAC</option>
              <option value="NOS">NOS</option>
              <option value="EACH">EACH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (optional)</label>
          <input
            type="text"
            name="barcode"
            value={form.barcode}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
            placeholder="Scan or type barcode"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
            <input
              type="number"
              name="selling_price"
              value={form.selling_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
            <input
              type="number"
              name="cost_price"
              value={form.cost_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
            <input
              type="number"
              name="min_stock_level"
              value={form.min_stock_level}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#0056A4] hover:bg-[#003d7a] text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>
    </div>
  )
}