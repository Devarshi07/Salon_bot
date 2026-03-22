import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

const EMPTY_FORM = { name: '', category: '', price: '', duration_minutes: '', description: '', is_active: true }

export default function Services() {
  const { salonId } = useAuth()
  const { addToast } = useToast()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api.getServices(salonId)
      setServices(data || [])
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [salonId])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(svc) {
    setEditing(svc)
    setForm({
      name: svc.name || '',
      category: svc.category || '',
      price: svc.price != null ? String(svc.price) : '',
      duration_minutes: svc.duration_minutes != null ? String(svc.duration_minutes) : '',
      description: svc.description || '',
      is_active: svc.is_active !== false,
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: form.price !== '' ? Number(form.price) : null,
        duration_minutes: form.duration_minutes !== '' ? Number(form.duration_minutes) : null,
      }
      if (editing) {
        await api.updateService(salonId, editing.id, payload)
        addToast('Service updated')
      } else {
        await api.createService(salonId, payload)
        addToast('Service created')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deleteService(salonId, deleteTarget.id)
      addToast('Service deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm mt-0.5">{services.length} services</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          + Add Service
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : services.length === 0 ? (
        <EmptyState message="No services yet. Add your first service." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Price</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Duration</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{svc.name}</td>
                  <td className="px-4 py-3 text-gray-500">{svc.category || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {svc.price != null ? `$${Number(svc.price).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {svc.duration_minutes != null ? `${svc.duration_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge active={svc.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions onEdit={() => openEdit(svc)} onDelete={() => setDeleteTarget(svc)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Service' : 'Add Service'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name" required>
            <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <input className={inputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </Field>
            <Field label="Price ($)">
              <input className={inputClass} type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </Field>
          </div>
          <Field label="Duration (minutes)">
            <input className={inputClass} type="number" min="1" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
          </Field>
          <Field label="Description">
            <textarea className={inputClass} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} editing={editing} />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Service"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        isLoading={deleting}
      />
    </div>
  )
}

// Shared helpers

export const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export function FormActions({ onCancel, saving, editing }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
        Cancel
      </button>
      <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
        {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {editing ? 'Save Changes' : 'Create'}
      </button>
    </div>
  )
}

export function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button onClick={onEdit} className="text-gray-400 hover:text-indigo-600 text-xs font-medium px-2 py-1 rounded hover:bg-indigo-50">Edit</button>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-600 text-xs font-medium px-2 py-1 rounded hover:bg-red-50">Delete</button>
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2 text-gray-400 py-8">
      <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      Loading...
    </div>
  )
}

export function EmptyState({ message }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="text-4xl mb-2">📭</div>
      <p>{message}</p>
    </div>
  )
}
