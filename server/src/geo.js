/** Great-circle distance in km between two WGS84 points. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** ~200 m radius around station coordinates. */
export const STATION_GEOFENCE_KM = 0.2;

export function isWithinStationGeofence(driverLat, driverLng, stationLat, stationLng, radiusKm = STATION_GEOFENCE_KM) {
  if ([driverLat, driverLng, stationLat, stationLng].some((v) => v == null || Number.isNaN(Number(v)))) {
    return false;
  }
  return haversineKm(Number(driverLat), Number(driverLng), Number(stationLat), Number(stationLng)) <= radiusKm;
}
