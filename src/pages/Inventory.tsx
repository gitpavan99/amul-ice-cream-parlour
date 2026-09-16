import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Product, StockBatch, Category } from '../types'
import { Package, Search, Plus, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { exportToExcel } from '../lib/exportToExcel'
import { Download } from 'lucide-react'

type ProductRow = Product & {
  total_quantity: number
  old_quantity: number
  fresh_quantity: number
  category_name?: string
}

export default function Inventory() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    // Fetch categories
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')

    if (cats) setCategories(cats)

    // Fetch products
    const { data: prods } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true)
      .order('name')

    // Fetch all batches
    const { data: batches } = await supabase
      .from('stock_batches')
      .select('*')

    if (prods && batches) {
      const rows: ProductRow[] = prods.map((p: any) => {
        const productBatches = batches.filter((b: StockBatch) => b.product_id === p.id)
        const total = productBatches.reduce((sum: number, b: StockBatch) => sum + Number(b.quantity), 0)
        const oldQty = productBatches
          .filter((b: StockBatch) => b.source === 'Old')
          .reduce((sum: number, b: StockBatch) => sum + Number(b.quantity), 0)
        const freshQty = productBatches
          .filter((b: StockBatch) => b.source === 'Fresh' || b.source === 'Purchase')
          .reduce((sum: number, b: StockBatch) => sum + Number(b.quantity), 0)

        return {
          ...p,
          total_quantity: total,
          old_quantity: oldQty,
          fresh_quantity: freshQty,
          category_name: p.categories?.name || 'Uncategorized'
        }
      })
      setProducts(rows)
    }

    setLoading(false)
  }

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter ? p.category_id === categoryFilter : true
    return matchesSearch && matchesCategory
  })

const handleExport = async () => {
  const { data: prods } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('is_active', true)
    .order('name')

  const { data: bats } = await supabase
    .from('stock_batches')
    .select('*, products(name)')

  if (prods) {
    const productsExport = prods.map((p: any) => ({
      'Product Name': p.name,
      'Category': p.categories?.name || '',
      'Unit': p.unit,
      'Barcode': p.barcode || '',
      'Selling Price': p.selling_price,
      'Cost Price': p.cost_price || '',
      'Min Stock Level': p.min_stock_level,
    }))
    exportToExcel(productsExport, 'Products', 'Amul_Products_Export')
  }

  if (bats) {
    const batchesExport = bats.map((b: any) => ({
      'Product Name': b.products?.name || '',
      'Source': b.source,
      'Quantity': b.quantity,
      'MFG Date': b.mfg_date || '',
      'Expiry Date': b.expiry_date || '',
      'Purchase Date': b.purchase_date || '',
      'Notes': b.notes || '',
    }))
    setTimeout(() => {
      exportToExcel(batchesExport, 'Batches', 'Amul_Batches_Export')
    }, 500)
  }
}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
    <p className="text-gray-500">Manage products and stock batches</p>
  </div>
  <div className="flex flex-wrap gap-3">
  <button
    onClick={handleExport}
    className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition"
  >
    <Download size={18} />
    Export Excel
  </button>
  <Link
    to="/inventory/import"
    className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition"
  >
    Import Excel
  </Link>
  <Link
    to="/inventory/new"
    className="inline-flex items-center gap-2 bg-[#0056A4] hover:bg-[#003d7a] text-white px-4 py-2.5 rounded-lg font-medium transition"
  >
    <Plus size={18} />
    Add Product
  </Link>
</div>
</div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] focus:border-transparent outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Add your first product or import stock</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Old</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Fresh</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Min Level</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const isLow = p.total_quantity <= p.min_stock_level
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/inventory/${p.id}`} className="font-medium text-[#0056A4] hover:underline">
                          {p.name}
                        </Link>
                        <div className="text-xs text-gray-400">{p.unit}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.category_name}</td>
                      <td className="px-4 py-3 text-right font-medium">{p.total_quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.old_quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.fresh_quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.min_stock_level}</td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs font-medium px-2.5 py-1 rounded-full">
                            <AlertTriangle size={12} />
                            Low
                          </span>
                        ) : (
                          <span className="inline-flex bg-green-50 text-green-600 text-xs font-medium px-2.5 py-1 rounded-full">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}