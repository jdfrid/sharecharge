import { useEffect, useState } from 'react';
import { AUTH_SESSION_EVENT, isPortalSessionReady, sanitizePortalSession } from '../auth/session';

export function usePortalAuthReady(portal) {
  const [ready, setReady] = useState(() => {
    sanitizePortalSession(portal);
    return isPortalSessionReady(portal);
  });

  useEffect(() => {
    const sync = () => {
      sanitizePortalSession(portal);
      setReady(isPortalSessionReady(portal));
    };
    sync();
    window.addEventListener(AUTH_SESSION_EVENT, sync);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, sync);
  }, [portal]);

  return ready;
}
