import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import AddProduct from './pages/AddProduct'
import ProductDetail from './pages/ProductDetail'
import ImportStock from './pages/ImportStock'
import NewSale from './pages/NewSale'
import BillView from './pages/BillView'
import SalesHistory from './pages/SalesHistory'
import GeneralInventory from './pages/GeneralInventory'
import Settings from './pages/Settings'
import Reports from './pages/Reports'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
	<Route path="inventory" element={<Inventory />} />
	<Route path="inventory/new" element={<AddProduct />} />
	<Route path="inventory/:id" element={<ProductDetail />} />
	<Route path="inventory/import" element={<ImportStock />} />
	<Route path="sales/new" element={<NewSale />} />
	<Route path="sales/bill/:id" element={<BillView />} />
	<Route path="sales" element={<SalesHistory />} />
	<Route path="sales/new" element={<NewSale />} />
	<Route path="sales/bill/:id" element={<BillView />} />
	<Route path="general-inventory" element={<GeneralInventory />} />
	<Route path="settings" element={<Settings />} />
	<Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}