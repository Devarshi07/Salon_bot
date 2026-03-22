import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { ownerApi } from '../api/client'

// ---- Shared helpers ----
const statusColors = {
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  no_show: 'bg-gray-100 text-gray-600',
}

function Badge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

// ---- Overview ----
function Overview({ salon }) {
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    ownerApi.getStats().then(setStats).catch(console.error)
    ownerApi.getBookings('confirmed').then(data => setBookings(data.slice(0, 5))).catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">{salon?.name} — here's your overview</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Bookings" value={stats.total_bookings} icon="📅" />
          <StatCard label="Upcoming" value={stats.upcoming_bookings} icon="⏳" color="text-green-600" />
          <StatCard label="Cancelled" value={stats.cancelled_bookings} icon="❌" color="text-red-500" />
          <StatCard label="Customers" value={stats.total_customers} icon="👥" color="text-indigo-600" />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Upcoming Appointments</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming appointments.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{b.service_name}</p>
                  <p className="text-xs text-gray-500">
                    {b.customer_name || 'Unknown'} · {b.customer_whatsapp}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-700">
                    {new Date(b.appointment_datetime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(b.appointment_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Bookings ----
function OwnerBookings() {
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ownerApi.getBookings(filter || undefined)
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
          <option value="no_show">No show</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">No bookings found.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{b.service_name}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{b.customer_name || '—'}</div>
                    <div className="text-xs text-gray-400">{b.customer_whatsapp}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(b.appointment_datetime).toLocaleString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3"><Badge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- Conversations ----
function OwnerConversations() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ownerApi.getConversations().then(setConversations).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function openConversation(conv) {
    setSelected(conv)
    const msgs = await ownerApi.getMessages(conv.id)
    setMessages(msgs)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Conversations</h1>
      <div className="flex gap-4 h-[600px]">
        {/* List */}
        <div className="w-72 bg-white border border-gray-200 rounded-xl overflow-y-auto shrink-0">
          {loading ? (
            <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No conversations yet.</p>
          ) : conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => openConversation(conv)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?.id === conv.id ? 'bg-purple-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 truncate">{conv.customer_name || conv.customer_whatsapp}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${conv.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <p className="text-xs text-gray-500 truncate">{conv.last_message || '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(conv.updated_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a conversation</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-800 text-sm">{selected.customer_name || selected.customer_whatsapp}</p>
                <p className="text-xs text-gray-400">{selected.customer_whatsapp}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                      m.role === 'user' ? 'bg-gray-100 text-gray-800' : 'bg-purple-600 text-white'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-xs mt-1 ${m.role === 'user' ? 'text-gray-400' : 'text-purple-200'}`}>
                        {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Layout ----
const ownerNav = [
  { to: '/owner', label: 'Overview', icon: '📊', exact: true },
  { to: '/owner/bookings', label: 'Bookings', icon: '📅' },
  { to: '/owner/conversations', label: 'Conversations', icon: '💬' },
]

function OwnerLayout({ salon, onLogout }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">💆</span>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Owner Portal</p>
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">{salon?.name}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {ownerNav.map(({ to, label, icon, exact }) => (
            <NavLink key={to} to={to} end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <button onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8 max-w-6xl">
        <Routes>
          <Route index element={<Overview salon={salon} />} />
          <Route path="bookings" element={<OwnerBookings />} />
          <Route path="conversations" element={<OwnerConversations />} />
        </Routes>
      </main>
    </div>
  )
}

// ---- Root component ----
export default function OwnerDashboard() {
  const [salon, setSalon] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('owner_token')
    if (!token) { navigate('/owner-login'); return }
    ownerApi.getMe()
      .then(setSalon)
      .catch(() => { localStorage.removeItem('owner_token'); navigate('/owner-login') })
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    localStorage.removeItem('owner_token')
    navigate('/owner-login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!salon) return <Navigate to="/owner-login" replace />

  return <OwnerLayout salon={salon} onLogout={handleLogout} />
}
