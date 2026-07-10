import { createId } from '../utils';
import { loadAuthSessions } from './session';
import { getAuthToken } from '../data/sharechargeApi';
import { SHARECHARGE_ROLE_KEYS } from '../constants';

export function normalizeEmail(value) {
  return (value || '').trim().toLowerCase();
}

function jwtSubForPortal(portal) {
  const token = getAuthToken(portal);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export { jwtSubForPortal };

export function getSessionClientEmail() {

  return normalizeEmail(loadAuthSessions().client?.email);
}

export function getSessionProviderEmail() {
  return normalizeEmail(loadAuthSessions().provider?.email);
}

/** יוצר/מוצא לקוח לפי האימייל שאיתו נכנסו — כדי שההזמנה תקושר לספק */
export function ensureDriverUserForEmail(draft, rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return draft.users.find((u) => u.role === 'driver' && u.id === 'driver-1') || draft.users.find((u) => u.role === 'driver');
  }
  let driver = draft.users.find((u) => u.role === 'driver' && normalizeEmail(u.email) === email);
  if (driver) return driver;
  const id = createId('driver');
  const local = email.split('@')[0] || 'לקוח';
  const name = local.length > 1 ? `${local.charAt(0).toUpperCase()}${local.slice(1)}` : local;
  draft.users.unshift({
    id,
    name,
    email,
    role: 'driver',
    verified: true,
    blocked: false,
    spend: 0,
    createdAt: Date.now(),
  });
  return draft.users.find((u) => u.id === id);
}

export function resolveDriverIdForSession(state) {
  const fromJwt = jwtSubForPortal(SHARECHARGE_ROLE_KEYS.client);
  if (fromJwt) return fromJwt;
  const email = getSessionClientEmail();
  if (!email) return state.users.find((u) => u.role === 'driver')?.id || 'driver-1';
  const driver = state.users.find((u) => u.role === 'driver' && normalizeEmail(u.email) === email);
  return driver?.id || 'driver-1';
}

export function resolveHostIdForSession(state) {
  const fromJwt = jwtSubForPortal(SHARECHARGE_ROLE_KEYS.provider);
  if (fromJwt) return fromJwt;
  const email = getSessionProviderEmail();
  if (!email) return state.users.find((u) => u.role === 'host')?.id || '';
  const host = state.users.find(
    (u) => (u.role === 'host' || u.providerCapable) && normalizeEmail(u.email) === email,
  );
  return host?.id || '';
}

export function userDisplay(u) {  if (!u) return { name: '—', email: '' };
  return { name: u.name, email: u.email || '' };
}
