import { useEffect, useMemo, useRef, useState } from 'react';
import {
  distanceToTender,
  emergencyCategoryLabel,
  tenderMatchesProvider,
} from '../utils/emergencyProviders';
import { notifyEmergencyTender } from './usePushNotifications';

const SEEN_KEY = 'sharecharge-seen-emergency-ids';

function loadSeen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeen(set) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-40)));
}

export function useProviderEmergencyAlerts({ state, hostId, enabled = true, maxDistance = 100 }) {
  const [alerts, setAlerts] = useState([]);
  const seenRef = useRef(loadSeen());

  const relevantRequests = useMemo(() => {
    if (!enabled || !hostId) return [];
    return (state.serviceRequests || []).filter(
      (request) =>
        request.status === 'open'
        && tenderMatchesProvider({ request, stations: state.stations, hostId, maxDistance }),
    );
  }, [state.serviceRequests, state.stations, hostId, enabled, maxDistance]);

  useEffect(() => {
    if (!enabled || !hostId) return;

    const fresh = relevantRequests.filter((request) => !seenRef.current.has(request.id));
    if (!fresh.length) return;

    const nextAlerts = fresh.map((request) => {
      const radius = Number(request.notifyRadiusKm || maxDistance);
      const distanceKm = distanceToTender({ request, stations: state.stations, hostId });
      return {
        id: request.id,
        requestId: request.id,
        category: request.category,
        categoryLabel: emergencyCategoryLabel(request.category),
        addressText: request.addressText || 'מיקום GPS',
        problemDescription: request.problemDescription || '',
        distanceKm: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
        radiusKm: radius,
        createdAt: request.createdAt || Date.now(),
      };
    });

    for (const alert of nextAlerts) {
      seenRef.current.add(alert.requestId);
      notifyEmergencyTender(alert);
    }
    saveSeen(seenRef.current);

    setAlerts((prev) => {
      const ids = new Set(prev.map((item) => item.requestId));
      const merged = [...nextAlerts.filter((item) => !ids.has(item.requestId)), ...prev];
      return merged.slice(0, 8);
    });
  }, [relevantRequests, enabled, hostId, state.stations]);

  const dismiss = (requestId) => {
    setAlerts((prev) => prev.filter((item) => item.requestId !== requestId));
  };

  return { alerts, dismiss, relevantRequests };
}
