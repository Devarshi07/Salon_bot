import { createContext, useContext, useState } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Migrate away from old single-salon keys
  if (localStorage.getItem('salon_id') && !localStorage.getItem('current_salon')) {
    localStorage.removeItem('salon_id')
    localStorage.removeItem('salon_name')
  }

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('admin_api_key') || '')
  const [salons, setSalons] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salons') || '[]') } catch { return [] }
  })
  const [currentSalon, setCurrentSalon] = useState(() => {
    try { return JSON.parse(localStorage.getItem('current_salon') || 'null') } catch { return null }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const isAuthenticated = Boolean(apiKey && currentSalon)
  const salonId = currentSalon?.id || ''
  const salonName = currentSalon?.name || ''

  async function login(key) {
    setIsLoading(true)
    setError('')
    try {
      localStorage.setItem('admin_api_key', key)
      setApiKey(key)
      const allSalons = await api.getSalons()
      if (!allSalons || allSalons.length === 0) {
        throw new Error('No salons found for this API key')
      }
      const salon = allSalons[0]
      localStorage.setItem('salons', JSON.stringify(allSalons))
      localStorage.setItem('current_salon', JSON.stringify(salon))
      setSalons(allSalons)
      setCurrentSalon(salon)
      return true
    } catch (err) {
      localStorage.removeItem('admin_api_key')
      localStorage.removeItem('salons')
      localStorage.removeItem('current_salon')
      setApiKey('')
      setSalons([])
      setCurrentSalon(null)
      setError(err.message || 'Login failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('admin_api_key')
    localStorage.removeItem('salons')
    localStorage.removeItem('current_salon')
    setApiKey('')
    setSalons([])
    setCurrentSalon(null)
  }

  function switchSalon(salon) {
    localStorage.setItem('current_salon', JSON.stringify(salon))
    setCurrentSalon(salon)
  }

  async function refreshSalons() {
    try {
      const allSalons = await api.getSalons()
      localStorage.setItem('salons', JSON.stringify(allSalons))
      setSalons(allSalons)
      if (currentSalon && !allSalons.find(s => s.id === currentSalon.id)) {
        switchSalon(allSalons[0])
      }
      return allSalons
    } catch (err) {
      console.error('Failed to refresh salons', err)
      return salons
    }
  }

  return (
    <AuthContext.Provider value={{
      apiKey, salons, currentSalon, salonId, salonName,
      isAuthenticated, isLoading, error,
      login, logout, switchSalon, refreshSalons,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
