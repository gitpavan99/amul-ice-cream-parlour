import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  Clock,
  Plus,
  Package
} from 'lucide-react'

export default function Dashboard() {
  const [todaySales, setTodaySales] = useState(0)
  const [todayBills, setTodayBills] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [expiringItems, setExpiringItems] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]

    // Today's sales
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('bill_date', today)

    if (sales) {
      setTodayBills(sales.length)
      setTodaySales(sales.reduce((sum, s) => sum + Number(s.total_amount), 0))
    }

    // Products + batches for low stock & expiry
    const { data: products } = await supabase
      .from('products')
      .select('id, name, min_stock_level, unit')
      .eq('is_active', true)

    const { data: batches } = await supabase
      .from('stock_batches')
      .select('*')

    if (products && batches) {
      const lowItems: any[] = []
      let lowCount = 0

      products.forEach(p => {
        const total = batches
          .filter(b => b.product_id === p.id)
          .reduce((sum, b) => sum + Number(b.quantity), 0)

        if (total <= p.min_stock_level) {
          lowCount++
          lowItems.push({ ...p, total })
        }
      })

      setLowStockCount(lowCount)
      setLowStockItems(lowItems.slice(0, 5))

      // Expiring in next 15 days
      const soon = new Date()
      soon.setDate(soon.getDate() + 15)
      const soonStr = soon.toISOString().split('T')[0]

      const expiring = batches.filter(b => 
        b.expiry_date && b.expiry_date <= soonStr && Number(b.quantity) > 0
      )

      setExpiringCount(expiring.length)
      setExpiringItems(expiring.slice(0, 5).map(b => {
        const prod = products.find(p => p.id === b.product_id)
        return { ...b, product_name: prod?.name || 'Unknown' }
      }))
    }

    // Top selling (last 7 days) - simple version
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: recentItems } = await supabase
      .from('sale_items')
      .select('product_id, quantity, products(name)')
      .gte('sale_id', '') // we will improve later
      .limit(50)

    // For now we keep top products simple
    setTopProducts([])

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Overview of your parlour performance</p>
        </div>
        <Link
          to="/sales/new"
          className="inline-flex items-center gap-2 bg-[#0056A4] hover:bg-[#003d7a] text-white px-4 py-2.5 rounded-lg font-medium"
        >
          <Plus size={18} />
          New Sale
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-[#0056A4] to-[#003d7a] text-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Today's Sales</p>
              <h3 className="text-3xl font-bold mt-1">₹{todaySales.toFixed(0)}</h3>
              <p className="text-blue-200 text-sm mt-2">{todayBills} bills</p>
            </div>
            <TrendingUp size={32} className="opacity-80" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Bills Today</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-1">{todayBills}</h3>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <ShoppingBag className="text-[#0056A4]" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Low Stock Items</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-1">{lowStockCount}</h3>
            </div>
            <div className="bg-red-50 p-3 rounded-xl">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Expiring Soon</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-1">{expiringCount}</h3>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl">
              <Clock className="text-orange-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Stock Alerts</h3>
            <Link to="/inventory" className="text-sm text-[#0056A4] hover:underline">View all</Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No low stock items</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-red-600 font-medium">{item.total} left</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Expiring Soon (15 days)</h3>
          </div>
          {expiringItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No items expiring soon</p>
          ) : (
            <div className="space-y-3">
              {expiringItems.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.product_name}</span>
                  <span className="text-orange-600 font-medium">{item.expiry_date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/sales/new" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition">
            <Plus className="text-[#0056A4]" size={24} />
            <span className="text-sm font-medium">New Sale</span>
          </Link>
          <Link to="/inventory" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
            <Package className="text-gray-600" size={24} />
            <span className="text-sm font-medium">Inventory</span>
          </Link>
          <Link to="/sales" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
            <ShoppingBag className="text-gray-600" size={24} />
            <span className="text-sm font-medium">Sales History</span>
          </Link>
          <Link to="/inventory/import" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
            <Package className="text-gray-600" size={24} />
            <span className="text-sm font-medium">Import Stock</span>
          </Link>
        </div>
      </div>
    </div>
  )
}