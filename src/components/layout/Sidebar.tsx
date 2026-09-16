import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Box
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/general-inventory', icon: Box, label: 'General Assets' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/sales/new', icon: ShoppingCart, label: 'New Sale' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#0056A4] text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-blue-400/30">
        <h1 className="text-xl font-bold">Amul Parlour</h1>
        <p className="text-blue-200 text-sm mt-1">Sales & Inventory</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-white text-[#0056A4] font-medium'
                  : 'text-blue-100 hover:bg-blue-600/50'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-blue-400/30 text-sm text-blue-200">
        Phase 1 • MVP
      </div>
    </aside>
  )
}