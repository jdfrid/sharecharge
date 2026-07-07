import { Link } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Card } from './ui/Card';

export function ProviderEmergencyAlerts({ alerts = [], onDismiss }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Card key={alert.requestId} className="!border-amber-200 !bg-amber-50/90">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-amber-800">קריאת חירום חדשה</p>
              <p className="mt-1 font-black text-sc-text">{alert.categoryLabel}</p>
              <p className="mt-1 text-sm font-bold text-sc-muted">{alert.addressText}</p>
              <p className="mt-1 text-xs font-bold text-sc-muted">
                {alert.distanceKm != null ? `${alert.distanceKm} ק״מ ממך` : 'באזור השירות שלך'}
              </p>
              <Link
                to="/provider/tenders"
                className="mt-2 inline-block text-xs font-black text-[var(--sc-accent)] underline"
              >
                הגש הצעה וזמן הגעה
              </Link>
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
