const nativeModes = new Set(['client', 'provider', 'ops']);
const DEFAULT_RENDER_API = 'https://sharecharge.onrender.com';

import { clearAuthSession } from '../auth/session';

function resolveApiOrigin() {
  const fromEnv = (import.meta.env.VITE_SHARECHARGE_API_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (nativeModes.has(import.meta.env.MODE)) return DEFAULT_RENDER_API;
  return '';
}

const API_ORIGIN = resolveApiOrigin();
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/sharecharge` : '/api/sharecharge';

const TOKEN_KEY = 'sharecharge-jwt';
const AUTH_SESSION_KEY = 'sharecharge-auth-sessions-v2';

function tokenFromAuthSession(portal) {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const sessions = JSON.parse(raw);
    return sessions[portal]?.token || null;
  } catch {
    return null;
  }
}

/** JWT for API — prefers sharecharge-jwt, falls back to auth session (APK/Web sync). */
export function getAuthToken(portal) {
  const stored = getStoredToken(portal);
  if (stored) return stored;
  const sessionToken = tokenFromAuthSession(portal);
  if (sessionToken) {
    setStoredToken(portal, sessionToken);
    return sessionToken;
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function fetchWithTimeout(url, ms = 25000, init = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TypeError('Request timed out')), ms);
    fetch(url, init)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function parseHealthPayload(text = '') {
  try {
    const data = JSON.parse(text);
    if (data?.ok === true && typeof data?.service === 'string') {
      return data;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

function blockedResponseMessage(text = '', context = '') {
  if (/netfree\.link/i.test(text)) {
    return 'NetFree חוסם את onrender.com. השתמשו ברשת ללא סינון, או חברו דומיין משלכם ב-Render (למשל api.sharecharge.app).';
  }
  const trimmed = text.trim();
  const isSpaShell =
    trimmed.includes('<div id="root"') || trimmed.includes('/assets/index-');
  const isHtml =
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('Cannot GET') ||
    trimmed.includes('Cannot POST');
  if (!isSpaShell && !isHtml) return null;

  if (context.includes('/tenders')) {
    return 'שירות חירום (tenders) לא deployed בשרver — Render Dashboard → sharecharge → Manual Deploy (Dockerfile).';
  }
  if (isSpaShell) {
    return 'כתובת השרת מחזירה את האתר (HTML) במקום JSON — ה-API לא deployed. ב-Render: Manual Deploy עם Dockerfile.';
  }
  return 'השרver מחזיר HTML במקום JSON — גרסה ישנה או API לא deployed. ב-Render: Manual Deploy (Dockerfile).';
}

export function getApiOrigin() {
  return API_ORIGIN;
}

export function getApiBase() {
  return API_BASE;
}

export function isNetworkFetchError(err) {
  if (!err) return false;
  if (err.network === true) return true;
  if (err.cause && isNetworkFetchError(err.cause)) return true;
  const msg = String(err.message || err).toLowerCase();
  return (
    err.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('לא ניתן להגיע לשרת')
  );
}

export function formatShareChargeApiError(err, action = 'request') {
  if (err?.blocked) return err.message;
  const detail = err?.data?.detail;
  const apiError = err?.data?.error || err?.message;
  if (apiError === 'Station not available') {
    return detail || 'העמדה לא זמינה — חזרו לרשימה, רעננו, ונסו שוב';
  }
  if (apiError === 'Session expired' || apiError === 'Invalid token' || apiError === 'Unauthorized') {
    return detail || 'הסשן פג — צאו והתחברו שוב עם OTP';
  }
  if (detail) return detail;
  if (isNetworkFetchError(err)) {
    const target = API_ORIGIN || 'השרת';
    if (API_ORIGIN.includes('onrender.com')) {
      return `לא ניתן להגיע לשרver (${target}). Render Free «נרדם» — נסו «נסה שוב» אחרי ~30 שניות. ודאו ש-/api/health מחזיר JSON בדפדפן.`;
    }
    return `לא ניתן להגיע לשרver (${target}). ודאו: 1) הטלפון והמחשב על אותו Wi‑Fi 2) npm run start:api פועל 3) חומת אש מאפשרת פורט 3001.`;
  }
  return err?.message || err?.data?.detail || (action === 'otp' ? 'שליחת קוד נכשלה' : action === 'verify' ? 'אימות נכשל' : action === 'booking' ? 'שליחת ההזמנה נכשלה' : 'הבקשה נכשלה');
}

/** Wake Render / verify connectivity before OTP. */
export async function checkApiHealth({ retries = 3, delayMs = 12000 } = {}) {
  if (!API_ORIGIN) {
    return { ok: false, reason: 'missing-url', message: 'לא הוגדר VITE_SHARECHARGE_API_URL ב-build.' };
  }

  const url = `${API_ORIGIN}/api/health`;
  let lastMessage = 'השרver לא עונה';

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, 22000);
      const text = await res.text();
      const blocked = blockedResponseMessage(text, '/api/health');
      if (blocked) {
        return { ok: false, reason: 'html-not-api', message: blocked, attempt };
      }
      const health = parseHealthPayload(text);
      if (health) {
        if (health.db === false && !health.otpFallback) {
          return {
            ok: false,
            reason: 'db',
            message: health.dbError || 'מסד הנתונים לא מחובר ב-Render — קשרו sharecharge-db',
            attempt,
          };
        }
        return {
          ok: true,
          attempt,
          db: health.db === true,
          dbWarning: health.db === false ? health.dbError : undefined,
        };
      }
      lastMessage = res.status === 404
        ? `404 ב-${url} — אין API. Render Dashboard → sharecharge → Manual Deploy (Dockerfile).`
        : `HTTP ${res.status} — לא JSON תקין מ-/api/health`;
    } catch (err) {
      lastMessage = formatShareChargeApiError(err);
    }
    if (attempt < retries) await sleep(delayMs);
  }

  return { ok: false, reason: 'unreachable', message: lastMessage, retries };
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
  const authToken = token || (portal ? getAuthToken(portal) : null);
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, 25000, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const wrapped = new Error(formatShareChargeApiError(err));
    wrapped.cause = err;
    wrapped.network = true;
    throw wrapped;
  }

  let data = null;
  const text = await res.text();
  if (res.status === 404 && path.includes('/tenders')) {
    const err = new Error('שירות חירום לא deployed בשרver — Render Dashboard → Manual Deploy (Dockerfile).');
    err.status = 404;
    throw err;
  }
  const blocked = blockedResponseMessage(text, path);
  if (blocked) {
    const err = new Error(blocked);
    err.blocked = true;
    err.network = true;
    throw err;
  }
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (res.status === 404 && path.includes('/tenders')) {
      const err = new Error('שירות חירום לא deployed בשרver — Render Dashboard → Manual Deploy (Dockerfile).');
      err.status = 404;
      throw err;
    }
    const err = new Error('השרver החזיר תשובה לא תקינה (לא JSON).');
    err.blocked = true;
    throw err;
  }

  if (!res.ok) {
    const detail = data?.detail || data?.error;
    let message = detail || res.statusText || 'Request failed';
    if (res.status === 404 && path.includes('/tenders')) {
      message = 'שירות חירום לא deployed בשרver — Render Dashboard → Manual Deploy (Dockerfile).';
    } else if (res.status === 404 && path.includes('/geo/')) {
      message = 'שירות כתובות לא deployed — Render Dashboard → Manual Deploy (Dockerfile).';
    } else if (res.status === 401 || res.status === 403) {
      message = detail || 'נדרש OTP — התחברו מחדש';
      if (portal && res.status === 401 && !path.startsWith('/auth/')) {
        clearAuthSession(portal);
      }
    }
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function sendOtp(email, portal) {
  return apiRequest('/auth/otp/send', { method: 'POST', body: { email, portal } });
}

export async function registerAccount(payload) {
  return apiRequest('/auth/register', { method: 'POST', body: payload });
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
  reportBookingLocation: (portal, id, coords) =>
    apiRequest(`/bookings/${id}/location`, { method: 'POST', body: coords, portal }),
  createTender: (portal, payload) => apiRequest('/tenders', { method: 'POST', body: payload, portal }),
  fetchTenderBids: (portal, id) => apiRequest(`/tenders/${id}/bids`, { portal }),
  fetchOpenTenders: (portal) => apiRequest('/tenders/open', { portal }),
  submitTenderBid: (portal, id, payload) =>
    apiRequest(`/tenders/${id}/bids`, { method: 'POST', body: payload, portal }),
  acceptTenderBid: (portal, requestId, bidId) =>
    apiRequest(`/tenders/${requestId}/accept/${bidId}`, { method: 'POST', portal }),
  confirmTenderAssignment: (portal, requestId) =>
    apiRequest(`/tenders/${requestId}/confirm`, { method: 'POST', portal }),
  declineTenderAssignment: (portal, requestId) =>
    apiRequest(`/tenders/${requestId}/decline`, { method: 'POST', portal }),
  counterTenderBid: (portal, requestId, bidId, payload) =>
    apiRequest(`/tenders/${requestId}/bids/${bidId}/counter`, { method: 'POST', body: payload, portal }),
  reviseTenderBid: (portal, requestId, bidId, payload) =>
    apiRequest(`/tenders/${requestId}/bids/${bidId}/revise`, { method: 'POST', body: payload, portal }),
  updateTenderLocation: (portal, id, payload) =>
    apiRequest(`/tenders/${id}/location`, { method: 'POST', body: payload, portal }),
  completeTender: (portal, id) => apiRequest(`/tenders/${id}/complete`, { method: 'POST', portal }),
  fetchPayments: (portal) => apiRequest('/payments', { portal }),
  fetchPaymentSummary: (portal) => apiRequest('/payments/summary', { portal }),
  fetchPaymentMethods: (portal) => apiRequest('/payments/methods', { portal }),
  addPaymentMethod: (portal, payload) => apiRequest('/payments/methods', { method: 'POST', body: payload, portal }),
  createPaymentCheckout: (portal, payload) => apiRequest('/payments/checkout', { method: 'POST', body: payload, portal }),
  chargePayment: (portal, id, payload) => apiRequest(`/payments/${id}/charge`, { method: 'POST', body: payload, portal }),
  updatePaymentSplits: (portal, id, cardSplits) =>
    apiRequest(`/payments/${id}/splits`, { method: 'PATCH', body: { cardSplits }, portal }),
  fetchTranzilaConfig: (portal) => apiRequest('/payments/tranzila/config', { portal }),
  fetchPaymentGateways: (portal, region) =>
    apiRequest(`/payments/gateways/recommendations${region ? `?region=${region}` : ''}`, { portal }),
  createTranzilaSession: (portal, paymentId, splitIndex = 0) =>
    apiRequest(`/payments/${paymentId}/tranzila-session`, { method: 'POST', body: { splitIndex }, portal }),
};
