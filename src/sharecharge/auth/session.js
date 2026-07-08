import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { clearStoredToken, getAuthToken } from '../data/sharechargeApi';
import { getPreferredRepositoryMode } from '../data/apiRepository.stub';

const AUTH_KEY = 'sharecharge-auth-sessions-v2';

export const AUTH_SESSION_EVENT = 'sharecharge-auth-changed';

function emitAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
  }
}

function storage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* ignore */
  }
  return sessionStorage;
}

const LEGACY_MAP = {
  driver: SHARECHARGE_ROLE_KEYS.client,
  host: SHARECHARGE_ROLE_KEYS.provider,
  admin: SHARECHARGE_ROLE_KEYS.system,
};

function migrateRoles(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const next = { ...raw };
  for (const [legacy, modern] of Object.entries(LEGACY_MAP)) {
    if (next[legacy] && !next[modern]) {
      next[modern] = next[legacy];
      delete next[legacy];
    }
  }
  return next;
}

export function loadAuthSessions() {
  try {
    const store = storage();
    const v2 = store.getItem(AUTH_KEY);
    if (v2) {
      const parsed = JSON.parse(v2);
      return migrateRoles(parsed);
    }
    const legacy = store.getItem('sharecharge-auth-sessions');
    if (legacy) {
      const parsed = migrateRoles(JSON.parse(legacy));
      store.setItem(AUTH_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load auth sessions', e);
  }
  return {};
}

export function saveAuthSessions(sessions) {
  storage().setItem(AUTH_KEY, JSON.stringify(sessions));
}

export function clearAuthSession(role) {
  const sessions = loadAuthSessions();
  delete sessions[role];
  saveAuthSessions(sessions);
  clearStoredToken(role);
  emitAuthChange();
}

export function setAuthSession(role, payload) {
  const sessions = loadAuthSessions();
  sessions[role] = payload;
  saveAuthSessions(sessions);
  emitAuthChange();
}

/** True when session is valid for entering the app (includes JWT in API mode). */
export function isPortalSessionReady(portal) {
  const s = loadAuthSessions();
  if (!s[portal]?.verified) return false;
  if (s[portal]?.offlineDemo) return true;
  if (getPreferredRepositoryMode() === 'api') {
    return !!(s[portal]?.token || getAuthToken(portal));
  }
  return true;
}

/** Clears half-broken sessions (verified flag without token) that cause redirect loops. */
export function sanitizePortalSession(portal) {
  const s = loadAuthSessions();
  if (!s[portal]?.verified) return false;
  if (getPreferredRepositoryMode() === 'api' && !s[portal]?.token && !getAuthToken(portal)) {
    clearAuthSession(portal);
    return true;
  }
  return false;
}
