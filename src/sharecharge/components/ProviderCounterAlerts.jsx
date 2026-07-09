import { MessageSquare, X } from 'lucide-react';
import { Card } from './ui/Card';
import { currency } from '../utils';

export function ProviderCounterAlerts({ alerts = [], onDismiss, onOpenTenders }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Card key={alert.id} className="!border-violet-200 !bg-violet-50/90">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700">
              <MessageSquare size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-violet-800">הצעה נגדית מהלקוח</p>
              <p className="mt-1 font-black text-sc-text">{alert.categoryLabel}</p>
              <p className="mt-1 text-sm font-bold text-sc-muted">{alert.addressText}</p>
              <p className="mt-2 text-sm font-black text-violet-900">
                לקוח מבקש: {currency(alert.counterTotal)} · {alert.counterEta} דק
              </p>
              <p className="mt-1 text-xs font-bold text-sc-muted">
                הצעתך: {currency(alert.yourTotal)} · {alert.yourEta} דק
              </p>
              {alert.message ? (
                <p className="mt-1 text-xs font-bold text-sc-text">{alert.message}</p>
              ) : null}
              <div className="relative z-10 mt-3">
                <button
                  type="button"
                  onClick={() => onOpenTenders?.(alert)}
                  className="min-h-[44px] w-full touch-manipulation rounded-sc-sm bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-sm"
                >
                  עדכן הצעה / הגב
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss?.(alert.bidId)}
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
