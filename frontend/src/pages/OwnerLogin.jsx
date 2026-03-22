import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ownerApi } from '../api/client'

export default function OwnerLogin() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Auto-fill token from URL query param (?token=xxx)
  useEffect(() => {
    const t = searchParams.get('token')
    if (t) setToken(t)
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    try {
      localStorage.setItem('owner_token', token.trim())
      await ownerApi.getMe() // validate token
      navigate('/owner')
    } catch (err) {
      localStorage.removeItem('owner_token')
      setError('Invalid token. Please check with your account manager.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">💆</div>
            <h1 className="text-2xl font-bold text-gray-900">Salon Owner Portal</h1>
            <p className="text-gray-500 mt-1 text-sm">Enter your access token to view your salon</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste your access token..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Your token was provided by your account manager</p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !token.trim()}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Access My Salon'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-xs text-gray-400 hover:text-gray-600">Admin login →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
