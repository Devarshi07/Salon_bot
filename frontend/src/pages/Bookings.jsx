import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { LoadingSpinner, EmptyState } from './Services'

const STATUSES = ['all', 'confirmed', 'cancelled', 'completed', 'no_show']

const statusColors = {
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-blue-100 text-blue-700',
  no_show: 'bg-yellow-100 text-yellow-700',
}

function formatDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Bookings() {
  const { salonId } = useAuth()
  const { addToast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = statusFilter !== 'all' ? { status: statusFilter } : {}
        const data = await api.getBookings(salonId, params)
        setBookings(data || [])
      } catch (err) {
        addToast(err.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [salonId, statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 text-sm mt-0.5">{bookings.length} bookings</p>
        </div>
        <div className="flex gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'no_show' ? 'No Show' : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : bookings.length === 0 ? <EmptyState message="No bookings found." /> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Service</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Staff</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date &amp; Time</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {b.customer_name || b.customer_phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.service_name || b.service?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{b.staff_name || b.staff?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(b.start_time)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[b.status] || 'bg-gray-100 text-gray-600'}`}>
                      {b.status?.replace('_', ' ') || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
