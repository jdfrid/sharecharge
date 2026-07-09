import { useNavigate, useLocation } from 'react-router-dom';
import { Cloud, CloudOff, Loader2, LogIn, Unplug } from 'lucide-react';
import { useShareCharge } from '../context/ShareChargeContext';
import { resolveApiPortal } from '../auth/portal';
import { loadAuthSessions } from '../auth/session';
import { getAuthToken } from '../data/sharechargeApi';
import { getAppLoginPath } from '../config/appConfig';
import { usePortalAuthReady } from '../hooks/usePortalAuthReady';

function LoginButton({ portal, label = 'התחברות עם OTP' }) {
  const navigate = useNavigate();
  const loginPath = getAppLoginPath(portal);

  return (
    <button
      type="button"
      onClick={() => navigate(loginPath)}
      className="inline-flex items-center gap-1 rounded-full bg-[var(--sc-accent)] px-3 py-1 text-[10px] font-black text-white"
    >
      <LogIn size={12} />
      {label}
    </button>
  );
}

export function SyncStatusBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { repositoryMode, loading, syncError } = useShareCharge();

  if (location.pathname.startsWith('/ops/console')) return null;
  const portal = resolveApiPortal(location);
  const session = loadAuthSessions()[portal];
  const offlineDemo = !!session?.offlineDemo;
  const authReady = usePortalAuthReady(portal);
  const hasApiSession = authReady && !!(session?.token || getAuthToken(portal));
  const sessionExpired = !!syncError?.includes('הסשן פג');
  const loginPath = getAppLoginPath(portal);
  const onLoginPage = location.pathname.includes('/entry') || location.pathname.includes('/auth');

  if (repositoryMode !== 'api' || offlineDemo) {
    return (
      <div className="sc-sync-bar flex flex-wrap items-center justify-center gap-2 border-b border-amber-100 bg-amber-50/95 px-4 py-2 text-[11px] font-bold leading-5 text-amber-800">
        <Unplug size={14} />
        מצב דemo מקומי — אין סנכרון בין אפליקציות. הפעילו שרver והתחברו מחדש (לא דemo).
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sc-sync-bar flex items-center justify-center gap-2 border-b border-sc-border/60 bg-white/80 px-4 py-2 text-xs font-bold text-sc-muted backdrop-blur-md">
        <Loader2 size={14} className="animate-spin text-[var(--sc-accent)]" />
        מסנכרן נתונים מהשרת…
      </div>
    );
  }

  if (sessionExpired && !onLoginPage) {
    return (
      <div className="sc-sync-bar flex flex-wrap items-center justify-center gap-2 border-b border-red-100 bg-red-50/90 px-4 py-2 text-xs font-bold text-red-600">
        <CloudOff size={14} />
        {syncError}
        <LoginButton portal={portal} />
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="sc-sync-bar flex flex-wrap items-center justify-center gap-2 border-b border-red-100 bg-red-50/90 px-4 py-2 text-xs font-bold text-red-600">
        <CloudOff size={14} />
        {syncError}
        {!onLoginPage ? (
          <button
            type="button"
            onClick={() => navigate(loginPath)}
            className="rounded-full border border-red-300 px-2 py-0.5 text-[10px] font-black"
          >
            נסו התחברות
          </button>
        ) : null}
      </div>
    );
  }

  if (!hasApiSession && !onLoginPage) {
    return (
      <div className="sc-sync-bar flex flex-wrap items-center justify-center gap-2 border-b border-amber-100 bg-amber-50/95 px-4 py-2 text-[11px] font-bold leading-5 text-amber-800">
        <Cloud size={12} />
        לא מחוברים — התחברו עם OTP לסנכרון הזמנות
        <LoginButton portal={portal} />
      </div>
    );
  }

  if (!hasApiSession && onLoginPage) {
    return null;
  }

  return (
    <div className="sc-sync-bar flex items-center justify-center gap-2 border-b border-[var(--sc-accent)]/10 bg-[var(--sc-accent)]/5 px-4 py-1.5 text-[10px] font-black text-[var(--sc-accent)]">
      <Cloud size={12} />
      מחובר לשרver · הזמנות משותפות לכל האפליקציות
    </div>
  );
}
