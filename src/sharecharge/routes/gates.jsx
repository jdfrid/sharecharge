import { Navigate, Outlet } from 'react-router-dom';
import { loadAuthSessions } from '../auth/session';
import { getPreferredRepositoryMode } from '../data/apiRepository.stub';
import { getStoredToken } from '../data/sharechargeApi';
import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { isSingleAppBuild, SHARECHARGE_APP } from '../config/appConfig';

function gateBlocked(portal) {
  if (isSingleAppBuild) {
    const allowed =
      (SHARECHARGE_APP === 'client' && portal === SHARECHARGE_ROLE_KEYS.client) ||
      (SHARECHARGE_APP === 'provider' && portal === SHARECHARGE_ROLE_KEYS.provider) ||
      (SHARECHARGE_APP === 'ops' && portal === SHARECHARGE_ROLE_KEYS.system);
    if (!allowed) return true;
  }

  const s = loadAuthSessions();
  if (!s[portal]?.verified) return true;

  if (getPreferredRepositoryMode() === 'api' && !getStoredToken(portal) && !s[portal]?.token) {
    return true;
  }
  return false;
}

export function ClientGate() {
  if (gateBlocked(SHARECHARGE_ROLE_KEYS.client)) {
    return <Navigate to="/client/entry" replace />;
  }
  return <Outlet />;
}

export function ProviderGate() {
  if (gateBlocked(SHARECHARGE_ROLE_KEYS.provider)) {
    return <Navigate to="/provider/entry" replace />;
  }
  return <Outlet />;
}

export function OpsGate() {
  if (gateBlocked(SHARECHARGE_ROLE_KEYS.system)) {
    return <Navigate to="/ops/entry" replace />;
  }
  return <Outlet />;
}
