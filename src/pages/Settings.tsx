import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const [parlour, setParlour] = useState({
    name: 'Amul Ice Cream Parlour',
    address: '',
    phone: '',
    gstin: '',
    footer: 'Thank you for your purchase! Visit again.',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const savedSettings = localStorage.getItem('parlour_settings')
    if (savedSettings) {
      try {
        setParlour(JSON.parse(savedSettings))
      } catch {}
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('parlour_settings', JSON.stringify(parlour))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ... rest of the file remains the same

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500">Parlour details & preferences</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Parlour Information</h3>
        <p className="text-sm text-gray-500">These details appear on printed bills</p>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Parlour Name</label>
          <input
            value={parlour.name}
            onChange={e => setParlour({ ...parlour, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Address</label>
          <textarea
            value={parlour.address}
            onChange={e => setParlour({ ...parlour, address: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone</label>
            <input
              value={parlour.phone}
              onChange={e => setParlour({ ...parlour, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">GSTIN</label>
            <input
              value={parlour.gstin}
              onChange={e => setParlour({ ...parlour, gstin: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Bill Footer Text</label>
          <input
            value={parlour.footer}
            onChange={e => setParlour({ ...parlour, footer: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-[#0056A4] text-white rounded-lg hover:bg-[#003d7a]"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-800 mb-2">Account</h3>
        <p className="text-sm text-gray-600">Logged in as: <strong>{user?.email}</strong></p>
      </div>
    </div>
  )
}