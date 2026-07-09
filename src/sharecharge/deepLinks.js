/** קישורי hash לאחר פריסה (Vite + HashRouter) */
export function shareChargeHashUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (typeof window === 'undefined') return p;
  return `${window.location.origin}/#${p}`;
}

export const SHARECHARGE_DEEP_LINKS = {
  hub: '/sharecharge',
  clientEntry: '/client/entry',
  clientApp: '/client/discover',
  providerEntry: '/provider/entry',
  providerApp: '/provider/dashboard',
  opsEntry: '/ops/entry',
  opsApp: '/ops/dashboard',
  opsConsole: '/ops/console',
};
