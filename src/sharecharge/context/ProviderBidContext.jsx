import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ProviderBidContext = createContext(null);

export function ProviderBidProvider({ children }) {
  const [bidRequestId, setBidRequestId] = useState(null);
  const [bidError, setBidError] = useState('');

  const openBid = useCallback((requestId) => {
    if (!requestId) return;
    setBidError('');
    setBidRequestId(requestId);
  }, []);

  const closeBid = useCallback(() => {
    setBidRequestId(null);
    setBidError('');
  }, []);

  const value = useMemo(
    () => ({
      bidRequestId,
      bidError,
      setBidError,
      openBid,
      closeBid,
    }),
    [bidRequestId, bidError, openBid, closeBid],
  );

  return <ProviderBidContext.Provider value={value}>{children}</ProviderBidContext.Provider>;
}

export function useProviderBid() {
  const ctx = useContext(ProviderBidContext);
  if (!ctx) {
    throw new Error('useProviderBid must be used within ProviderBidProvider');
  }
  return ctx;
}
