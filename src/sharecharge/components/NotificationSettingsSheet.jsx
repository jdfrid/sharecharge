import { useEffect, useState } from 'react';
import { BellOff, X } from 'lucide-react';
import {
  areNotificationsMuted,
  formatMuteRemaining,
  getNotificationsMutedUntil,
  MUTE_PRESETS,
  muteNotificationsFor,
  NOTIFICATION_MUTE_EVENT,
  unmuteNotifications,
} from '../utils/notificationMute';

export function NotificationSettingsSheet({ onClose }) {
  const [muted, setMuted] = useState(areNotificationsMuted());
  const [remaining, setRemaining] = useState(formatMuteRemaining());

  useEffect(() => {
    const sync = () => {
      setMuted(areNotificationsMuted());
      setRemaining(formatMuteRemaining());
    };
    sync();
    window.addEventListener(NOTIFICATION_MUTE_EVENT, sync);
    const timer = setInterval(sync, 30000);
    return () => {
      window.removeEventListener(NOTIFICATION_MUTE_EVENT, sync);
      clearInterval(timer);
    };
  }, []);

  const handleMute = (ms) => {
    muteNotificationsFor(ms);
    setMuted(true);
    setRemaining(formatMuteRemaining(getNotificationsMutedUntil()));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4" dir="rtl">
      <button type="button" className="absolute inset-0" aria-label="סגור" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-sc-border bg-white p-5 shadow-sc-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellOff size={20} className="text-[var(--sc-accent)]" />
            <h2 className="text-lg font-black text-sc-text">התראות</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sc-border"
            aria-label="סגור"
          >
            <X size={18} />
          </button>
        </div>

        {muted ? (
          <div className="mb-4 rounded-sc-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-black text-amber-900">התראות מושתקות</p>
            <p className="mt-1 text-xs font-bold text-amber-800">
              {remaining ? `נותרו ${remaining}` : 'מסתיים בקרוב'}
            </p>
            <button
              type="button"
              onClick={() => {
                unmuteNotifications();
                setMuted(false);
                setRemaining('');
              }}
              className="mt-3 rounded-full bg-amber-600 px-4 py-2 text-xs font-black text-white"
            >
              הפעל התראות
            </button>
          </div>
        ) : (
          <p className="mb-4 text-sm font-bold text-sc-muted">השתק התראות לזמן מוגדר:</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {MUTE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleMute(preset.ms)}
              className="rounded-sc-md border border-sc-border bg-sc-surface px-3 py-3 text-sm font-black text-sc-text hover:border-[var(--sc-accent)]"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-bold leading-5 text-sc-muted">
          ההשתקה חלה על התראות מכרזים, קריאות חירום ועדכוני הזמנות. התראות בתוך האפליקציה עדיין יוצגו.
        </p>
      </div>
    </div>
  );
}
