const nativeModes = new Set(['client', 'provider', 'ops']);
const DEFAULT_RENDER_API = 'https://sharecharge.onrender.com';

function resolveApiOrigin() {
  const fromEnv = (import.meta.env.VITE_SHARECHARGE_API_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (nativeModes.has(import.meta.env.MODE)) return DEFAULT_RENDER_API;
  return '';
}

const cache = new Map();

const API_ORIGIN = resolveApiOrigin();
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/sharecharge` : '/api/sharecharge';

export function fallbackAreaName(lat, lng) {
  if (lat >= 31.7 && lat <= 32.05 && lng >= 35.05 && lng <= 35.35) return 'ירושלים והסביבה';
  if (lat >= 32.0 && lat <= 32.15 && lng >= 34.7 && lng <= 34.95) return 'תל אביב והסביבה';
  if (lat >= 32.12 && lat <= 32.2 && lng >= 34.82 && lng <= 34.92) return 'רמת השרון / הרצליה';
  if (lat >= 32.75 && lat <= 32.9 && lng >= 34.95 && lng <= 35.1) return 'חיפה והסביבה';
  if (lat >= 31.2 && lat <= 31.35 && lng >= 34.75 && lng <= 34.95) return 'באר שבע והסביבה';
  return 'מיקום נוכחי';
}

function pickAddress(data) {
  const a = data?.address;
  if (!a) return '';
  const parts = [a.road, a.house_number, a.city || a.town || a.village || a.suburb, a.state]
    .filter(Boolean)
    .join(' ');
  return parts || data.display_name || '';
}

export async function reverseGeocode(lat, lng) {
  const key = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const res = await fetch(
      `${API_BASE}/geo/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.address || fallbackAreaName(lat, lng);
      cache.set(key, text);
      return text;
    }
  } catch {
    /* try direct or fallback */
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&accept-language=he`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'he' },
    });
    if (res.ok) {
      const data = await res.json();
      const text = pickAddress(data) || fallbackAreaName(lat, lng);
      cache.set(key, text);
      return text;
    }
  } catch {
    /* fallback below */
  }

  const fallback = fallbackAreaName(lat, lng);
  cache.set(key, fallback);
  return fallback;
}
