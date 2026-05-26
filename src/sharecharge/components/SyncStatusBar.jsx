import { Cloud, CloudOff, Loader2, Unplug } from 'lucide-react';
import { useShareCharge } from '../context/ShareChargeContext';
import { loadAuthSessions } from '../auth/session';
import { getStoredToken } from '../data/sharechargeApi';
import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { getShareChargeApp, isSingleAppBuild } from '../config/appConfig';

const portalForApp = {
  client: SHARECHARGE_ROLE_KEYS.client,
  provider: SHARECHARGE_ROLE_KEYS.provider,
  ops: SHARECHARGE_ROLE_KEYS.system,
};

function activePortal() {
  if (isSingleAppBuild() && portalForApp[getShareChargeApp()]) return portalForApp[getShareChargeApp()];
  return SHARECHARGE_ROLE_KEYS.client;
}

export function SyncStatusBar() {
  const { repositoryMode, loading, syncError } = useShareCharge();
  const portal = activePortal();
  const session = loadAuthSessions()[portal];
  const offlineDemo = !!session?.offlineDemo;
  const hasApiSession = !!(session?.token || getStoredToken(portal));

  if (repositoryMode !== 'api' || offlineDemo) {
    return (
      <div className="sc-sync-bar flex items-center justify-center gap-2 border-b border-amber-100 bg-amber-50/95 px-4 py-2 text-[11px] font-bold leading-5 text-amber-800">
        <Unplug size={14} />
        מצב דמו מקומי — אין סנכרון בין אפליקציות. הפעילו שרver והתחברו מחדש (לא דemo).
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

  if (syncError) {
    return (
      <div className="sc-sync-bar flex items-center justify-center gap-2 border-b border-red-100 bg-red-50/90 px-4 py-2 text-xs font-bold text-red-600">
        <CloudOff size={14} />
        {syncError} — ודאו שה-API פועל
      </div>
    );
  }

  if (!hasApiSession) {
    return (
      <div className="sc-sync-bar flex items-center justify-center gap-2 border-b border-amber-100 bg-amber-50/95 px-4 py-2 text-[11px] font-bold leading-5 text-amber-800">
        <Cloud size={12} />
        מצב API — התחברו עם OTP (ודאו ש-/api/health מחזיר JSON)
      </div>
    );
  }

  return (
    <div className="sc-sync-bar flex items-center justify-center gap-2 border-b border-[var(--sc-accent)]/10 bg-[var(--sc-accent)]/5 px-4 py-1.5 text-[10px] font-black text-[var(--sc-accent)]">
      <Cloud size={12} />
      מחובר לשרver · הזמנות משותפות לכל האפליקציות
    </div>
  );
}
