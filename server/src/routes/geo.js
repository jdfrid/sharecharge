import { Router } from 'express';

const router = Router();

function pickAddress(data) {
  const a = data?.address;
  if (!a) return '';
  const parts = [a.road, a.house_number, a.city || a.town || a.village || a.suburb, a.state]
    .filter(Boolean)
    .join(' ');
  return parts || data.display_name || '';
}

function fallbackAreaName(lat, lng) {
  if (lat >= 31.7 && lat <= 32.05 && lng >= 35.05 && lng <= 35.35) return 'ירושלים והסביבה';
  if (lat >= 32.0 && lat <= 32.15 && lng >= 34.7 && lng <= 34.95) return 'תל אביב והסביבה';
  if (lat >= 32.12 && lat <= 32.2 && lng >= 34.82 && lng <= 34.92) return 'רמת השרון / הרצליה';
  if (lat >= 32.75 && lat <= 32.9 && lng >= 34.95 && lng <= 35.1) return 'חיפה והסביבה';
  if (lat >= 31.2 && lat <= 31.35 && lng >= 34.75 && lng <= 34.95) return 'באר שבע והסביבה';
  return 'מיקום נוכחי';
}

router.get('/reverse', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'invalid', detail: 'lat and lng required' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&accept-language=he`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ShareCharge/1.0 (contact@sharecharge.app)',
        Accept: 'application/json',
        'Accept-Language': 'he',
      },
    });
    if (response.ok) {
      const data = await response.json();
      const address = pickAddress(data) || fallbackAreaName(lat, lng);
      return res.json({ address, source: 'nominatim' });
    }
  } catch (err) {
    console.warn('reverse geocode failed:', err.message);
  }

  res.json({ address: fallbackAreaName(lat, lng), source: 'fallback' });
});

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit) || 5, 8);
  if (q.length < 2) {
    return res.status(400).json({ error: 'invalid', detail: 'query too short' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${limit}&countrycodes=il&accept-language=he`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ShareCharge/1.0 (contact@sharecharge.app)',
        Accept: 'application/json',
        'Accept-Language': 'he',
      },
    });
    if (response.ok) {
      const data = await response.json();
      const results = (Array.isArray(data) ? data : []).map((item) => ({
        lat: Number(item.lat),
        lng: Number(item.lon),
        address: item.display_name,
        displayName: item.display_name,
      }));
      return res.json({ results, source: 'nominatim' });
    }
  } catch (err) {
    console.warn('forward geocode failed:', err.message);
  }

  res.json({ results: [], source: 'empty' });
});

export default router;
