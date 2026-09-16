import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, Eye, Plus } from 'lucide-react'

type Sale = {
  id: string
  bill_no: string
  bill_date: string
  total_amount: number
  discount: number
  payment_mode: string
}

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    setLoading(true)
    const { data } = await supabase
      .from('sales')
      .select('*')
      .order('bill_date', { ascending: false })
      .limit(100)

    if (data) setSales(data)
    setLoading(false)
  }

  const filtered = sales.filter(s => {
    const matchesSearch = s.bill_no.toLowerCase().includes(search.toLowerCase())
    const matchesDate = dateFilter
      ? s.bill_date.startsWith(dateFilter)
      : true
    return matchesSearch && matchesDate
  })

  const totalSales = filtered.reduce((sum, s) => sum + Number(s.total_amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
          <p className="text-gray-500">View and reprint past bills</p>
        </div>
        <Link
          to="/sales/new"
          className="inline-flex items-center gap-2 bg-[#0056A4] hover:bg-[#003d7a] text-white px-4 py-2.5 rounded-lg font-medium"
        >
          <Plus size={18} />
          New Sale
        </Link>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border p-5 flex flex-wrap gap-6">
        <div>
          <p className="text-sm text-gray-500">Bills Shown</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-[#0056A4]">₹{totalSales.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Bill No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056A4] outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading sales...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No sales found</p>
            <Link to="/sales/new" className="text-[#0056A4] hover:underline text-sm mt-2 inline-block">
              Create your first sale →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Bill No</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#0056A4]">{s.bill_no}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(s.bill_date).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">{s.payment_mode}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">₹{Number(s.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/sales/bill/${s.id}`}
                        className="inline-flex items-center gap-1 text-[#0056A4] hover:underline"
                      >
                        <Eye size={14} /> View
                      </Link>
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