/** @typedef {'all'|'client'|'provider'|'ops'} ShareChargeAppFlavor */

export const SHARECHARGE_APP = /** @type {ShareChargeAppFlavor} */ (
  import.meta.env.VITE_SHARECHARGE_APP || 'all'
);

export const isSingleAppBuild = SHARECHARGE_APP !== 'all';

export const appEntryPath = {
  client: '/client/entry',
  provider: '/provider/entry',
  ops: '/ops/entry',
  all: '/sharecharge',
}[SHARECHARGE_APP] || '/sharecharge';

export const appDefaultAuthedPath = {
  client: '/client/discover',
  provider: '/provider/dashboard',
  ops: '/ops/dashboard',
  all: '/sharecharge',
}[SHARECHARGE_APP] || '/sharecharge';

const APP_TO_PORTAL = {
  client: 'client',
  provider: 'provider',
  ops: 'system',
};

export function flavorAllowsPortal(portal) {
  if (!isSingleAppBuild) return true;
  return APP_TO_PORTAL[SHARECHARGE_APP] === portal;
}
