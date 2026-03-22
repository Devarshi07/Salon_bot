import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { inputClass, Field, FormActions, RowActions, LoadingSpinner, EmptyState } from './Services'

const EMPTY_FORM = { question: '', answer: '' }

export default function FAQs() {
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
      const data = await api.getFaqs(salonId)
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
    setForm({ question: item.question || '', answer: item.answer || '' })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.updateFaq(salonId, editing.id, form)
        addToast('FAQ updated')
      } else {
        await api.createFaq(salonId, form)
        addToast('FAQ created')
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
      await api.deleteFaq(salonId, deleteTarget.id)
      addToast('FAQ deleted')
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
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} questions</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          + Add FAQ
        </button>
      </div>

      {loading ? <LoadingSpinner /> : items.length === 0 ? <EmptyState message="No FAQs yet." /> : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Question</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Answer Preview</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                    <span className="line-clamp-2">{item.question}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-sm">
                    <span className="line-clamp-1">{item.answer}</span>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit FAQ' : 'Add FAQ'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Question" required>
            <input className={inputClass} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required />
          </Field>
          <Field label="Answer" required>
            <textarea className={inputClass} rows={5} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} required />
          </Field>
          <FormActions onCancel={() => setModalOpen(false)} saving={saving} editing={editing} />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete FAQ"
        message={`Delete this FAQ? This cannot be undone.`}
        isLoading={deleting}
      />
    </div>
  )
}
