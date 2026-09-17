import { useAuth } from '../../contexts/AuthContext'
import { LogOut } from 'lucide-react'

export default function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
      <div className="pl-12 lg:pl-0">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">Welcome back</h2>
        <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[180px] sm:max-w-none">
          {user?.email}
        </p>
      </div>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50"
      >
        <LogOut size={18} />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </header>
  )
}