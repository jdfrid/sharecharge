export async function geocodeAddressIsrael(address) {
  const q = String(address || '').trim();
  if (q.length < 3) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${q}, Israel`)}&format=json&limit=1&countrycodes=il&accept-language=he`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ShareCharge/1.0 (contact@sharecharge.app)',
        Accept: 'application/json',
        'Accept-Language': 'he',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const hit = Array.isArray(data) ? data[0] : null;
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function isDefaultTelAvivCoords(lat, lng) {
  return Math.abs(Number(lat) - 32.08) < 0.02 && Math.abs(Number(lng) - 34.78) < 0.02;
}
