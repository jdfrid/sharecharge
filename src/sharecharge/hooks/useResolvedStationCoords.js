import { useEffect, useMemo, useState } from 'react';
import { forwardGeocode } from '../utils/forwardGeocode';
import {
  cacheStationCoords,
  getCachedStationCoords,
  stationsNeedingGeocode,
} from '../utils/stationCoordinates';

export function useResolvedStationCoords(stations = []) {
  const [resolved, setResolved] = useState(() => {
    const initial = {};
    for (const station of stations) {
      const cached = getCachedStationCoords(station.id);
      if (cached) initial[station.id] = cached;
    }
    return initial;
  });

  const stationKey = useMemo(
    () => stations.map((station) => `${station.id}:${station.address}:${station.lat}:${station.lng}`).join('|'),
    [stations],
  );

  useEffect(() => {
    let cancelled = false;
    const pending = stationsNeedingGeocode(stations);
    if (!pending.length) return undefined;

    (async () => {
      for (const station of pending.slice(0, 12)) {
        if (cancelled) return;
        const query = `${station.address}, ישראל`;
        try {
          const results = await forwardGeocode(query, { limit: 1 });
          const hit = results[0];
          if (!hit?.lat) continue;
          const coords = { lat: hit.lat, lng: hit.lng };
          cacheStationCoords(station.id, coords);
          if (!cancelled) {
            setResolved((prev) => ({ ...prev, [station.id]: coords }));
          }
        } catch {
          /* try next */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stationKey]);

  return resolved;
}
