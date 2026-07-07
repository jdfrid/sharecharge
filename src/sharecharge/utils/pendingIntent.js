const KEY = 'sharecharge-pending-intent-v1';

/** @typedef {{ type: string, returnTo?: string, [key: string]: unknown }} PendingIntent */

export function savePendingIntent(intent) {
  sessionStorage.setItem(KEY, JSON.stringify({ ...intent, savedAt: Date.now() }));
}

export function loadPendingIntent() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingIntent() {
  sessionStorage.removeItem(KEY);
}

export function buildAuthUrl(returnTo) {
  const q = returnTo ? `?return=${encodeURIComponent(returnTo)}` : '';
  return `/client/auth${q}`;
}
