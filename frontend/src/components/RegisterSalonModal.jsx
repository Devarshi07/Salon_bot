import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DEFAULT_HOURS = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: { open: '10:00', close: '16:00' },
  sunday: null,
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function RegisterSalonModal({ onClose, onCreated }) {
  const { refreshSalons, switchSalon } = useAuth()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hours, setHours] = useState(DEFAULT_HOURS)
  const [form, setForm] = useState({
    name: '',
    phone_number: '',
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
    address: '',
    timezone: 'America/New_York',
    bot_system_prompt: '',
    google_calendar_id: '',
  })

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleDay(day) {
    setHours(h => ({ ...h, [day]: h[day] ? null : { open: '09:00', close: '18:00' } }))
  }

  function setHourField(day, field, val) {
    setHours(h => ({ ...h, [day]: { ...(h[day] || { open: '09:00', close: '18:00' }), [field]: val } }))
  }

  async function handleSubmit() {
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, business_hours: hours }
      const created = await api.createSalon(payload)
      const updated = await refreshSalons()
      const fresh = updated.find(s => s.id === created.id) || created
      switchSalon(fresh)
      onCreated(fresh)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
    'Asia/Dubai', 'Asia/Mumbai', 'Asia/Singapore', 'Asia/Tokyo',
    'Australia/Sydney', 'Australia/Melbourne',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Register New Salon</h2>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 py-3 gap-2 border-b border-gray-100">
          {['Salon Info', 'WhatsApp', 'Hours & Bot'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === i + 1 ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Salon Name *</label>
                  <input className={inputClass} placeholder="e.g. Glamour Salon" value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Contact Phone *</label>
                  <input className={inputClass} placeholder="+16175550100" value={form.phone_number} onChange={e => setField('phone_number', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input className={inputClass} placeholder="123 Main St, Boston, MA 02101" value={form.address} onChange={e => setField('address', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Timezone *</label>
                  <select className={inputClass} value={form.timezone} onChange={e => setField('timezone', e.target.value)}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Google Calendar ID</label>
                  <input className={inputClass} placeholder="abc@group.calendar.google.com" value={form.google_calendar_id} onChange={e => setField('google_calendar_id', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Where to find these</p>
                <p>Go to <strong>Meta Developer Dashboard</strong> → WhatsApp → Getting Started. You'll find the Phone Number ID and temporary Access Token there.</p>
              </div>
              <div>
                <label className={labelClass}>WhatsApp Phone Number ID *</label>
                <input className={inputClass} placeholder="1234567890" value={form.whatsapp_phone_number_id} onChange={e => setField('whatsapp_phone_number_id', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Found in Meta Dashboard under WhatsApp → Getting Started</p>
              </div>
              <div>
                <label className={labelClass}>WhatsApp Access Token *</label>
                <textarea className={inputClass} rows={3} placeholder="EAABs..." value={form.whatsapp_access_token} onChange={e => setField('whatsapp_access_token', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Temporary token expires in 24h. Generate a permanent token for production.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className={labelClass}>Bot Personality</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  placeholder='e.g. "You are Luna, the friendly assistant for Glamour Salon! Be warm, enthusiastic, and use the occasional emoji."'
                  value={form.bot_system_prompt}
                  onChange={e => setField('bot_system_prompt', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to use the default friendly assistant voice.</p>
              </div>
              <div>
                <label className={labelClass}>Business Hours</label>
                <div className="space-y-2 mt-2">
                  {DAYS.map(day => {
                    const dayHours = hours[day]
                    const isOpen = dayHours !== null && dayHours !== undefined
                    return (
                      <div key={day} className="flex items-center gap-4">
                        <div className="w-28 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isOpen ? 'bg-indigo-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isOpen ? 'translate-x-4' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-sm font-medium text-gray-700 capitalize">{day.slice(0, 3)}</span>
                        </div>
                        {isOpen ? (
                          <div className="flex items-center gap-2 text-sm">
                            <input type="time" value={dayHours.open} onChange={e => setHourField(day, 'open', e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <span className="text-gray-400">to</span>
                            <input type="time" value={dayHours.close} onChange={e => setHourField(day, 'close', e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Closed</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            {step > 1 ? '← Back' : 'Cancel'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !form.name) { setError('Salon name is required'); return }
                if (step === 2 && (!form.whatsapp_phone_number_id || !form.whatsapp_access_token)) { setError('WhatsApp credentials are required'); return }
                setError('')
                setStep(s => s + 1)
              }}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Creating...' : '✓ Create Salon'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
