import { useState } from 'react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { shortTime } from '../../utils';
import { userDisplay } from '../../auth/identity';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';

export function ProviderOrdersPage() {
  const { state, approveBooking, rejectBooking, verifyOtp, finishCharge } = useShareCharge();
  const { hosts, activeHostId, setActiveHostId, activeHost } = useSyncedProviderHost(state);
  const hostBookings = state.bookings.filter((booking) => booking.hostId === activeHost?.id);
  const stationFor = (booking) => state.stations.find((station) => station.id === booking.stationId);
  const driverFor = (booking) => state.users.find((u) => u.id === booking.driverId);
  const [otpInputs, setOtpInputs] = useState({});
  const [finishKwh, setFinishKwh] = useState(18.4);

  return (
    <>
      <Card>
        <label className="mb-3 block text-sm font-bold text-sc-muted">
          ספק לצורך סינון הזמנות
          <select
            value={activeHost?.id || ''}
            onChange={(e) => setActiveHostId(e.target.value)}
            className="mt-2 w-full rounded-sc-sm bg-slate-100 px-3 py-3 font-black outline-none"
          >
            {hosts.map((host) => (
              <option key={host.id} value={host.id}>
                {host.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card>
        <h3 className="mb-3 font-black">בקשות ותור אישור</h3>
        {hostBookings.length === 0 ? (
          <p className="rounded-sc-sm bg-slate-50 p-4 text-sm text-sc-muted">אין בקשות לספק זה.</p>
        ) : (
          <div className="space-y-3">
            {hostBookings.map((booking) => (
              <div key={booking.id} className="rounded-sc-md bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black">
                      {stationFor(booking)?.name || 'עמדה'} · {booking.startTime}
                    </p>
                    <p className="mt-1 text-sm text-sc-muted">
                      {(() => {
                        const d = userDisplay(driverFor(booking));
                        return `${d.name} · ${d.email || booking.driverEmailSnapshot || '—'} · ${booking.durationHours} שעות · ${shortTime(booking.createdAt)}`;
                      })()}
                    </p>
                  </div>
                  <StatusPill status={booking.status} />
                </div>

                {booking.status === 'pending' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => approveBooking(booking.id)}
                      className="rounded-sc-sm bg-[var(--sc-accent)] py-3 font-black text-white"
                    >
                      אשר
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectBooking(booking.id)}
                      className="rounded-sc-sm bg-white py-3 font-black text-red-600 ring-1 ring-red-100"
                    >
                      דחה
                    </button>
                  </div>
                )}

                {booking.status === 'on_way' && (
                  <div className="mt-3">
                    <label className="text-sm font-bold text-sc-muted">
                      הזן OTP מהלקוח
                      <input
                        value={otpInputs[booking.id] || ''}
                        onChange={(e) => setOtpInputs({ ...otpInputs, [booking.id]: e.target.value })}
                        className="mt-2 w-full rounded-sc-sm bg-white px-3 py-3 text-center font-mono text-2xl font-black tracking-[0.25em] outline-none ring-1 ring-slate-100"
                        maxLength={4}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => verifyOtp(booking.id, otpInputs[booking.id] || '')}
                      className="mt-3 w-full rounded-sc-sm bg-sc-text py-3 font-black text-white"
                    >
                      אמת OTP
                    </button>
                  </div>
                )}

                {booking.status === 'charging' && (
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={finishKwh}
                      onChange={(e) => setFinishKwh(Number(e.target.value))}
                      className="rounded-sc-sm bg-white px-3 py-3 font-black outline-none ring-1 ring-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => finishCharge(booking.id, finishKwh)}
                      className="rounded-sc-sm bg-[var(--sc-accent)] px-4 py-3 font-black text-white"
                    >
                      סיים
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
