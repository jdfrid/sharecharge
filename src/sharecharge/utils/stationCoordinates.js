const CACHE_KEY = 'sharecharge-station-coords-v1';
const DEFAULT_TLV = { lat: 32.08, lng: 34.78 };

export function hasReliableStationCoords(station) {
  const lat = Number(station?.lat);
  const lng = Number(station?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return false;
  if (Math.abs(lat - DEFAULT_TLV.lat) < 0.02 && Math.abs(lng - DEFAULT_TLV.lng) < 0.02) {
    return false;
  }
  return true;
}

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export function getCachedStationCoords(stationId) {
  const cache = loadCache();
  const item = cache[stationId];
  if (!item || !Number.isFinite(item.lat)) return null;
  return { lat: item.lat, lng: item.lng };
}

export function cacheStationCoords(stationId, coords) {
  if (!stationId || !coords?.lat) return;
  const cache = loadCache();
  cache[stationId] = { lat: coords.lat, lng: coords.lng, at: Date.now() };
  saveCache(cache);
}

export function applyStationCoords(station, resolvedMap = {}) {
  const resolved = resolvedMap[station.id] || getCachedStationCoords(station.id);
  if (resolved) {
    return { ...station, lat: resolved.lat, lng: resolved.lng, coordsResolved: true };
  }
  if (hasReliableStationCoords(station)) return station;
  return station;
}

export function stationsNeedingGeocode(stations = []) {
  return stations.filter((station) => {
    if (hasReliableStationCoords(station)) return false;
    if (getCachedStationCoords(station.id)) return false;
    return Boolean(String(station.address || '').trim());
  });
}
