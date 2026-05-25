import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useShareCharge } from '../context/ShareChargeContext';

export function SyncStatusBar() {
  const { repositoryMode, loading, syncError } = useShareCharge();

  if (repositoryMode !== 'api') return null;

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

  return (
    <div className="sc-sync-bar flex items-center justify-center gap-2 border-b border-[var(--sc-accent)]/10 bg-[var(--sc-accent)]/5 px-4 py-1.5 text-[10px] font-black text-[var(--sc-accent)]">
      <Cloud size={12} />
      מחובר לשרת · נתונים מסונכרנים
    </div>
  );
}
