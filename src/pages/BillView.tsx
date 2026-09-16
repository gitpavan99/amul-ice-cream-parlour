import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Printer, Share2 } from 'lucide-react'

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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Actions - hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/sales/new')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={18} />
          New Sale
        </button>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#0056A4] text-white px-4 py-2 rounded-lg hover:bg-[#003d7a]"
          >
            <Printer size={18} />
            Print Bill
          </button>
        </div>
      </div>

      {/* Bill Content */}
      <div className="bg-white rounded-xl border shadow-sm p-8 print:shadow-none print:border-0" id="bill">
        {/* Header */}
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-[#0056A4]">{parlour.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{parlour.address}</p>
          <p className="text-sm text-gray-500">Phone: {parlour.phone}</p>
          {parlour.gstin && <p className="text-sm text-gray-500">GSTIN: {parlour.gstin}</p>}
        </div>

        {/* Bill Info */}
        <div className="flex justify-between text-sm mb-6">
          <div>
            <p><span className="text-gray-500">Bill No:</span> <strong>{sale.bill_no}</strong></p>
            <p><span className="text-gray-500">Date:</span> {new Date(sale.bill_date).toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p><span className="text-gray-500">Payment:</span> {sale.payment_mode}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 font-semibold">Item</th>
              <th className="text-center py-2 font-semibold">Qty</th>
              <th className="text-right py-2 font-semibold">Rate</th>
              <th className="text-right py-2 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2.5">{item.products?.name}</td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                <td className="py-2.5 text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                <td className="py-2.5 text-right">₹{Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>- ₹{Number(sale.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
            <span>Total</span>
            <span className="text-[#0056A4]">₹{Number(sale.total_amount).toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
 	 <p>{parlour.footer || 'Thank you for your purchase! Visit again.'}</p>
	</div>
      </div>

      {/* Print styles note */}
      <style>{`
        @media print {
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
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}