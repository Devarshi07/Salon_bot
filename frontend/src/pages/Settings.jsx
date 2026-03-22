import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { api as adminApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { inputClass, Field, LoadingSpinner } from './Services'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_HOURS = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: { open: '09:00', close: '18:00' },
  sunday: null,
}

function initHours(raw) {
  if (!raw) return DEFAULT_HOURS
  const result = {}
  for (const day of DAYS) {
    result[day] = raw[day] || null
  }
  return result
}

export default function Settings() {
  const { salonId } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [ownerToken, setOwnerToken] = useState('')
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone_number: '',
    timezone: '',
    bot_system_prompt: '',
    google_calendar_id: '',
    owner_whatsapp_number: '',
    notify_on_booking: true,
  })
  const [hours, setHours] = useState(DEFAULT_HOURS)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const salon = await api.getSalon(salonId)
        setForm({
          name: salon.name || '',
          address: salon.address || '',
          phone_number: salon.phone_number || '',
          timezone: salon.timezone || '',
          bot_system_prompt: salon.bot_system_prompt || '',
          google_calendar_id: salon.google_calendar_id || '',
          owner_whatsapp_number: salon.owner_whatsapp_number || '',
          notify_on_booking: salon.notify_on_booking ?? true,
        })
        setOwnerToken(salon.owner_access_token || '')
        setHours(initHours(salon.business_hours))
      } catch (err) {
        addToast(err.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [salonId])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateSalon(salonId, { ...form, business_hours: hours })
      addToast('Settings saved successfully')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function generateOwnerToken() {
    setGeneratingToken(true)
    try {
      const result = await api.generateOwnerToken(salonId)
      setOwnerToken(result.owner_access_token)
      addToast('Owner token generated! Share the portal link with the salon owner.')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setGeneratingToken(false)
    }
  }

  function setHourField(day, field, value) {
    setHours(h => ({ ...h, [day]: { ...(h[day] || { open: '09:00', close: '18:00' }), [field]: value } }))
  }

  function toggleDay(day) {
    setHours(h => ({ ...h, [day]: h[day] ? null : { open: '09:00', close: '18:00' } }))
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your salon configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        {/* Salon info */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Salon Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Salon Name">
                <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
              </Field>
            </div>
            <Field label="Address">
              <input className={inputClass} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Timezone">
                <input className={inputClass} value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="e.g. America/New_York" />
              </Field>
              <Field label="Google Calendar ID">
                <input className={inputClass} value={form.google_calendar_id} onChange={e => setForm(f => ({ ...f, google_calendar_id: e.target.value }))} placeholder="calendar-id@group.calendar.google.com" />
              </Field>
            </div>
          </div>
        </section>

        {/* Bot personality */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Bot Personality</h2>
          <p className="text-sm text-gray-400 mb-4">Custom instructions that shape the bot's tone and behavior.</p>
          <Field label="Personality Prompt">
            <textarea
              className={inputClass}
              rows={5}
              value={form.bot_system_prompt}
              onChange={e => setForm(f => ({ ...f, bot_system_prompt: e.target.value }))}
              placeholder="e.g. Be warm and friendly. Always greet customers by name..."
            />
          </Field>
        </section>

        {/* Business hours */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Business Hours</h2>
          <p className="text-sm text-gray-400 mb-5">Toggle a day to mark it as closed.</p>
          <div className="space-y-3">
            {DAYS.map(day => {
              const dayHours = hours[day]
              const isOpen = dayHours !== null && dayHours !== undefined
              return (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-28 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isOpen ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isOpen ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                  </div>
                  {isOpen ? (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={dayHours.open || '09:00'}
                        onChange={e => setHourField(day, 'open', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={dayHours.close || '18:00'}
                        onChange={e => setHourField(day, 'close', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Closed</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Owner notifications */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Owner Notifications</h2>
          <p className="text-sm text-gray-400 mb-4">Notify the salon owner via WhatsApp when a booking is made or cancelled.</p>
          <div className="space-y-4">
            <Field label="Owner WhatsApp Number">
              <input className={inputClass} value={form.owner_whatsapp_number}
                placeholder="+16175550100"
                onChange={e => setForm(f => ({ ...f, owner_whatsapp_number: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">The salon owner's personal WhatsApp number — not the business number.</p>
            </Field>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => setForm(f => ({ ...f, notify_on_booking: !f.notify_on_booking }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.notify_on_booking ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.notify_on_booking ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-700">Send WhatsApp notifications on bookings & cancellations</span>
            </div>
          </div>
        </section>

        {/* Owner portal */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Salon Owner Portal</h2>
          <p className="text-sm text-gray-400 mb-4">Give the salon owner read-only access to their bookings and conversations.</p>
          <div className="space-y-4">
            {ownerToken ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Portal URL — share this with the salon owner:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-indigo-700 flex-1 truncate">
                      {window.location.origin}/owner-login?token={ownerToken}
                    </code>
                    <button type="button" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/owner-login?token=${ownerToken}`)
                      addToast('Link copied!')
                    }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0">Copy</button>
                  </div>
                </div>
                <button type="button" onClick={generateOwnerToken} disabled={generatingToken}
                  className="text-sm text-red-500 hover:text-red-700 font-medium">
                  Regenerate token (invalidates old link)
                </button>
              </div>
            ) : (
              <button type="button" onClick={generateOwnerToken} disabled={generatingToken}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {generatingToken && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Generate Owner Portal Link
              </button>
            )}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
