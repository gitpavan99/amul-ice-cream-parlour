export type Category = {
  id: string
  name: string
  description: string | null
  sort_order: number
}

export type Product = {
  id: string
  name: string
  category_id: string | null
  unit: string
  barcode: string | null
  selling_price: number
  cost_price: number | null
  min_stock_level: number
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  categories?: Category | null
}

export type StockBatch = {
  id: string
  product_id: string
  source: 'Old' | 'Fresh' | 'Purchase'
  quantity: number
  mfg_date: string | null
  expiry_date: string | null
  purchase_date: string | null
  notes: string | null
  created_at: string
}

export type ProductWithStock = Product & {
  total_quantity: number
  old_quantity: number
  fresh_quantity: number
  batches?: StockBatch[]
}