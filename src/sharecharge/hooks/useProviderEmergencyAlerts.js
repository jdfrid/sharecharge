import { useEffect, useMemo, useRef, useState } from 'react';
import {
  distanceToTender,
  emergencyCategoryLabel,
  tenderMatchesProvider,
} from '../utils/emergencyProviders';
import { notifyEmergencyTender, notifyBookingUpdate } from './usePushNotifications';

const SEEN_KEY = 'sharecharge-seen-emergency-ids';
const SEEN_PENDING_KEY = 'sharecharge-seen-pending-confirm-ids';

function loadSeen(key) {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeen(key, set) {
  sessionStorage.setItem(key, JSON.stringify([...set].slice(-40)));
}

export function useProviderEmergencyAlerts({ state, hostId, enabled = true, maxDistance = 100 }) {
  const [alerts, setAlerts] = useState([]);
  const seenRef = useRef(loadSeen(SEEN_KEY));
  const seenPendingRef = useRef(loadSeen(SEEN_PENDING_KEY));

  const relevantRequests = useMemo(() => {
    if (!enabled || !hostId) return [];
    return (state.serviceRequests || []).filter(
      (request) =>
        request.status === 'open'
        && tenderMatchesProvider({ request, stations: state.stations, hostId, maxDistance }),
    );
  }, [state.serviceRequests, state.stations, hostId, enabled, maxDistance]);

  const pendingConfirmations = useMemo(() => {
    if (!enabled || !hostId) return [];
    return (state.serviceRequests || []).filter(
      (request) => request.status === 'pending_provider' && request.hostId === hostId,
    );
  }, [state.serviceRequests, hostId, enabled]);

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
        kind: 'new_call',
        category: request.category,
        categoryLabel: emergencyCategoryLabel(request.category),
        addressText: request.addressText || 'מיקום GPS',
        problemDescription: request.problemDescription || '',
        phone: request.phone || '',
        distanceKm: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
        radiusKm: radius,
        createdAt: request.createdAt || Date.now(),
      };
    });

    for (const alert of nextAlerts) {
      seenRef.current.add(alert.requestId);
      notifyEmergencyTender(alert);
    }
    saveSeen(SEEN_KEY, seenRef.current);

    setAlerts((prev) => {
      const ids = new Set(prev.map((item) => item.requestId));
      const merged = [...nextAlerts.filter((item) => !ids.has(item.requestId)), ...prev];
      return merged.slice(0, 8);
    });
  }, [relevantRequests, enabled, hostId, state.stations, maxDistance]);

  useEffect(() => {
    if (!enabled || !hostId) return;

    const fresh = pendingConfirmations.filter((request) => !seenPendingRef.current.has(request.id));
    if (!fresh.length) return;

    const nextAlerts = fresh.map((request) => ({
      id: `pending-${request.id}`,
      requestId: request.id,
      kind: 'pending_confirm',
      categoryLabel: emergencyCategoryLabel(request.category),
      addressText: request.addressText || 'מיקום GPS',
      problemDescription: request.problemDescription || '',
      phone: request.phone || '',
      amount: request.amount,
      createdAt: request.createdAt || Date.now(),
    }));

    for (const alert of nextAlerts) {
      seenPendingRef.current.add(alert.requestId);
      notifyBookingUpdate({
        title: 'לקוח בחר אותך — ShareCharge',
        body: `${alert.categoryLabel} · ₪${alert.amount || '—'} · ${alert.addressText}`,
      });
    }
    saveSeen(SEEN_PENDING_KEY, seenPendingRef.current);

    setAlerts((prev) => {
      const ids = new Set(prev.map((item) => item.id));
      const merged = [...nextAlerts.filter((item) => !ids.has(item.id)), ...prev];
      return merged.slice(0, 8);
    });
  }, [pendingConfirmations, enabled, hostId]);

  const dismiss = (requestId) => {
    setAlerts((prev) => prev.filter((item) => item.requestId !== requestId));
  };

  return { alerts, dismiss, relevantRequests, pendingConfirmations };
}
