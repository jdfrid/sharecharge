import { haversineKm } from '../geo.js';
import { isChargingStation } from './serviceCategories.js';

/**
 * Find all emergency provider hosts within radius (km).
 * Charging stations are excluded — category does not filter who gets notified.
 */
export function findProvidersInRadius({ stations, users, lat, lng, radiusKm = 50 }) {
  if (lat == null || lng == null) return [];

  const userById = new Map((users || []).map((user) => [user.id, user]));
  const byHost = new Map();

  for (const station of stations || []) {
    if (isChargingStation(station)) continue;
    const dist = haversineKm(Number(lat), Number(lng), Number(station.lat), Number(station.lng));
    if (dist > Number(radiusKm)) continue;

    const hostId = station.host_id || station.hostId;
    if (!hostId) continue;
    const host = userById.get(hostId);
    const prev = byHost.get(hostId);
    if (!prev || dist < prev.distanceKm) {
      byHost.set(hostId, {
        hostId,
        hostName: host?.name || station.name || 'ספק',
        stationId: station.id,
        stationName: station.name,
        distanceKm: Number(dist.toFixed(2)),
        serviceCategory: station.service_category || station.serviceCategory,
      });
    }
  }

  return [...byHost.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}

export function summarizeEmergencyNotify({ providers, radiusKm, category }) {
  return {
    radiusKm: Number(radiusKm),
    category: category || null,
    notifiedCount: providers.length,
    providers: providers.slice(0, 20),
  };
}
