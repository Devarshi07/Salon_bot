import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Policies from './pages/Policies'
import FAQs from './pages/FAQs'
import Staff from './pages/Staff'
import Bookings from './pages/Bookings'
import Conversations from './pages/Conversations'
import Settings from './pages/Settings'
import OwnerLogin from './pages/OwnerLogin'
import OwnerDashboard from './pages/OwnerDashboard'

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Admin routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="services" element={<Services />} />
        <Route path="policies" element={<Policies />} />
        <Route path="faqs" element={<FAQs />} />
        <Route path="staff" element={<Staff />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Salon owner portal routes */}
      <Route path="/owner-login" element={<OwnerLogin />} />
      <Route path="/owner/*" element={<OwnerDashboard />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
