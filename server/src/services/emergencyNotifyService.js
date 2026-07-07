import { haversineKm } from '../geo.js';
import { matchesEmergencyCategory } from './serviceCategories.js';

/**
 * Find provider hosts with matching service stations within radius (km).
 */
export function findProvidersInRadius({ stations, users, category, lat, lng, radiusKm = 50 }) {
  if (lat == null || lng == null) return [];

  const byHost = new Map();

  for (const station of stations || []) {
    if (!matchesEmergencyCategory(station, category)) continue;
    const dist = haversineKm(Number(lat), Number(lng), Number(station.lat), Number(station.lng));
    if (dist > Number(radiusKm)) continue;

    const hostId = station.host_id || station.hostId;
    if (!hostId) continue;
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

export function summarizeEmergencyNotify({ providers, radiusKm }) {
  return {
    radiusKm: Number(radiusKm),
    notifiedCount: providers.length,
    providers: providers.slice(0, 20),
  };
}
