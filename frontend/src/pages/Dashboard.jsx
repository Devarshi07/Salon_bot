import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { salonId, salonName } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [services, bookings, conversations] = await Promise.all([
          api.getServices(salonId),
          api.getBookings(salonId),
          api.getConversations(salonId),
        ])
        const upcoming = (bookings || []).filter(
          (b) => b.status === 'confirmed' && new Date(b.start_time) > new Date()
        )
        setStats({
          services: (services || []).length,
          upcomingBookings: upcoming.length,
          conversations: (conversations || []).length,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [salonId])

  const quickLinks = [
    { to: '/services', label: 'Manage Services', icon: '✂️', desc: 'Add, edit or remove services' },
    { to: '/bookings', label: 'View Bookings', icon: '📅', desc: 'See upcoming appointments' },
    { to: '/conversations', label: 'Conversations', icon: '💬', desc: 'View customer chat history' },
    { to: '/settings', label: 'Salon Settings', icon: '⚙️', desc: 'Update salon information' },
    { to: '/staff', label: 'Manage Staff', icon: '👤', desc: 'Staff members and roles' },
    { to: '/faqs', label: 'FAQs', icon: '❓', desc: 'Frequently asked questions' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{salonName || 'Dashboard'}</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here is a quick overview.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          Loading stats...
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
      ) : (
        <div className="grid grid-cols-3 gap-5 mb-10">
          <StatCard icon="✂️" label="Total Services" value={stats.services} color="indigo" />
          <StatCard icon="📅" label="Upcoming Bookings" value={stats.upcomingBookings} color="green" />
          <StatCard icon="💬" label="Conversations" value={stats.conversations} color="purple" />
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {quickLinks.map(({ to, label, icon, desc }) => (
            <Link
              key={to}
              to={to}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className="font-medium text-gray-800 group-hover:text-indigo-700">{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl ${colors[color]}`}>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-bold text-gray-900">{value ?? '-'}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
