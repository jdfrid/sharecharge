import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShareCharge } from '../context/ShareChargeContext';
import { sharechargeApi } from '../data/sharechargeApi';
import { SHARECHARGE_ROLE_KEYS } from '../constants';

function bidTimestamp(bid) {
  return new Date(bid?.updatedAt || bid?.createdAt || 0).getTime();
}

/** Union API + state bids by id; prefer API when timestamps tie or missing. */
function mergeBids(apiBids = [], stateBids = []) {
  const byId = new Map();
  for (const bid of stateBids) {
    if (bid?.id) byId.set(bid.id, bid);
  }
  for (const bid of apiBids) {
    if (!bid?.id) continue;
    const existing = byId.get(bid.id);
    if (!existing || bidTimestamp(bid) >= bidTimestamp(existing)) {
      byId.set(bid.id, bid);
    }
  }
  return [...byId.values()];
}

/** Poll GET /tenders/:id/bids — merge with /ops/state serviceBids (union by id). */
export function useTenderBidSnapshot(requestId) {
  const { repositoryMode, state, syncTenderSnapshot, refreshFromApi } = useShareCharge();
  const apiMode = repositoryMode === 'api';
  const [snapshot, setSnapshot] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const lastSnapshotRef = useRef(null);

  const bidsFromState = useMemo(
    () =>
      (state.serviceBids || []).filter(
        (bid) => bid.requestId === requestId && bid.status !== 'rejected',
      ),
    [state.serviceBids, requestId],
  );

  const fetchSnapshot = useCallback(async () => {
    if (!requestId || !apiMode) return null;
    try {
      const data = await sharechargeApi.fetchTenderBids(SHARECHARGE_ROLE_KEYS.client, requestId);
      lastSnapshotRef.current = data;
      setSnapshot(data);
      setSyncError(null);
      syncTenderSnapshot?.(data);
      return data;
    } catch (err) {
      console.error('Tender bid sync failed', err);
      setSyncError(err?.message || 'Tender bid sync failed');
      setSnapshot((prev) => prev ?? lastSnapshotRef.current);
      refreshFromApi?.(SHARECHARGE_ROLE_KEYS.client).catch((refreshErr) => {
        console.error('Fallback state refresh failed', refreshErr);
      });
      return null;
    }
  }, [requestId, apiMode, syncTenderSnapshot, refreshFromApi]);

  useEffect(() => {
    if (!requestId || !apiMode) return undefined;
    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, 3000);
    return () => clearInterval(timer);
  }, [requestId, apiMode, fetchSnapshot]);

  useEffect(() => {
    if (!requestId || !apiMode) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchSnapshot();
    };
    const onFocus = () => fetchSnapshot();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [requestId, apiMode, fetchSnapshot]);

  const request = useMemo(
    () => snapshot?.request || state.serviceRequests?.find((item) => item.id === requestId) || null,
    [state.serviceRequests, requestId, snapshot?.request],
  );

  const mergedBids = useMemo(() => {
    if (!apiMode) return bidsFromState;
    return mergeBids(snapshot?.bids, bidsFromState);
  }, [apiMode, snapshot?.bids, bidsFromState]);

  const bids = useMemo(
    () => mergedBids.filter((item) => item.status === 'pending'),
    [mergedBids],
  );

  const countersPending = useMemo(() => bids.filter((bid) => bid.driverCounterAt), [bids]);

  return {
    request,
    bids,
    countersPending,
    reload: fetchSnapshot,
    syncError,
    loading: !!requestId && !request && apiMode && !snapshot,
  };
}

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
