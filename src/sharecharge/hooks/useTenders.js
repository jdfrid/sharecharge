import { useCallback, useMemo } from 'react';
import { useShareCharge } from '../context/ShareChargeContext';
import { sharechargeApi } from '../data/sharechargeApi';
import { SHARECHARGE_ROLE_KEYS } from '../constants';

export function useTenders() {
  const ctx = useShareCharge();
  const requests = ctx.state.serviceRequests || [];
  const bids = ctx.state.serviceBids || [];

  const openRequests = useMemo(() => requests.filter((r) => r.status === 'open'), [requests]);

  const bidsFor = useCallback(
    (requestId) => bids.filter((b) => b.requestId === requestId && b.status !== 'rejected'),
    [bids],
  );

  const fetchBids = useCallback(
    (requestId) => sharechargeApi.fetchTenderBids(SHARECHARGE_ROLE_KEYS.client, requestId),
    [],
  );

  const fetchOpenForProvider = useCallback(
    () => sharechargeApi.fetchOpenTenders(SHARECHARGE_ROLE_KEYS.provider),
    [],
  );

  return {
    requests,
    bids,
    openRequests,
    bidsFor,
    createTender: ctx.createTender,
    acceptTenderBid: ctx.acceptTenderBid,
    fetchBids,
    fetchOpenForProvider,
    refresh: ctx.refreshFromApi,
  };
}
