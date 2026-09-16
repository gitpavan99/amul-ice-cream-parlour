import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from 'lucide-react'

export default function ImportStock() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    products: number
    batches: number
    errors: string[]
  } | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)

      // Read Products Master sheet
      const productsSheet = workbook.Sheets['Products Master']
      const productsData = XLSX.utils.sheet_to_json(productsSheet) as any[]

      // Read Stock Batches sheet
      const batchesSheet = workbook.Sheets['Stock Batches']
      const batchesData = XLSX.utils.sheet_to_json(batchesSheet) as any[]

      // Get categories for mapping
      const { data: categories } = await supabase.from('categories').select('*')
      const categoryMap: Record<string, string> = {}
      categories?.forEach(c => {
        categoryMap[c.name.toLowerCase()] = c.id
      })

      let productsCreated = 0
      let batchesCreated = 0
      const errors: string[] = []
      const productIdMap: Record<string, string> = {} // old Product ID → new uuid

      // Insert Products
      for (const row of productsData) {
        const name = row['Product Name']?.toString().trim()
        if (!name) continue

        const categoryName = row['Category']?.toString().trim() || ''
        const categoryId = categoryMap[categoryName.toLowerCase()] || null

        const { data: inserted, error } = await supabase
          .from('products')
          .insert({
            name,
            category_id: categoryId,
            unit: row['Unit'] || 'PCS',
            barcode: row['Barcode'] || null,
            selling_price: Number(row['Selling Price']) || 0,
            cost_price: row['Cost Price'] ? Number(row['Cost Price']) : null,
            min_stock_level: Number(row['Min Stock Level']) || 5,
            is_active: row['Is Active'] === 'Yes' || row['Is Active'] === true || true,
          })
          .select('id')
          .single()

        if (error) {
          errors.push(`Product "${name}": ${error.message}`)
        } else if (inserted) {
          productIdMap[String(row['Product ID'])] = inserted.id
          productsCreated++
        }
      }

      // Insert Batches
      for (const row of batchesData) {
        const oldProductId = String(row['Product ID'])
        const newProductId = productIdMap[oldProductId]

        if (!newProductId) {
          errors.push(`Batch for Product ID ${oldProductId}: Product not found`)
          continue
        }

        const qty = Number(row['Quantity']) || 0
        if (qty <= 0) continue

        const { error } = await supabase.from('stock_batches').insert({
          product_id: newProductId,
          source: row['Source (Old/Fresh)'] || 'Fresh',
          quantity: qty,
          mfg_date: row['MFG Date'] || null,
          expiry_date: row['Expiry Date'] || null,
          purchase_date: row['Purchase Date'] || null,
          notes: row['Notes'] || null,
        })

        if (error) {
          errors.push(`Batch for ${row['Product Name']}: ${error.message}`)
        } else {
          batchesCreated++
        }
      }

      setResult({
        products: productsCreated,
        batches: batchesCreated,
        errors,
      })
    } catch (err: any) {
      setResult({
        products: 0,
        batches: 0,
        errors: [err.message || 'Failed to read Excel file'],
      })
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/inventory')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Import Stock</h1>
          <p className="text-gray-500">Upload the cleaned Excel file</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-8 text-center space-y-6">
        <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
          <Upload className="text-[#0056A4]" size={28} />
        </div>

        <div>
          <h3 className="font-semibold text-gray-800">Upload Amul_Stock_Cleaned.xlsx</h3>
          <p className="text-sm text-gray-500 mt-1">
            This will create all products and stock batches automatically
          </p>
        </div>

        <label className="inline-flex items-center gap-2 bg-[#0056A4] hover:bg-[#003d7a] text-white px-6 py-3 rounded-lg cursor-pointer font-medium transition">
          <Upload size={18} />
          {loading ? 'Importing...' : 'Choose Excel File'}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            disabled={loading}
            className="hidden"
          />
        </label>

        {result && (
          <div className="text-left bg-gray-50 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={18} />
              <span className="font-medium">
                {result.products} products and {result.batches} batches imported
              </span>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">{result.errors.length} warnings</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => navigate('/inventory')}
              className="mt-4 text-sm text-[#0056A4] hover:underline"
            >
              Go to Inventory →
            </button>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <strong>Important:</strong> Use the cleaned file <code>Amul_Stock_Cleaned.xlsx</code> that we prepared earlier. 
        Make sure the sheet names are exactly “Products Master” and “Stock Batches”.
      </div>
    </div>
  )
}