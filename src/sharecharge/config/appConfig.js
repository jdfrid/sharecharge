/** @typedef {'all'|'client'|'provider'|'ops'} ShareChargeAppFlavor */

let _app = /** @type {ShareChargeAppFlavor} */ (import.meta.env.VITE_SHARECHARGE_APP || 'all');

/** Set at boot from native applicationId (Capacitor) — fixes shared APK web assets. */
export function initShareChargeApp(flavor) {
  if (flavor === 'client' || flavor === 'provider' || flavor === 'ops' || flavor === 'all') {
    _app = flavor;
  }
}

export function getShareChargeApp() {
  return _app;
}

/** @deprecated use getShareChargeApp() — kept for gradual migration */
export const SHARECHARGE_APP = _app;

export function isSingleAppBuild() {
  return getShareChargeApp() !== 'all';
}

const ENTRY_PATHS = {
  client: '/client/home',
  provider: '/provider/entry',
  ops: '/ops/entry',
  all: '/sharecharge',
};

const AUTH_PATHS = {
  client: '/client/home',
  provider: '/provider/dashboard',
  ops: '/ops/dashboard',
  all: '/sharecharge',
};

export function getAppEntryPath() {
  return ENTRY_PATHS[getShareChargeApp()] || '/sharecharge';
}

export function getAppDefaultAuthedPath() {
  return AUTH_PATHS[getShareChargeApp()] || '/sharecharge';
}

const LOGIN_PATHS = {
  client: '/client/entry',
  provider: '/provider/entry',
  ops: '/ops/entry',
  system: '/ops/entry',
  all: '/sharecharge',
};

/** OTP login screen for a portal (use after session expiry). */
export function getAppLoginPath(portal) {
  if (portal && LOGIN_PATHS[portal]) return LOGIN_PATHS[portal];
  return LOGIN_PATHS[getShareChargeApp()] || '/sharecharge';
}

/** @deprecated use getAppEntryPath() */
export const appEntryPath = ENTRY_PATHS[_app] || '/sharecharge';

const APP_TO_PORTAL = {
  client: 'client',
  provider: 'provider',
  ops: 'system',
};

export function flavorAllowsPortal(portal) {
  if (!isSingleAppBuild()) return true;
  return APP_TO_PORTAL[getShareChargeApp()] === portal;
}

export function flavorLabel() {
  return (
    {
      client: 'לקוח',
      provider: 'ספק',
      ops: 'ניהול',
      all: 'ShareCharge',
    }[getShareChargeApp()] || 'ShareCharge'
  );
}
