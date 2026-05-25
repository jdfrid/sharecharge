const API_ORIGIN = (import.meta.env.VITE_SHARECHARGE_API_URL || '').replace(/\/$/, '');
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/sharecharge` : '/api/sharecharge';

const TOKEN_KEY = 'sharecharge-jwt';

export function getApiBase() {
  return API_BASE;
}

export function getStoredToken(portal) {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[portal]?.token || null;
  } catch {
    return null;
  }
}

export function setStoredToken(portal, token) {
  const raw = localStorage.getItem(TOKEN_KEY);
  const map = raw ? JSON.parse(raw) : {};
  map[portal] = { token, at: Date.now() };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(map));
}

export function clearStoredToken(portal) {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return;
  const map = JSON.parse(raw);
  delete map[portal];
  localStorage.setItem(TOKEN_KEY, JSON.stringify(map));
}

export async function apiRequest(path, { method = 'GET', body, portal, token } = {}) {
  const authToken = token || (portal ? getStoredToken(portal) : null);
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || res.statusText };
  }

  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function sendOtp(email, portal) {
  return apiRequest('/auth/otp/send', { method: 'POST', body: { email, portal } });
}

export async function verifyOtp(email, portal, code) {
  const data = await apiRequest('/auth/otp/verify', {
    method: 'POST',
    body: { email, portal, code },
  });
  if (data.token) setStoredToken(portal, data.token);
  return data;
}

export async function fetchState(portal) {
  return apiRequest('/ops/state', { portal });
}

export const sharechargeApi = {
  fetchState,
  createBooking: (portal, payload) => apiRequest('/bookings', { method: 'POST', body: payload, portal }),
  approveBooking: (portal, id) => apiRequest(`/bookings/${id}/approve`, { method: 'POST', portal }),
  rejectBooking: (portal, id) => apiRequest(`/bookings/${id}/reject`, { method: 'POST', portal }),
  markOnWay: (portal, id) => apiRequest(`/bookings/${id}/on-way`, { method: 'POST', portal }),
  verifyOtpBooking: (portal, id, otp) =>
    apiRequest(`/bookings/${id}/verify-otp`, { method: 'POST', body: { otp }, portal }),
  driverStartCharge: (portal, id) => apiRequest(`/bookings/${id}/start-charge`, { method: 'POST', portal }),
  finishCharge: (portal, id, kwh) =>
    apiRequest(`/bookings/${id}/finish`, { method: 'POST', body: { kwh }, portal }),
  updateStation: (portal, id, patch) =>
    apiRequest(`/stations/${id}`, { method: 'PATCH', body: patch, portal }),
  openDispute: (portal, id, reason) =>
    apiRequest(`/bookings/${id}/dispute`, { method: 'POST', body: { reason }, portal }),
  resolveDispute: (portal, id) => apiRequest(`/ops/disputes/${id}/resolve`, { method: 'POST', portal }),
  toggleBlockUser: (portal, userId) =>
    apiRequest(`/ops/users/${userId}/toggle-block`, { method: 'POST', portal }),
  setCommission: (portal, commission) =>
    apiRequest('/ops/settings/commission', { method: 'PATCH', body: { commission }, portal }),
  addHost: (portal, payload) => apiRequest('/ops/users/host', { method: 'POST', body: payload, portal }),
  addDriver: (portal, userData) => apiRequest('/ops/users/driver', { method: 'POST', body: userData, portal }),
  addStation: (portal, stationData) => apiRequest('/ops/stations', { method: 'POST', body: stationData, portal }),
  reset: (portal) => apiRequest('/ops/reset', { method: 'POST', portal }),
};
