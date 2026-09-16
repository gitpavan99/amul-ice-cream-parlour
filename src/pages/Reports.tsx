import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart3, Download, Calendar } from 'lucide-react'
import { exportToExcel } from '../lib/exportToExcel'

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalBills: 0,
    totalDiscount: 0,
  })
  const [productSales, setProductSales] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [expiring, setExpiring] = useState<any[]>([])

  useEffect(() => {
    // Default to last 30 days
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 30)
    setDateTo(to.toISOString().split('T')[0])
    setDateFrom(from.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchReports()
    }
  }, [dateFrom, dateTo])

  async function fetchReports() {
    setLoading(true)

    // Sales summary
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount, discount')
      .gte('bill_date', dateFrom)
      .lte('bill_date', dateTo + 'T23:59:59')

    if (sales) {
      setSummary({
        totalSales: sales.reduce((sum, s) => sum + Number(s.total_amount), 0),
        totalBills: sales.length,
        totalDiscount: sales.reduce((sum, s) => sum + Number(s.discount || 0), 0),
      })
    }

    // Product-wise sales
    const { data: items } = await supabase
      .from('sale_items')
      .select('quantity, line_total, products(name, unit), sales!inner(bill_date)')
      .gte('sales.bill_date', dateFrom)
      .lte('sales.bill_date', dateTo + 'T23:59:59')

    if (items) {
      const map: Record<string, any> = {}
      items.forEach((item: any) => {
        const name = item.products?.name || 'Unknown'
        if (!map[name]) {
          map[name] = { name, quantity: 0, amount: 0, unit: item.products?.unit || '' }
        }
        map[name].quantity += Number(item.quantity)
        map[name].amount += Number(item.line_total)
      })
      const sorted = Object.values(map).sort((a: any, b: any) => b.amount - a.amount)
      setProductSales(sorted)
    }

    // Low stock
    const { data: products } = await supabase
      .from('products')
      .select('id, name, min_stock_level, unit')
      .eq('is_active', true)

    const { data: batches } = await supabase
      .from('stock_batches')
      .select('*')

    if (products && batches) {
      const low = products
        .map(p => {
          const total = batches
            .filter(b => b.product_id === p.id)
            .reduce((sum, b) => sum + Number(b.quantity), 0)
          return { ...p, total }
        })
        .filter(p => p.total <= p.min_stock_level)
        .sort((a, b) => a.total - b.total)
      setLowStock(low)

      // Expiring in 30 days
      const soon = new Date()
      soon.setDate(soon.getDate() + 30)
      const soonStr = soon.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]

      const exp = batches
        .filter(b => b.expiry_date && b.expiry_date >= todayStr && b.expiry_date <= soonStr && Number(b.quantity) > 0)
        .map(b => {
          const prod = products.find(p => p.id === b.product_id)
          return {
            product_name: prod?.name || 'Unknown',
            quantity: b.quantity,
            expiry_date: b.expiry_date,
            source: b.source,
          }
        })
        .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))
      setExpiring(exp)
    }

    setLoading(false)
  }

  const handleExportProductSales = () => {
    const data = productSales.map(p => ({
      'Product': p.name,
      'Quantity Sold': p.quantity,
      'Unit': p.unit,
      'Total Amount': p.amount,
    }))
    exportToExcel(data, 'Product Sales', 'Product_Sales_Report')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500">Sales, stock and expiry insights</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar size={18} />
          <span className="text-sm font-medium">Period</span>
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading reports...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-3xl font-bold text-[#0056A4] mt-1">₹{summary.totalSales.toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Total Bills</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{summary.totalBills}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Total Discount</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">₹{summary.totalDiscount.toFixed(0)}</p>
            </div>
          </div>

          {/* Product-wise Sales */}
          <div className="bg-white rounded-xl border">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <BarChart3 size={18} />
                Product-wise Sales
              </h3>
              <button
                onClick={handleExportProductSales}
                className="flex items-center gap-2 text-sm border px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                <Download size={14} /> Export
              </button>
            </div>
            {productSales.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No sales in this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Qty Sold</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {productSales.map((p, i) => (
                      <tr key={p.name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-right">{p.quantity} {p.unit}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{p.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low Stock + Expiring */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b">
                <h3 className="font-semibold text-gray-800">Low Stock Items</h3>
              </div>
              {lowStock.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No low stock items</div>
              ) : (
                <div className="divide-y max-h-80 overflow-y-auto">
                  {lowStock.map(item => (
                    <div key={item.id} className="px-5 py-3 flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="text-red-600 font-medium">{item.total} {item.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b">
                <h3 className="font-semibold text-gray-800">Expiring in Next 30 Days</h3>
              </div>
              {expiring.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No items expiring soon</div>
              ) : (
                <div className="divide-y max-h-80 overflow-y-auto">
                  {expiring.map((item, i) => (
                    <div key={i} className="px-5 py-3 flex justify-between text-sm">
                      <div>
                        <p>{item.product_name}</p>
                        <p className="text-xs text-gray-400">{item.source} • Qty: {item.quantity}</p>
                      </div>
                      <span className="text-orange-600 font-medium">{item.expiry_date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}