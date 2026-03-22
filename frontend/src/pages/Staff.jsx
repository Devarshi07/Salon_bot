import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { inputClass, Field, FormActions, RowActions, StatusBadge, LoadingSpinner, EmptyState } from './Services'

const EMPTY_FORM = { name: '', role: '', specialties: '', bio: '', is_active: true }

function specialtiesToArray(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

export default function Staff() {
  const { salonId } = useAuth()
  const { addToast } = useToast()
  const [items, setItems] = useState([])
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
      const data = await api.getStaff(salonId)
      setItems(data || [])
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

  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name || '',
      role: item.role || '',
      specialties: Array.isArray(item.specialties) ? item.specialties.join(', ') : (item.specialties || ''),
      bio: item.bio || '',
      is_active: item.is_active !== false,
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        specialties: specialtiesToArray(form.specialties),
      }
      if (editing) {
        await api.updateStaff(salonId, editing.id, payload)
        addToast('Staff member updated')
      } else {
        await api.createStaff(salonId, payload)
        addToast('Staff member created')
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
      await api.deleteStaff(salonId, deleteTarget.id)
      addToast('Staff member deleted')
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
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} members</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          + Add Staff
        </button>
      </div>

      {loading ? <LoadingSpinner /> : items.length === 0 ? <EmptyState message="No staff members yet." /> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Specialties</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.role || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {Array.isArray(item.specialties) && item.specialties.length > 0
                      ? item.specialties.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge active={item.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Staff Member' : 'Add Staff Member'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required>
              <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </Field>
            <Field label="Role">
              <input className={inputClass} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </Field>
          </div>
          <Field label="Specialties (comma-separated)">
            <input className={inputClass} value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))} placeholder="e.g. Haircuts, Coloring, Balayage" />
          </Field>
          <Field label="Bio">
            <textarea className={inputClass} rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
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
        title="Delete Staff Member"
        message={`Remove "${deleteTarget?.name}" from staff? This cannot be undone.`}
        isLoading={deleting}
      />
    </div>
  )
}
