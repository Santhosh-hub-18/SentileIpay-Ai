const API_BASE = '/api';

/**
 * Universal fetch wrapper with automatic JWT token injection and JSON parsing.
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('fraudshield_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('fraudshield_token');
    localStorage.removeItem('fraudshield_user');
    window.location.hash = '#/login';
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorDetail = data?.detail || data?.message || (typeof data === 'string' ? data : 'API Request failed');
    const error = new Error(typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getMe: () => apiRequest('/auth/me'),

  // Dashboard
  getStats: () => apiRequest('/dashboard/stats'),

  // Events
  listEvents: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return apiRequest(`/events?${query.toString()}`);
  },
  getEvent: (id) => apiRequest(`/events/${id}`),
  createEvent: (eventData) =>
    apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    }),
  simulateEvent: (scenario) =>
    apiRequest('/events/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    }),
  testScore: (scoreData) =>
    apiRequest('/events/test-score', {
      method: 'POST',
      body: JSON.stringify(scoreData),
    }),

  // Alerts
  listAlerts: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return apiRequest(`/alerts?${query.toString()}`);
  },
  getAlert: (id) => apiRequest(`/alerts/${id}`),
  updateAlert: (id, data) =>
    apiRequest(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Verification
  requestOtp: (eventId) =>
    apiRequest('/verification/otp/request', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId }),
    }),
  verifyOtp: (eventId, code) =>
    apiRequest('/verification/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, code }),
    }),
  listOtpSessions: (params = {}) => {
    const query = new URLSearchParams(params);
    return apiRequest(`/verification/otp/sessions?${query.toString()}`);
  },
  listCases: (params = {}) => {
    const query = new URLSearchParams(params);
    return apiRequest(`/verification/cases?${query.toString()}`);
  },
  submitCaseDecision: (caseId, decision) =>
    apiRequest(`/verification/cases/${caseId}/decision`, {
      method: 'POST',
      body: JSON.stringify(decision),
    }),

  // Blocked Transactions
  listBlocks: (params = {}) => {
    const query = new URLSearchParams(params);
    return apiRequest(`/blocked-transactions?${query.toString()}`);
  },
  submitBlockDecision: (eventId, decision) =>
    apiRequest(`/blocked-transactions/${eventId}/decision`, {
      method: 'POST',
      body: JSON.stringify(decision),
    }),

  // Settings
  getSettings: () => apiRequest('/settings'),
  updateSettings: (config) =>
    apiRequest('/settings', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  // Audit Logs
  listAuditLogs: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return apiRequest(`/audit-logs?${query.toString()}`);
  },
};
