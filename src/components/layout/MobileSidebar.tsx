import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, Package, ShoppingCart, BarChart3, 
  Settings, Box, Menu, X 
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

export default function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger button - only visible on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow border"
      >
        <Menu size={22} />
      </button>

      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#0056A4] text-white z-50
        transform transition-transform duration-300 lg:hidden
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-blue-400/30 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Amul Parlour</h1>
            <p className="text-blue-200 text-sm mt-1">Sales & Inventory</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1">
            <X size={22} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
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
      </aside>
    </>
  )
}