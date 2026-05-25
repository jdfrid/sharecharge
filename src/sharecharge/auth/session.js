import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { clearStoredToken } from '../data/sharechargeApi';

const AUTH_KEY = 'sharecharge-auth-sessions-v2';

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
    const v2 = sessionStorage.getItem(AUTH_KEY);
    if (v2) {
      const parsed = JSON.parse(v2);
      return migrateRoles(parsed);
    }
    const legacy = sessionStorage.getItem('sharecharge-auth-sessions');
    if (legacy) {
      const parsed = migrateRoles(JSON.parse(legacy));
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load auth sessions', e);
  }
  return {};
}

export function saveAuthSessions(sessions) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(sessions));
}

export function clearAuthSession(role) {
  const sessions = loadAuthSessions();
  delete sessions[role];
  saveAuthSessions(sessions);
  clearStoredToken(role);
}

export function setAuthSession(role, payload) {
  const sessions = loadAuthSessions();
  sessions[role] = payload;
  saveAuthSessions(sessions);
}
