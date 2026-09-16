import { useAuth } from '../../contexts/AuthContext'
import { LogOut, Bell } from 'lucide-react'

export default function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Welcome back</h2>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-700">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </header>
  )
}