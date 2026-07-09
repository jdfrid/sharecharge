import { useMemo } from 'react';
import { useShareCharge } from '../context/ShareChargeContext';
import { resolveDriverIdForSession } from '../auth/identity';
import { emergencyCategoryLabel } from '../utils/emergencyProviders';
import { useTenderBidSnapshot } from './useTenders';

export function useClientActiveTender() {
  const { state } = useShareCharge();
  const myDriverId = useMemo(() => resolveDriverIdForSession(state), [state.users]);
  const activeTender = useMemo(
    () =>
      (state.serviceRequests || []).find(
        (item) => item.driverId === myDriverId && !['completed', 'cancelled'].includes(item.status),
      ),
    [state.serviceRequests, myDriverId],
  );
  const { bids, loading, request, countersPending } = useTenderBidSnapshot(activeTender?.id);
  const tender = request || activeTender;

  const offersPath = tender
    ? tender.status === 'open' || tender.status === 'pending_provider'
      ? `/client/tender/${tender.id}/offers`
      : `/client/track/${tender.id}`
    : null;

  return {
    tender,
    bids,
    bidCount: bids.length,
    countersPending: countersPending.length,
    loading: !!tender?.id && loading,
    offersPath,
    categoryLabel: tender ? emergencyCategoryLabel(tender.category) : '',
  };
}
