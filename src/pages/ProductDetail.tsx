import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Product, StockBatch, Category } from '../types'
import { 
  ArrowLeft, Plus, Trash2, Edit2, Save, X, 
  Package, Upload
} from 'lucide-react'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    unit: 'PCS',
    barcode: '',
    selling_price: '',
    cost_price: '',
    min_stock_level: '5',
    image_url: '',
  })

  const [showBatchForm, setShowBatchForm] = useState(false)
  const [batchForm, setBatchForm] = useState({
    source: 'Fresh',
    quantity: '',
    mfg_date: '',
    expiry_date: '',
    purchase_date: '',
    notes: '',
  })

  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [adjustForm, setAdjustForm] = useState({
    type: 'adjustment',
    quantity: '',
    notes: '',
  })

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)

    const { data: prod } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .single()

    const { data: bats } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })

    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')

    if (prod) {
      setProduct(prod)
      setForm({
        name: prod.name,
        category_id: prod.category_id || '',
        unit: prod.unit,
        barcode: prod.barcode || '',
        selling_price: String(prod.selling_price || ''),
        cost_price: prod.cost_price ? String(prod.cost_price) : '',
        min_stock_level: String(prod.min_stock_level || 5),
        image_url: (prod as any).image_url || '',
      })
    }
    if (bats) setBatches(bats)
    if (cats) setCategories(cats)

    setLoading(false)
  }

  const totalQty = batches.reduce((sum, b) => sum + Number(b.quantity), 0)
  const oldQty = batches.filter(b => b.source === 'Old').reduce((sum, b) => sum + Number(b.quantity), 0)
  const freshQty = batches.filter(b => b.source === 'Fresh' || b.source === 'Purchase').reduce((sum, b) => sum + Number(b.quantity), 0)

  const handleUpdateProduct = async () => {
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('products')
      .update({
        name: form.name.trim(),
        category_id: form.category_id || null,
        unit: form.unit,
        barcode: form.barcode || null,
        selling_price: Number(form.selling_price) || 0,
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        min_stock_level: Number(form.min_stock_level) || 5,
        image_url: form.image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    setSaving(false)

    if (error) {
      setError(error.message)
    } else {
      setEditing(false)
      fetchData()
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `product-${id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('parlour-assets')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setError('Image upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage
      .from('parlour-assets')
      .getPublicUrl(fileName)

    // Update form and also save immediately
    const newUrl = data.publicUrl
    setForm(prev => ({ ...prev, image_url: newUrl }))

    await supabase
      .from('products')
      .update({ image_url: newUrl })
      .eq('id', id)

    setUploading(false)
    fetchData()
  }

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('stock_batches').insert({
      product_id: id,
      source: batchForm.source,
      quantity: Number(batchForm.quantity) || 0,
      mfg_date: batchForm.mfg_date || null,
      expiry_date: batchForm.expiry_date || null,
      purchase_date: batchForm.purchase_date || null,
      notes: batchForm.notes || null,
    })

    setSaving(false)

    if (error) {
      setError(error.message)
    } else {
      setShowBatchForm(false)
      setBatchForm({
        source: 'Fresh',
        quantity: '',
        mfg_date: '',
        expiry_date: '',
        purchase_date: '',
        notes: '',
      })
      fetchData()
    }
  }

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const qty = Number(adjustForm.quantity)
    if (!qty || qty === 0) {
      setError('Please enter a valid quantity')
      setSaving(false)
      return
    }

    const adjustmentQty = adjustForm.type === 'wastage' ? -Math.abs(qty) : qty

    const { error: batchError } = await supabase.from('stock_batches').insert({
      product_id: id,
      source: 'Purchase',
      quantity: adjustmentQty,
      notes: `${adjustForm.type.toUpperCase()}: ${adjustForm.notes || 'Stock adjustment'}`,
    })

    if (batchError) {
      setError(batchError.message)
      setSaving(false)
      return
    }

    await supabase.from('stock_movements').insert({
      product_id: id,
      type: adjustForm.type === 'wastage' ? 'wastage' : 'adjustment',
      quantity: adjustmentQty,
      reference: adjustForm.notes || 'Manual adjustment',
    })

    setShowAdjustForm(false)
    setAdjustForm({ type: 'adjustment', quantity: '', notes: '' })
    setSaving(false)
    fetchData()
  }

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Delete this batch?')) return
    await supabase.from('stock_batches').delete().eq('id', batchId)
    fetchData()
  }

  const handleDeleteProduct = async () => {
    if (!confirm('Delete this product and all its batches? This cannot be undone.')) return
    await supabase.from('products').delete().eq('id', id)
    navigate('/inventory')
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading product...</div>
  }

  if (!product) {
    return <div className="p-12 text-center text-gray-500">Product not found</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inventory')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
            <p className="text-gray-500 text-sm">Product Details & Stock Batches</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit2 size={16} /> Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleUpdateProduct}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#0056A4] text-white rounded-lg hover:bg-[#003d7a]"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
          <button
            onClick={handleDeleteProduct}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* Product Image + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Image */}
        <div className="bg-white rounded-xl border p-4 flex flex-col items-center justify-center">
          {(product as any).image_url || form.image_url ? (
            <img 
              src={(product as any).image_url || form.image_url} 
              alt={product.name}
              className="w-full h-40 object-contain rounded-lg"
            />
          ) : (
            <div className="w-full h-40 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
              <Package size={40} />
            </div>
          )}
          <label className="mt-3 cursor-pointer inline-flex items-center gap-2 text-sm text-[#0056A4] hover:underline">
            <Upload size={14} />
            {uploading ? 'Uploading...' : 'Upload Image'}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {/* Summary Cards */}
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total Quantity</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{totalQty}</p>
          <p className="text-xs text-gray-400 mt-1">{product.unit}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Old Stock</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{oldQty}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Fresh Stock</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{freshQty}</p>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Product Information</h3>

        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Category</label>
              <select
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm({...form, unit: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="PCS">PCS</option>
                <option value="BOX">BOX</option>
                <option value="LTR">LTR</option>
                <option value="PAC">PAC</option>
                <option value="NOS">NOS</option>
                <option value="EACH">EACH</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Barcode</label>
              <input
                value={form.barcode}
                onChange={e => setForm({...form, barcode: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Selling Price</label>
              <input
                type="number"
                value={form.selling_price}
                onChange={e => setForm({...form, selling_price: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Cost Price</label>
              <input
                type="number"
                value={form.cost_price}
                onChange={e => setForm({...form, cost_price: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Min Stock Level</label>
              <input
                type="number"
                value={form.min_stock_level}
                onChange={e => setForm({...form, min_stock_level: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Category</p>
              <p className="font-medium">{(product as any).categories?.name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Unit</p>
              <p className="font-medium">{product.unit}</p>
            </div>
            <div>
              <p className="text-gray-500">Selling Price</p>
              <p className="font-medium">₹{product.selling_price}</p>
            </div>
            <div>
              <p className="text-gray-500">Min Stock</p>
              <p className="font-medium">{product.min_stock_level}</p>
            </div>
            <div>
              <p className="text-gray-500">Barcode</p>
              <p className="font-medium">{product.barcode || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Cost Price</p>
              <p className="font-medium">{product.cost_price ? `₹${product.cost_price}` : '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Batches Section */}
      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-gray-800">Stock Batches</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAdjustForm(!showAdjustForm)
                setShowBatchForm(false)
              }}
              className="flex items-center gap-2 text-sm border border-orange-300 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-50"
            >
              Stock Adjustment
            </button>
            <button
              onClick={() => {
                setShowBatchForm(!showBatchForm)
                setShowAdjustForm(false)
              }}
              className="flex items-center gap-2 text-sm bg-[#0056A4] text-white px-3 py-1.5 rounded-lg hover:bg-[#003d7a]"
            >
              <Plus size={16} /> Add Batch
            </button>
          </div>
        </div>

        {showAdjustForm && (
          <form onSubmit={handleStockAdjustment} className="p-5 bg-orange-50 border-b space-y-4">
            <h4 className="font-medium text-orange-800">Stock Adjustment / Wastage</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  value={adjustForm.type}
                  onChange={e => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="adjustment">Physical Count / Correction</option>
                  <option value="wastage">Wastage / Damaged</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Quantity {adjustForm.type === 'wastage' ? '(will reduce stock)' : '(positive = add, negative = reduce)'}
                </label>
                <input
                  type="number"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <input
                  value={adjustForm.notes}
                  onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Reason for adjustment"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
                {saving ? 'Saving...' : 'Apply Adjustment'}
              </button>
              <button type="button" onClick={() => setShowAdjustForm(false)} className="px-4 py-2 border rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {showBatchForm && (
          <form onSubmit={handleAddBatch} className="p-5 bg-gray-50 border-b space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Source *</label>
                <select
                  value={batchForm.source}
                  onChange={e => setBatchForm({...batchForm, source: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="Fresh">Fresh</option>
                  <option value="Old">Old</option>
                  <option value="Purchase">Purchase</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                <input
                  type="number"
                  value={batchForm.quantity}
                  onChange={e => setBatchForm({...batchForm, quantity: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">MFG Date</label>
                <input
                  type="date"
                  value={batchForm.mfg_date}
                  onChange={e => setBatchForm({...batchForm, mfg_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={batchForm.expiry_date}
                  onChange={e => setBatchForm({...batchForm, expiry_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={batchForm.purchase_date}
                  onChange={e => setBatchForm({...batchForm, purchase_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <input
                  value={batchForm.notes}
                  onChange={e => setBatchForm({...batchForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-[#0056A4] text-white rounded-lg text-sm">
                {saving ? 'Adding...' : 'Add Batch'}
              </button>
              <button type="button" onClick={() => setShowBatchForm(false)} className="px-4 py-2 border rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {batches.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Package className="mx-auto mb-2" size={32} />
            <p>No batches yet. Add your first stock batch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">MFG</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {batches.map(b => (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.source === 'Old' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {b.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{b.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{b.mfg_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{b.expiry_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{b.notes || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDeleteBatch(b.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
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