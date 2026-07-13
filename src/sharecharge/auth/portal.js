import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { getShareChargeApp } from '../config/appConfig';
import { getStoredToken } from '../data/sharechargeApi';
import { loadAuthSessions } from './session';

/** Map HashRouter path to API portal (client / provider / system). */
export function portalFromPath(pathname = '', hash = '') {
  const raw = (hash || pathname || '').replace(/^#/, '').split('?')[0];
  if (raw.startsWith('/provider')) return SHARECHARGE_ROLE_KEYS.provider;
  if (raw.startsWith('/ops')) return SHARECHARGE_ROLE_KEYS.system;
  if (raw.startsWith('/client')) return SHARECHARGE_ROLE_KEYS.client;
  return null;
}

/** Which portal's JWT to use for API calls on this screen. */
export function resolveApiPortal(location) {
  const app = getShareChargeApp();
  if (app === 'client') return SHARECHARGE_ROLE_KEYS.client;
  if (app === 'provider') return SHARECHARGE_ROLE_KEYS.provider;
  if (app === 'ops') return SHARECHARGE_ROLE_KEYS.system;

  const fromRoute = portalFromPath(location?.pathname, location?.hash);
  if (app === 'dual') {
    if (fromRoute === SHARECHARGE_ROLE_KEYS.provider || fromRoute === SHARECHARGE_ROLE_KEYS.client) {
      return fromRoute;
    }
  } else if (fromRoute) {
    return fromRoute;
  }

  const sessions = loadAuthSessions();
  for (const portal of [
    SHARECHARGE_ROLE_KEYS.client,
    SHARECHARGE_ROLE_KEYS.provider,
    SHARECHARGE_ROLE_KEYS.system,
  ]) {
    if (sessions[portal]?.verified && (sessions[portal]?.token || getStoredToken(portal))) {
      return portal;
    }
  }
  return SHARECHARGE_ROLE_KEYS.client;
}
