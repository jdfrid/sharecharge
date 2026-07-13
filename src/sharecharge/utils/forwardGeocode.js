const nativeModes = new Set(['client', 'provider', 'ops', 'dual']);
const DEFAULT_RENDER_API = 'https://sharecharge.onrender.com';

function resolveApiOrigin() {
  const fromEnv = (import.meta.env.VITE_SHARECHARGE_API_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (nativeModes.has(import.meta.env.MODE)) return DEFAULT_RENDER_API;
  return '';
}

const API_ORIGIN = resolveApiOrigin();
const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/sharecharge` : '/api/sharecharge';

function normalizeResult(item) {
  return {
    lat: Number(item.lat),
    lng: Number(item.lng),
    address: item.address || item.displayName || '',
    displayName: item.displayName || item.address || '',
  };
}

export async function forwardGeocode(query, { limit = 5 } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(
      `${API_BASE}/geo/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const data = await res.json();
      return (data.results || []).map(normalizeResult).filter((item) => Number.isFinite(item.lat));
    }
  } catch {
    /* try direct */
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${limit}&countrycodes=il&accept-language=he`;
    const res = await fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': 'he' } });
    if (res.ok) {
      const data = await res.json();
      return data
        .map((item) =>
          normalizeResult({
            lat: item.lat,
            lng: item.lon,
            displayName: item.display_name,
            address: item.display_name,
          }),
        )
        .filter((item) => Number.isFinite(item.lat));
    }
  } catch {
    /* empty */
  }

  return [];
}
