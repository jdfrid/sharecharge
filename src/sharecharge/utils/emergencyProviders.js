import { EMERGENCY_CATEGORIES } from '../constants';
import { distanceToStation } from './geo';
import {
  isEmergencyProviderStation,
  normalizeServiceCategory,
  serviceCategoryLabel,
} from './serviceCategories';

export { EMERGENCY_SERVICE_MAP, serviceCategoriesForEmergency } from './serviceCategories';

/** All emergency (non-charging) providers within radius — not filtered by request category. */
export function buildEmergencyProviders({ stations = [], users = [], origin, maxDistance = 50 }) {
  if (!origin?.lat || !origin?.lng) return [];

  const relevantStations = (stations || []).filter(isEmergencyProviderStation);
  const providers = [];

  for (const station of relevantStations) {
    if (station.available === false) continue;

    const dist = distanceToStation(station, origin);
    if (dist == null) continue;

    const host = users.find((user) => user.id === station.hostId && user.role === 'host' && !user.blocked);
    if (!host) continue;

    const cat = normalizeServiceCategory(station);
    providers.push({
      id: station.id,
      hostId: station.hostId,
      stationId: station.id,
      name: station.name,
      hostName: host.name,
      serviceCategory: cat,
      serviceLabel: serviceCategoryLabel(cat),
      address: station.address,
      lat: station.lat,
      lng: station.lng,
      rating: station.rating || 4.8,
      computedDistance: dist,
    });
  }

  return providers
    .filter((item) => item.computedDistance <= maxDistance)
    .sort((a, b) => a.computedDistance - b.computedDistance);
}

/** Provider sees open emergency calls if they have any emergency station within notify radius. */
export function tenderMatchesProvider({ request, stations = [], hostId, maxDistance = 100 }) {
  if (!request || request.status !== 'open') return false;

  const hostStations = stations.filter(
    (station) => station.hostId === hostId && isEmergencyProviderStation(station),
  );
  if (!hostStations.length) return false;

  const origin = { lat: request.lat, lng: request.lng };
  const nearest = hostStations.reduce((best, station) => {
    const dist = distanceToStation(station, origin);
    if (dist == null) return best;
    return dist < best ? dist : best;
  }, Infinity);

  const radius = Number(request.notifyRadiusKm || maxDistance);
  return nearest !== Infinity && nearest <= radius;
}

export function distanceToTender({ request, stations = [], hostId }) {
  const hostStations = stations.filter(
    (station) => station.hostId === hostId && isEmergencyProviderStation(station),
  );
  if (!hostStations.length || request?.lat == null) return null;

  const origin = { lat: request.lat, lng: request.lng };
  const nearest = hostStations.reduce((best, station) => {
    const dist = distanceToStation(station, origin);
    if (dist == null) return best;
    return dist < best ? dist : best;
  }, Infinity);
  return nearest === Infinity ? null : nearest;
}

export function emergencyCategoryLabel(categoryId) {
  return EMERGENCY_CATEGORIES[categoryId]?.label || categoryId || 'חירום';
}
