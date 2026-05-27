import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  CreditCard,
} from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { getPreferredRepositoryMode } from '../../data/apiRepository.stub';
import { useBookingLocationWatch } from '../../hooks/useBookingLocationWatch';
import { resolveDriverIdForSession } from '../../auth/identity';
import { currency } from '../../utils';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';

export function ClientActivityPage() {
  const { state, markOnWay, driverStartCharge, openDispute } = useShareCharge();
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const myDriverId = useMemo(() => resolveDriverIdForSession(state), [state.users]);
  const driverBookings = state.bookings.filter((item) => item.driverId === myDriverId);
  const activeBooking = driverBookings.find((item) => !['completed', 'rejected', 'cancelled'].includes(item.status));
  const completedBookings = driverBookings.filter((item) => item.status === 'completed');
  const stationFor = (booking) => state.stations.find((station) => station.id === booking.stationId);
  const activeStation = activeBooking ? stationFor(activeBooking) : null;
  const apiMode = getPreferredRepositoryMode() === 'api';

  useBookingLocationWatch(activeBooking, activeStation, apiMode);

  const runAction = async (fn) => {
    setBusy(true);
    setActionError('');
    try {
      await fn();
    } catch (err) {
      setActionError(err?.message || 'הפעולה נכשלה — בדקו חיבור לשרver');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {activeBooking && (
        <Card className="border-[var(--sc-accent-2)]/25 bg-[var(--sc-accent-2)]/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[var(--sc-accent-2)]">הזמנה פעילה</p>
              <h3 className="mt-1 text-xl font-black">{stationFor(activeBooking)?.name}</h3>
              <p className="mt-1 text-sm text-sc-muted">{stationFor(activeBooking)?.address}</p>
              {activeStation?.lat ? (
                <p className="mt-1 text-[10px] font-bold text-sc-muted" dir="ltr">
                  📍 {Number(activeStation.lat).toFixed(5)}, {Number(activeStation.lng).toFixed(5)}
                </p>
              ) : null}
            </div>
            <StatusPill status={activeBooking.status} />
          </div>

          {activeBooking.dwellExceeded ? (
            <div className="mt-3 flex items-center gap-2 rounded-sc-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              <AlertTriangle size={16} />
              חרגתם מזמן השהייה שהוגדר — יש לעזוב את העמדה או לעדכן את הספק.
            </div>
          ) : null}

          {activeBooking.checkInAt && !activeBooking.dwellExceeded ? (
            <p className="mt-2 text-xs font-bold text-[var(--sc-accent-2)]">מיקום אומת ליד העמדה · מעקב GPS פעיל</p>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-sc-sm bg-white p-3 shadow-sm">
              <Clock className="mx-auto text-[var(--sc-accent)]" size={18} />
              <p className="mt-1 font-black">{activeBooking.startTime}</p>
              <p className="text-sc-muted">שעה</p>
            </div>
            <div className="rounded-sc-sm bg-white p-3 shadow-sm">
              <Calendar className="mx-auto text-[var(--sc-accent)]" size={18} />
              <p className="mt-1 font-black">{activeBooking.durationHours} שעות</p>
              <p className="text-sc-muted">משך</p>
            </div>
            <div className="rounded-sc-sm bg-white p-3 shadow-sm">
              <CreditCard className="mx-auto text-[var(--sc-accent)]" size={18} />
              <p className="mt-1 font-black">{currency(activeBooking.amount || activeBooking.durationHours * 12)}</p>
              <p className="text-sc-muted">הערכה</p>
            </div>
          </div>

          {activeBooking.status === 'approved' && (
            <button
              type="button"
              onClick={() => runAction(() => markOnWay(activeBooking.id))}
              disabled={busy}
              className="mt-4 w-full rounded-sc-md bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 py-3.5 font-black text-white shadow-sc-card disabled:opacity-60"
            >
              {busy ? 'שולח…' : 'אני בדרך — צור OTP'}
            </button>
          )}

          {activeBooking.status === 'on_way' && (
            <div className="mt-4 rounded-sc-lg bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 text-center text-white shadow-sc-card ring-1 ring-white/10">
              <p className="text-sm text-white/70">הציגו לספק</p>
              <p className="mt-2 font-mono text-5xl font-black tracking-[0.35em] text-[var(--sc-accent-2)]">{activeBooking.otp}</p>
              <p className="mt-3 text-xs text-white/55">הספק מאמת את הקוד באפליקציית הספק — אחרי אימות תופיע «אשר התחלת טעינה»</p>
            </div>
          )}

          {activeBooking.status === 'otp_verified' && (
            <button
              type="button"
              onClick={() => runAction(() => driverStartCharge(activeBooking.id))}
              disabled={busy}
              className="mt-4 w-full rounded-sc-sm bg-[var(--sc-accent)] py-3 font-black text-white disabled:opacity-60"
            >
              {busy ? '…' : 'אשר התחלת טעינה'}
            </button>
          )}

          {activeBooking.status === 'charging' && (
            <div className="mt-4 rounded-sc-md bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-black">טעינה פעילה</p>
                <p className="max-w-[55%] text-right text-xs font-bold text-[var(--sc-accent-2)]">
                  הספק יסיים את הטעינה ויחייב לפי מחירון
                </p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-sc-surface ring-1 ring-sc-border">
                <div className="h-full w-2/3 rounded-full bg-[var(--sc-accent)]" />
              </div>
            </div>
          )}

          {['approved', 'on_way', 'otp_verified', 'charging'].includes(activeBooking.status) && (
            <button
              type="button"
              onClick={() => openDispute(activeBooking.id, 'הנהג מבקש בדיקה')}
              className="mt-3 w-full rounded-sc-sm border border-amber-200 bg-white py-3 font-black text-amber-800"
            >
              פנייה למנהל מערכת
            </button>
          )}
        </Card>
      )}

      {actionError && (
        <Card>
          <p className="text-center text-sm font-bold text-red-600">{actionError}</p>
        </Card>
      )}

      {!activeBooking && (
        <Card>
          <p className="text-center text-sm font-bold text-sc-muted">אין הזמנה פעילה. חזרו לחיפוש והזמינו עמדה.</p>
        </Card>
      )}

      {completedBookings.length > 0 && (
        <Card>
          <h3 className="mb-3 font-black">היסטוריה</h3>
          <div className="space-y-2">
            {completedBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between rounded-sc-sm border border-sc-border bg-sc-surface p-3 text-sm">
                <span>{stationFor(booking)?.name}</span>
                <strong>{currency(booking.amount)}</strong>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
