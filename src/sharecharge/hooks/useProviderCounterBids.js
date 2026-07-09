import { useCallback, useEffect, useMemo } from 'react';
import { useShareCharge } from '../context/ShareChargeContext';
import { sharechargeApi } from '../data/sharechargeApi';
import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { useSyncedProviderHost } from './useSyncedProviderHost';
import { emergencyCategoryLabel } from '../utils/emergencyProviders';

export function useProviderCounterBids({ enabled = true } = {}) {
  const { repositoryMode, state, syncTenderSnapshot } = useShareCharge();
  const { activeHostId: hostId } = useSyncedProviderHost(state);
  const apiMode = repositoryMode === 'api';

  const requestIds = useMemo(() => {
    const ids = new Set(
      (state.serviceBids || [])
        .filter((bid) => bid.hostId === hostId && bid.status === 'pending')
        .map((bid) => bid.requestId),
    );
    return [...ids];
  }, [state.serviceBids, hostId]);

  const fetchCounters = useCallback(async () => {
    if (!enabled || !apiMode || !hostId) return [];

    try {
      const data = await sharechargeApi.fetchHostCounterBids(SHARECHARGE_ROLE_KEYS.provider);
      syncTenderSnapshot?.({ bids: data.bids || [] });
      return data.bids || [];
    } catch (err) {
      if (!requestIds.length) return [];
      const merged = [];
      for (const requestId of requestIds) {
        const data = await sharechargeApi.fetchTenderBids(SHARECHARGE_ROLE_KEYS.provider, requestId);
        syncTenderSnapshot?.(data);
        merged.push(...(data.bids || []).filter((bid) => bid.hostId === hostId && bid.driverCounterAt));
      }
      return merged;
    }
  }, [enabled, apiMode, hostId, syncTenderSnapshot, requestIds]);

  useEffect(() => {
    if (!enabled || !apiMode || !hostId) return undefined;
    fetchCounters().catch((err) => console.error('Provider counter bid sync failed', err));
    const timer = setInterval(() => {
      fetchCounters().catch((err) => console.error('Provider counter bid sync failed', err));
    }, 5000);
    return () => clearInterval(timer);
  }, [enabled, apiMode, hostId, fetchCounters]);

  const counterBids = useMemo(
    () =>
      (state.serviceBids || []).filter(
        (bid) =>
          bid.hostId === hostId
          && bid.status === 'pending'
          && bid.driverCounterAt
          && (state.serviceRequests || []).some((r) => r.id === bid.requestId && r.status === 'open'),
      ),
    [state.serviceBids, state.serviceRequests, hostId],
  );

  const alerts = useMemo(
    () =>
      counterBids.map((bid) => {
        const request = (state.serviceRequests || []).find((item) => item.id === bid.requestId);
        return {
          id: bid.id,
          bidId: bid.id,
          requestId: bid.requestId,
          categoryLabel: emergencyCategoryLabel(request?.category),
          addressText: request?.addressText || 'מיקום GPS',
          counterTotal: bid.driverCounterTotal,
          counterEta: bid.driverCounterEtaMinutes,
          message: bid.driverCounterMessage || '',
          yourTotal: bid.total,
          yourEta: bid.etaMinutes,
        };
      }),
    [counterBids, state.serviceRequests],
  );

  return { counterBids, alerts, reload: fetchCounters };
}
