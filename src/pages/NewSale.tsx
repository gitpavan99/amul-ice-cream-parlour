import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Product, StockBatch } from '../types'
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, 
  X, Camera, ArrowLeft 
} from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

type CartItem = {
  product: Product
  batch: StockBatch | null
  quantity: number
  unit_price: number
}

export default function NewSale() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data: prods } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')

    const { data: bats } = await supabase
      .from('stock_batches')
      .select('*')
      .gt('quantity', 0)

    if (prods) setProducts(prods)
    if (bats) setBatches(bats)
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  )

  const addToCart = (product: Product) => {
    const productBatches = batches.filter(b => b.product_id === product.id)
    // Prefer oldest expiry (FIFO) or first available
    const batch = productBatches.sort((a, b) => {
      if (!a.expiry_date) return 1
      if (!b.expiry_date) return -1
      return a.expiry_date.localeCompare(b.expiry_date)
    })[0] || null

    const existing = cart.find(c => c.product.id === product.id)
    if (existing) {
      setCart(cart.map(c =>
        c.product.id === product.id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ))
    } else {
      setCart([...cart, {
        product,
        batch,
        quantity: 1,
        unit_price: Number(product.selling_price) || 0
      }])
    }
    setSearch('')
  }

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.product.id === productId) {
        const newQty = Math.max(1, c.quantity + delta)
        return { ...c, quantity: newQty }
      }
      return c
    }).filter(c => c.quantity > 0))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.product.id !== productId))
  }

  const subtotal = cart.reduce((sum, c) => sum + (c.quantity * c.unit_price), 0)
  const total = Math.max(0, subtotal - discount)

  const startScanner = async () => {
    setShowScanner(true)
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('scanner-region')
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            const product = products.find(p => p.barcode === decodedText)
            if (product) {
              addToCart(product)
              stopScanner()
            } else {
              setError(`No product found for barcode: ${decodedText}`)
            }
          },
          () => {}
        )
      } catch (err) {
        setError('Camera access failed. Please allow camera permission.')
        setShowScanner(false)
      }
    }, 300)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {}
      scannerRef.current = null
    }
    setShowScanner(false)
  }

  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Generate bill number
      const billNo = `BILL-${Date.now().toString().slice(-8)}`

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          bill_no: billNo,
          total_amount: total,
          discount,
          payment_mode: paymentMode,
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items + deduct stock
      for (const item of cart) {
        await supabase.from('sale_items').insert({
          sale_id: sale.id,
          product_id: item.product.id,
          batch_id: item.batch?.id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
        })

        // Deduct from batch if available
        if (item.batch) {
          const newQty = Number(item.batch.quantity) - item.quantity
          await supabase
            .from('stock_batches')
            .update({ quantity: Math.max(0, newQty) })
            .eq('id', item.batch.id)
        }

        // Record stock movement
        await supabase.from('stock_movements').insert({
          product_id: item.product.id,
          batch_id: item.batch?.id || null,
          type: 'sale',
          quantity: -item.quantity,
          reference: billNo,
        })
      }

      // Navigate to bill view
      navigate(`/sales/bill/${sale.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create sale')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">New Sale</h1>
            <p className="text-gray-500">Scan or search products to add</p>
          </div>
        </div>
        <button
          onClick={startScanner}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium"
        >
          <Camera size={18} />
          Scan Barcode
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Scan Barcode</h3>
              <button onClick={stopScanner} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div id="scanner-region" className="w-full rounded-lg overflow-hidden"></div>
            <p className="text-sm text-gray-500 mt-3 text-center">Point camera at product barcode</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Search */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0056A4] outline-none"
              autoFocus
            />
          </div>

          {search && (
            <div className="bg-white rounded-xl border max-h-80 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-gray-400">No products found</div>
              ) : (
                filteredProducts.slice(0, 10).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.unit} • ₹{p.selling_price}</p>
                    </div>
                    <Plus size={18} className="text-[#0056A4]" />
                  </button>
                ))
              )}
            </div>
          )}

          {!search && (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p>Search or scan products to add to cart</p>
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <ShoppingCart size={18} className="text-[#0056A4]" />
            <h3 className="font-semibold">Cart ({cart.length})</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Cart is empty</div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="p-4 border-b flex gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-gray-500">₹{item.unit_price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 space-y-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border rounded text-sm"
                  min="0"
                />
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-[#0056A4]">₹{total.toFixed(2)}</span>
              </div>

              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>

              <button
                onClick={handleConfirmSale}
                disabled={loading}
                className="w-full bg-[#0056A4] hover:bg-[#003d7a] text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Bill'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}