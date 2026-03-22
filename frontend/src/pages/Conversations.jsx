import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { LoadingSpinner, EmptyState } from './Services'

function formatTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

export default function Conversations() {
  const { salonId } = useAuth()
  const { addToast } = useToast()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await api.getConversations(salonId)
        setConversations(data || [])
      } catch (err) {
        addToast(err.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [salonId])

  async function openThread(conv) {
    setSelected(conv)
    setMessagesLoading(true)
    try {
      const data = await api.getMessages(salonId, conv.id)
      setMessages(data || [])
    } catch (err) {
      addToast(err.message, 'error')
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <p className="text-gray-500 text-sm mt-0.5">{conversations.length} conversations</p>
      </div>

      {loading ? <LoadingSpinner /> : conversations.length === 0 ? <EmptyState message="No conversations yet." /> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Message</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <tr key={conv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {conv.customer_phone || conv.customer_name || conv.phone_number || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatTime(conv.last_message_at || conv.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      conv.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {conv.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openThread(conv)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50"
                    >
                      View Thread
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => { setSelected(null); setMessages([]) }}
        title={`Thread — ${selected?.customer_phone || selected?.phone_number || 'Customer'}`}
        size="lg"
      >
        {messagesLoading ? (
          <div className="flex items-center gap-2 text-gray-400 py-6">
            <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No messages found.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' || msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.direction === 'outbound' || msg.role === 'assistant'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content || msg.message || msg.body || ''}</p>
                  <p className={`text-xs mt-1 ${
                    msg.direction === 'outbound' || msg.role === 'assistant' ? 'text-indigo-200' : 'text-gray-400'
                  }`}>
                    {formatTime(msg.created_at || msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
