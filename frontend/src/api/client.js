const BASE_URL = 'http://localhost:8001'

function getApiKey() {
  return localStorage.getItem('admin_api_key')
}

async function request(path, options = {}) {
  const apiKey = getApiKey()
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('admin_api_key')
    localStorage.removeItem('salon_id')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  // Salons
  getSalons: () => request('/admin/salons'),
  getSalon: (id) => request(`/admin/salons/${id}`),
  createSalon: (data) =>
    request('/admin/salons', { method: 'POST', body: JSON.stringify(data) }),
  updateSalon: (id, data) =>
    request(`/admin/salons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSalon: (id) =>
    request(`/admin/salons/${id}`, { method: 'DELETE' }),

  // Services
  getServices: (salonId) => request(`/admin/salons/${salonId}/services`),
  createService: (salonId, data) =>
    request(`/admin/salons/${salonId}/services`, { method: 'POST', body: JSON.stringify(data) }),
  updateService: (salonId, sid, data) =>
    request(`/admin/salons/${salonId}/services/${sid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (salonId, sid) =>
    request(`/admin/salons/${salonId}/services/${sid}`, { method: 'DELETE' }),

  // Policies
  getPolicies: (salonId) => request(`/admin/salons/${salonId}/policies`),
  createPolicy: (salonId, data) =>
    request(`/admin/salons/${salonId}/policies`, { method: 'POST', body: JSON.stringify(data) }),
  updatePolicy: (salonId, pid, data) =>
    request(`/admin/salons/${salonId}/policies/${pid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePolicy: (salonId, pid) =>
    request(`/admin/salons/${salonId}/policies/${pid}`, { method: 'DELETE' }),

  // FAQs
  getFaqs: (salonId) => request(`/admin/salons/${salonId}/faqs`),
  createFaq: (salonId, data) =>
    request(`/admin/salons/${salonId}/faqs`, { method: 'POST', body: JSON.stringify(data) }),
  updateFaq: (salonId, fid, data) =>
    request(`/admin/salons/${salonId}/faqs/${fid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFaq: (salonId, fid) =>
    request(`/admin/salons/${salonId}/faqs/${fid}`, { method: 'DELETE' }),

  // Staff
  getStaff: (salonId) => request(`/admin/salons/${salonId}/staff`),
  createStaff: (salonId, data) =>
    request(`/admin/salons/${salonId}/staff`, { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (salonId, sid, data) =>
    request(`/admin/salons/${salonId}/staff/${sid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (salonId, sid) =>
    request(`/admin/salons/${salonId}/staff/${sid}`, { method: 'DELETE' }),

  // Bookings
  getBookings: (salonId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/admin/salons/${salonId}/bookings${query ? `?${query}` : ''}`)
  },

  // Conversations
  getConversations: (salonId) => request(`/admin/salons/${salonId}/conversations`),
  getMessages: (salonId, cid) =>
    request(`/admin/salons/${salonId}/conversations/${cid}/messages`),

  // Owner token generation (admin)
  generateOwnerToken: (salonId) =>
    request(`/admin/salons/${salonId}/generate-owner-token`, { method: 'POST' }),
}

function getOwnerToken() {
  return localStorage.getItem('owner_token')
}

async function ownerRequest(path, options = {}) {
  const token = getOwnerToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Owner-Token': token } : {}),
    ...(options.headers || {}),
  }
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (response.status === 401) {
    localStorage.removeItem('owner_token')
    window.location.href = '/owner-login'
    throw new Error('Unauthorized')
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Request failed: ${response.status}`)
  }
  if (response.status === 204) return null
  return response.json()
}

export const ownerApi = {
  getMe: () => ownerRequest('/owner/me'),
  getBookings: (status) => ownerRequest(`/owner/bookings${status ? `?status=${status}` : ''}`),
  getStats: () => ownerRequest('/owner/stats'),
  getConversations: () => ownerRequest('/owner/conversations'),
  getMessages: (convId) => ownerRequest(`/owner/conversations/${convId}/messages`),
}
