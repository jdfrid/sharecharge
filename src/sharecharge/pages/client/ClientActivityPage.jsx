import { useMemo } from 'react';
import {
  Calendar,
  Clock,
  CreditCard,
} from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { resolveDriverIdForSession } from '../../auth/identity';
import { currency } from '../../utils';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';

export function ClientActivityPage() {
  const { state, markOnWay, driverStartCharge, openDispute } = useShareCharge();
  const myDriverId = useMemo(() => resolveDriverIdForSession(state), [state.users]);
  const driverBookings = state.bookings.filter((item) => item.driverId === myDriverId);
  const activeBooking = driverBookings.find((item) => !['completed', 'rejected', 'cancelled'].includes(item.status));
  const completedBookings = driverBookings.filter((item) => item.status === 'completed');
  const stationFor = (booking) => state.stations.find((station) => station.id === booking.stationId);

  return (
    <>
      {activeBooking && (
        <Card className="border-teal-100 bg-teal-50/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-teal-800">הזמנה פעילה</p>
              <h3 className="mt-1 text-xl font-black">{stationFor(activeBooking)?.name}</h3>
              <p className="mt-1 text-sm text-sc-muted">{stationFor(activeBooking)?.address}</p>
            </div>
            <StatusPill status={activeBooking.status} />
          </div>

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
              onClick={() => markOnWay(activeBooking.id)}
              className="mt-4 w-full rounded-sc-sm bg-sc-text py-3 font-black text-white"
            >
              אני בדרך — צור OTP
            </button>
          )}

          {activeBooking.status === 'on_way' && (
            <div className="mt-4 rounded-sc-md bg-sc-text p-5 text-center text-white">
              <p className="text-sm text-white/70">הציגו לספק</p>
              <p className="mt-2 font-mono text-5xl font-black tracking-[0.35em] text-teal-300">{activeBooking.otp}</p>
              <p className="mt-3 text-xs text-white/55">הספק מאמת לפני התחלת טעינה</p>
            </div>
          )}

          {activeBooking.status === 'otp_verified' && (
            <button
              type="button"
              onClick={() => driverStartCharge(activeBooking.id)}
              className="mt-4 w-full rounded-sc-sm bg-[var(--sc-accent)] py-3 font-black text-white"
            >
              אשר התחלת טעינה
            </button>
          )}

          {activeBooking.status === 'charging' && (
            <div className="mt-4 rounded-sc-md bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-black">טעינה פעילה</p>
                <p className="max-w-[55%] text-right text-xs font-bold text-teal-700">הספק יסיים ויחייב בדמו</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
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
              <div key={booking.id} className="flex items-center justify-between rounded-sc-sm bg-slate-50 p-3 text-sm">
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
