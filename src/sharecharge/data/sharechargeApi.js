const API_ORIGIN = (import.meta.env.VITE_SHARECHARGE_API_URL || '').replace(/\/$/, '');
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/sharecharge` : '/api/sharecharge';

const TOKEN_KEY = 'sharecharge-jwt';

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

function blockedResponseMessage(text = '') {
  if (/netfree\.link/i.test(text)) {
    return 'NetFree חוסם את onrender.com. השתמשו ברשת ללא סינון, או חברו דומיין משלכם ב-Render (למשל api.sharecharge.app).';
  }
  const trimmed = text.trim();
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<div id="root"') ||
    trimmed.includes('/assets/index-')
  ) {
    return 'כתובת /api/health מחזירה את האתר (HTML) במקום JSON — ה-API לא deployed. ב-Render: Manual Deploy עם Dockerfile.';
  }
  return null;
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
  if (apiError === 'Session expired') {
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
  return err?.message || err?.data?.detail || (action === 'otp' ? 'שליחת קוד נכשלה' : action === 'verify' ? 'אימות נכשל' : 'הבקשה נכשלה');
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
      const blocked = blockedResponseMessage(text);
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
  const authToken = token || (portal ? getStoredToken(portal) : null);
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
  const blocked = blockedResponseMessage(text);
  if (blocked) {
    const err = new Error(blocked);
    err.blocked = true;
    err.network = true;
    throw err;
  }
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    const err = new Error('השרver החזיר תשובה לא תקינה (לא JSON).');
    err.blocked = true;
    throw err;
  }

  if (!res.ok) {
    const detail = data?.detail || data?.error;
    const err = new Error(detail || res.statusText || 'Request failed');
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
