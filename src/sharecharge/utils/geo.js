/** @returns {number|null} distance in km */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** @returns {number|null} distance in km */
export function distanceToStation(station, origin) {
  if (!origin?.lat || !origin?.lng) {
    return Number(station?.distance) || null;
  }
  const lat = Number(station?.lat);
  const lng = Number(station?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return haversineKm(origin.lat, origin.lng, lat, lng);
}
