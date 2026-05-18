import { Navigate, Outlet } from 'react-router-dom';
import { loadAuthSessions } from '../auth/session';
import { SHARECHARGE_ROLE_KEYS } from '../constants';

export function ClientGate() {
  const s = loadAuthSessions();
  if (!s[SHARECHARGE_ROLE_KEYS.client]?.verified) return <Navigate to="/client/entry" replace />;
  return <Outlet />;
}

export function ProviderGate() {
  const s = loadAuthSessions();
  if (!s[SHARECHARGE_ROLE_KEYS.provider]?.verified) return <Navigate to="/provider/entry" replace />;
  return <Outlet />;
}

export function OpsGate() {
  const s = loadAuthSessions();
  if (!s[SHARECHARGE_ROLE_KEYS.system]?.verified) return <Navigate to="/ops/entry" replace />;
  return <Outlet />;
}
