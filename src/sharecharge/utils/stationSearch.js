import { distanceToStation } from './geo';

function attachDistance(items, origin) {
  return items
    .map((item) => ({
      ...item,
      computedDistance: origin
        ? distanceToStation(item, origin)
        : Number(item.computedDistance ?? item.distance ?? 999),
    }))
    .sort((a, b) => (a.computedDistance ?? 9999) - (b.computedDistance ?? 9999));
}

export function buildNearbyList({ items, origin, maxDistance }) {
  const sorted = attachDistance(items, origin);
  if (!origin || !Number.isFinite(maxDistance)) {
    return { items: sorted, expanded: false };
  }
  const inRadius = sorted.filter(
    (item) => item.computedDistance != null && item.computedDistance <= maxDistance,
  );
  if (inRadius.length > 0) {
    return { items: inRadius, expanded: false };
  }
  return { items: sorted, expanded: sorted.length > 0 };
}

export function buildStationList({
  stations,
  origin,
  maxDistance,
  textQuery = '',
  matchText,
  bookableOnly = false,
}) {
  const term = textQuery.trim().toLowerCase();
  const base = stations.filter((station) => {
    if (bookableOnly && station.availability && !station.availability.canBook) return false;
    if (term && matchText) {
      return matchText(station, term);
    }
    if (term) {
      const hay = `${station.name} ${station.address} ${station.plug}`.toLowerCase();
      return hay.includes(term);
    }
    return true;
  });

  const withDistance = base.map((station) => ({
    ...station,
    computedDistance: origin ? distanceToStation(station, origin) : Number(station.distance || null),
  }));

  withDistance.sort((a, b) => {
    const da = a.computedDistance ?? 9999;
    const db = b.computedDistance ?? 9999;
    return da - db;
  });

  if (!origin || !Number.isFinite(maxDistance)) {
    return { items: withDistance, expanded: false };
  }

  const inRadius = withDistance.filter(
    (station) => station.computedDistance != null && station.computedDistance <= maxDistance,
  );
  if (inRadius.length > 0) {
    return { items: inRadius, expanded: false };
  }

  return { items: withDistance, expanded: withDistance.length > 0 };
}
