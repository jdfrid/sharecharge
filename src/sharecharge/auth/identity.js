import { createId } from '../utils';
import { loadAuthSessions } from './session';

export function normalizeEmail(value) {
  return (value || '').trim().toLowerCase();
}

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
  const email = getSessionClientEmail();
  if (!email) return 'driver-1';
  const driver = state.users.find((u) => u.role === 'driver' && normalizeEmail(u.email) === email);
  return driver?.id || 'driver-1';
}

export function resolveHostIdForSession(state) {
  const email = getSessionProviderEmail();
  if (!email) return state.users.find((u) => u.role === 'host')?.id || '';
  const host = state.users.find((u) => u.role === 'host' && normalizeEmail(u.email) === email);
  return host?.id || state.users.find((u) => u.role === 'host')?.id || '';
}

export function userDisplay(u) {
  if (!u) return { name: '—', email: '' };
  return { name: u.name, email: u.email || '' };
}
