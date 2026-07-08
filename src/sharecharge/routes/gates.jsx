import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_SESSION_EVENT } from '../auth/session';
import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { getAppLoginPath, isSingleAppBuild, getShareChargeApp } from '../config/appConfig';
import { usePortalAuthReady } from '../hooks/usePortalAuthReady';
import { useShareCharge } from '../context/ShareChargeContext';

function usePortalGate(portal) {
  const ready = usePortalAuthReady(portal);

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
  const location = useLocation();
  const gate = usePortalGate(SHARECHARGE_ROLE_KEYS.client);
  if (gate !== 'open') {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/client/auth?return=${encodeURIComponent(returnTo)}`} replace />;
  }
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

export function SessionExpiryRedirect({ portal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { syncError } = useShareCharge();
  const ready = usePortalAuthReady(portal);
  const [dismissed, setDismissed] = useState(false);
  const sessionExpired = !!syncError?.includes('הסשן פג');

  useEffect(() => {
    setDismissed(false);
  }, [location.pathname, ready, sessionExpired]);

  useEffect(() => {
    const onAuthChange = () => setDismissed(false);
    window.addEventListener(AUTH_SESSION_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, onAuthChange);
  }, []);

  if (!sessionExpired || ready || dismissed) return null;
  if (location.pathname.includes('/entry') || location.pathname.includes('/auth')) return null;

  return (
    <div className="sc-sync-bar sticky top-0 z-50 flex flex-wrap items-center justify-center gap-2 border-b border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">
      <span>הסשן פג — יש להתחבר מחדש עם OTP</span>
      <button
        type="button"
        onClick={() => navigate(getAppLoginPath(portal))}
        className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-black text-white"
      >
        התחברות עם OTP
      </button>
      <button type="button" onClick={() => setDismissed(true)} className="text-[10px] underline opacity-70">
        מאוחר יותר
      </button>
    </div>
  );
}
