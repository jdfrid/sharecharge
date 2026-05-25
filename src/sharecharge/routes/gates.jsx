import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isPortalSessionReady, sanitizePortalSession } from '../auth/session';
import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { isSingleAppBuild, getShareChargeApp } from '../config/appConfig';

function usePortalGate(portal) {
  const [ready, setReady] = useState(() => {
    sanitizePortalSession(portal);
    return isPortalSessionReady(portal);
  });

  useEffect(() => {
    sanitizePortalSession(portal);
    setReady(isPortalSessionReady(portal));
  }, [portal]);

  if (isSingleAppBuild()) {
    const app = getShareChargeApp();
    const allowed =
      (app === 'client' && portal === SHARECHARGE_ROLE_KEYS.client) ||
      (app === 'provider' && portal === SHARECHARGE_ROLE_KEYS.provider) ||
      (app === 'ops' && portal === SHARECHARGE_ROLE_KEYS.system);
    if (!allowed) return 'blocked';
  }

  return ready ? 'open' : 'login';
}

export function ClientGate() {
  const gate = usePortalGate(SHARECHARGE_ROLE_KEYS.client);
  if (gate !== 'open') return <Navigate to="/client/entry" replace />;
  return <Outlet />;
}

export function ProviderGate() {
  const gate = usePortalGate(SHARECHARGE_ROLE_KEYS.provider);
  if (gate !== 'open') return <Navigate to="/provider/entry" replace />;
  return <Outlet />;
}

export function OpsGate() {
  const gate = usePortalGate(SHARECHARGE_ROLE_KEYS.system);
  if (gate !== 'open') return <Navigate to="/ops/entry" replace />;
  return <Outlet />;
}
