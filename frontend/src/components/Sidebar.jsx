import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import RegisterSalonModal from './RegisterSalonModal'
import { useToast } from './Toast'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/services', label: 'Services', icon: '✂️' },
  { to: '/policies', label: 'Policies', icon: '📋' },
  { to: '/faqs', label: 'FAQs', icon: '❓' },
  { to: '/staff', label: 'Staff', icon: '👤' },
  { to: '/bookings', label: 'Bookings', icon: '📅' },
  { to: '/conversations', label: 'Conversations', icon: '💬' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  const { salonName, salons, currentSalon, switchSalon, logout } = useAuth()
  const { addToast } = useToast()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  function handleSwitch(salon) {
    switchSalon(salon)
    setDropdownOpen(false)
    addToast(`Switched to ${salon.name}`, 'success')
  }

  return (
    <>
      <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
        {/* Salon switcher */}
        <div className="px-3 py-4 border-b border-gray-100 relative">
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-base shrink-0">
              💇
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium leading-none mb-0.5">Current Salon</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{salonName || 'Select Salon'}</p>
            </div>
            <span className="text-gray-400 text-xs">{dropdownOpen ? '▲' : '▼'}</span>
          </button>

          {dropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="py-1 max-h-48 overflow-y-auto">
                {salons.map(salon => (
                  <button
                    key={salon.id}
                    onClick={() => handleSwitch(salon)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left ${
                      currentSalon?.id === salon.id ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-base">💇</span>
                    <span className="truncate">{salon.name}</span>
                    {currentSalon?.id === salon.id && <span className="ml-auto text-indigo-500 text-xs">✓</span>}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => { setDropdownOpen(false); setShowRegister(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 font-medium transition-colors"
                >
                  <span>＋</span>
                  Add New Salon
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          {salons.length > 0 && (
            <div className="px-3 py-1.5">
              <span className="text-xs text-gray-400">{salons.length} salon{salons.length > 1 ? 's' : ''} registered</span>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <span className="text-base">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {showRegister && (
        <RegisterSalonModal
          onClose={() => setShowRegister(false)}
          onCreated={(salon) => addToast(`${salon.name} created successfully!`, 'success')}
        />
      )}
    </>
  )
}
