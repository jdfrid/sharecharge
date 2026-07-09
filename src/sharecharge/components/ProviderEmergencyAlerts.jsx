import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Card } from './ui/Card';
import { currency } from '../utils';

export function ProviderEmergencyAlerts({ alerts = [], onDismiss, onOpenBid }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={
            alert.kind === 'pending_confirm'
              ? '!border-[var(--sc-accent)]/30 !bg-[var(--sc-accent)]/[0.06]'
              : '!border-amber-200 !bg-amber-50/90'
          }
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                alert.kind === 'pending_confirm'
                  ? 'bg-[var(--sc-accent)]/15 text-[var(--sc-accent)]'
                  : 'bg-amber-500/15 text-amber-700'
              }`}
            >
              {alert.kind === 'pending_confirm' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-xs font-black ${
                  alert.kind === 'pending_confirm' ? 'text-[var(--sc-accent)]' : 'text-amber-800'
                }`}
              >
                {alert.kind === 'pending_confirm' ? 'לקוח בחר אותך — אשר או דחה' : 'קריאת חירום חדשה באזור'}
              </p>
              <p className="mt-1 font-black text-sc-text">{alert.categoryLabel}</p>
              <p className="mt-1 text-sm font-bold text-sc-muted">{alert.addressText}</p>
              {alert.problemDescription ? (
                <p className="mt-1 text-xs font-bold text-sc-text">{alert.problemDescription}</p>
              ) : null}
              {alert.phone ? (
                <p className="mt-1 text-xs font-black text-sc-text" dir="ltr">
                  {alert.phone}
                </p>
              ) : null}
              {alert.kind === 'pending_confirm' && alert.amount != null ? (
                <p className="mt-1 text-sm font-black text-[var(--sc-accent)]">{currency(alert.amount)}</p>
              ) : null}
              {alert.kind !== 'pending_confirm' ? (
                <p className="mt-1 text-xs font-bold text-sc-muted">
                  {alert.distanceKm != null ? `${alert.distanceKm} ק״מ ממך` : 'בטווח ההתראה'}
                  {alert.radiusKm ? ` · רדיוס ${alert.radiusKm} ק״מ` : ''}
                </p>
              ) : null}
              <div className="relative z-10 mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenBid?.(alert.requestId, alert.kind)}
                  className="min-h-[44px] touch-manipulation rounded-sc-sm bg-[var(--sc-accent)] px-4 py-2.5 text-sm font-black text-white shadow-sm"
                >
                  {alert.kind === 'pending_confirm' ? 'אשר / דחה' : 'הגש הצעת מחיר'}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss?.(alert.requestId)}
              className="rounded-full p-1 text-sc-muted"
              aria-label="סגור"
            >
              <X size={16} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
