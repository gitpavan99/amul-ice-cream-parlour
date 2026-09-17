import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Printer } from 'lucide-react'

type SaleItem = {
  id: string
  quantity: number
  unit_price: number
  line_total: number
  products: {
    name: string
    unit: string
  }
}

type Sale = {
  id: string
  bill_no: string
  bill_date: string
  total_amount: number
  discount: number
  payment_mode: string
  notes: string | null
}

export default function BillView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [parlour, setParlour] = useState({
    name: 'Amul Ice Cream Parlour',
    address: '',
    phone: '',
    gstin: '',
    footer: 'Thank you for your purchase! Visit again.',
    logo_url: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('parlour_settings')
    if (saved) {
      try {
        setParlour(JSON.parse(saved))
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (id) fetchBill()
  }, [id])

  async function fetchBill() {
    setLoading(true)

    const { data: saleData } = await supabase
      .from('sales')
      .select('*')
      .eq('id', id)
      .single()

    const { data: itemsData } = await supabase
      .from('sale_items')
      .select('*, products(name, unit)')
      .eq('sale_id', id)

    if (saleData) setSale(saleData)
    if (itemsData) setItems(itemsData as any)

    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading bill...</div>
  }

  if (!sale) {
    return <div className="p-12 text-center text-gray-500">Bill not found</div>
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.line_total), 0)

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Actions - hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/sales/new')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={18} />
          New Sale
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#0056A4] text-white px-4 py-2 rounded-lg hover:bg-[#003d7a]"
        >
          <Printer size={18} />
          Print Bill
        </button>
      </div>

      {/* Bill Content - optimized for Thermal (80mm) */}
      <div className="bg-white rounded-xl border shadow-sm p-5 print:shadow-none print:border-0 print:p-2" id="bill">
        {/* Header */}
        <div className="text-center border-b border-dashed pb-3 mb-3">
          {parlour.logo_url && (
            <img 
              src={parlour.logo_url} 
              alt="Logo" 
              className="h-14 mx-auto mb-2 object-contain"
            />
          )}
          <h1 className="text-lg font-bold leading-tight">{parlour.name}</h1>
          {parlour.address && <p className="text-xs text-gray-600 mt-1">{parlour.address}</p>}
          {parlour.phone && <p className="text-xs text-gray-600">Ph: {parlour.phone}</p>}
          {parlour.gstin && <p className="text-xs text-gray-600">GSTIN: {parlour.gstin}</p>}
        </div>

        {/* Bill Info */}
        <div className="text-xs space-y-0.5 mb-3">
          <div className="flex justify-between">
            <span>Bill No:</span>
            <strong>{sale.bill_no}</strong>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(sale.bill_date).toLocaleString('en-IN', { 
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span>{sale.payment_mode}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-b border-dashed py-2 mb-2">
          <div className="flex text-xs font-semibold mb-1">
            <span className="flex-1">Item</span>
            <span className="w-10 text-center">Qty</span>
            <span className="w-14 text-right">Amt</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="flex text-xs py-0.5">
              <span className="flex-1 pr-1">{item.products?.name}</span>
              <span className="w-10 text-center">{item.quantity}</span>
              <span className="w-14 text-right">₹{Number(item.line_total).toFixed(0)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="text-xs space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(0)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>- ₹{Number(sale.discount).toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-dashed pt-1 mt-1">
            <span>TOTAL</span>
            <span>₹{Number(sale.total_amount).toFixed(0)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-dashed text-center text-xs text-gray-600">
          <p>{parlour.footer || 'Thank you for your purchase!'}</p>
        </div>
      </div>

      {/* Print styles for thermal */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
          body * {
            visibility: hidden;
          }
          #bill, #bill * {
            visibility: visible;
          }
          #bill {
            position: absolute;
            left: 0;
            top: 0;
            width: 76mm;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  )
}