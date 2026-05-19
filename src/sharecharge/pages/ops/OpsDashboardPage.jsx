import { useState } from 'react';
import {
  AlertTriangle,
  CreditCard,
  FileText,
  Gauge,
  PlusCircle,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  UserCheck,
  Ban,
  XCircle,
} from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { currency, shortTime } from '../../utils';
import { Card } from '../../components/ui/Card';

export function OpsDashboardPage() {
  const { state, addHost, addDriver, addStation, resolveDispute, toggleBlockUser, setCommission, reset } = useShareCharge();
  const hosts = state.users.filter((user) => user.role === 'host');
  const [hostForm, setHostForm] = useState({ name: '', email: '' });
  const [driverForm, setDriverForm] = useState({ name: '', email: '' });
  const [stationForm, setStationForm] = useState({
    name: '',
    address: '',
    hostId: hosts[0]?.id || 'host-1',
    plug: 'Type 2',
    power: 22,
    pricePerKwh: 1.35,
    distance: 1,
    lat: 32.08,
    lng: 34.78,
    termsText: '',
  });

  const totalVolume = state.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const platformFees = state.transactions.reduce((sum, tx) => sum + tx.platformFee, 0);
  const hostPayouts = state.transactions.reduce((sum, tx) => sum + tx.hostShare, 0);
  const totalKwh = state.transactions.reduce((sum, tx) => sum + tx.kwh, 0);
  const openDisputes = state.disputes.filter((item) => item.status === 'open');
  const completedBookings = state.bookings.filter((booking) => booking.status === 'completed');
  const customerHistory = state.users
    .filter((user) => user.role === 'driver')
    .map((user) => {
      const userBookings = state.bookings.filter((booking) => booking.driverId === user.id);
      const userTransactions = state.transactions.filter((tx) => tx.driverId === user.id);
      return {
        ...user,
        bookingsCount: userBookings.length,
        completedCount: userBookings.filter((booking) => booking.status === 'completed').length,
        totalSpend: userTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        lastActivity: userBookings[0]?.createdAt,
      };
    });
  const revenueByStation = state.stations
    .map((station) => {
      const stationTransactions = state.transactions.filter((tx) => tx.stationId === station.id);
      return {
        station,
        volume: stationTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        platformFees: stationTransactions.reduce((sum, tx) => sum + tx.platformFee, 0),
        count: stationTransactions.length,
      };
    })
    .sort((a, b) => b.volume - a.volume);

  const handleAddStation = (e) => {
    e.preventDefault();
    if (!stationForm.name.trim() || !stationForm.address.trim()) return;
    addStation(stationForm);
    setStationForm({
      name: '',
      address: '',
      hostId: stationForm.hostId,
      plug: 'Type 2',
      power: 22,
      pricePerKwh: 1.35,
      distance: 1,
      lat: stationForm.lat,
      lng: stationForm.lng,
      termsText: '',
    });
  };

  const handleAddHost = (e) => {
    e.preventDefault();
    if (!hostForm.name.trim() || !hostForm.email.includes('@')) return;
    addHost(hostForm);
    setHostForm({ name: '', email: '' });
  };

  const handleAddDriver = (e) => {
    e.preventDefault();
    if (!driverForm.name.trim() || !driverForm.email.includes('@')) return;
    addDriver(driverForm);
    setDriverForm({ name: '', email: '' });
  };

  return (
    <>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-sc-sm border border-sc-border bg-white px-3 py-2 text-xs font-black text-sc-text shadow-sm"
        >
          <RefreshCw size={16} />
          איפוס נתונים
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-s-4 border-[var(--sc-accent-2)] bg-white">
          <CreditCard className="text-[var(--sc-accent-2)]" size={23} />
          <p className="mt-3 text-2xl font-black text-sc-text">{currency(totalVolume)}</p>
          <p className="text-xs text-sc-muted">מחזור עסקאות</p>
        </Card>
        <Card className="border-s-4 border-[var(--sc-accent)] bg-white">
          <Gauge className="text-[var(--sc-accent)]" size={23} />
          <p className="mt-3 text-2xl font-black text-sc-text">{currency(platformFees)}</p>
          <p className="text-xs text-sc-muted">עמלות מיזם</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black text-sc-text">
          <UserCheck size={19} className="text-[var(--sc-accent)]" /> הוספת ספק
        </h3>
        <form onSubmit={handleAddHost} className="space-y-3">
          <label className="text-sm font-bold text-sc-muted">
            שם ספק
            <input
              value={hostForm.name}
              onChange={(e) => setHostForm({ ...hostForm, name: e.target.value })}
              className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
            />
          </label>
          <label className="text-sm font-bold text-sc-muted">
            מייל ספק
            <input
              value={hostForm.email}
              onChange={(e) => setHostForm({ ...hostForm, email: e.target.value })}
              className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 text-left font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              dir="ltr"
              inputMode="email"
            />
          </label>
          <button type="submit" className="w-full rounded-sc-sm bg-[var(--sc-accent)] py-3 font-black text-white">
            הוסף ספק
          </button>
        </form>
        <div className="mt-3 space-y-2">
          {hosts.map((host) => (
            <div key={host.id} className="flex items-center justify-between rounded-sc-sm border border-sc-border bg-sc-surface p-3 text-sm">
              <div>
                <p className="font-black">{host.name}</p>
                <p className="text-xs text-sc-muted">{host.email || ''}</p>
              </div>
              <span className="rounded-full bg-[var(--sc-accent-2)]/12 px-3 py-1 text-xs font-black text-[var(--sc-accent-2)]">
                {state.stations.filter((station) => station.hostId === host.id).length} עמדות
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black">
          <UserCheck size={19} className="text-[var(--sc-accent)]" /> הוספת לקוח
        </h3>
        <form onSubmit={handleAddDriver} className="space-y-3">
          <label className="text-sm font-bold text-sc-muted">
            שם לקוח
            <input
              value={driverForm.name}
              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
              className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
            />
          </label>
          <label className="text-sm font-bold text-sc-muted">
            מייל לקוח
            <input
              value={driverForm.email}
              onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
              className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 text-left font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              dir="ltr"
              inputMode="email"
            />
          </label>
          <button type="submit" className="w-full rounded-sc-sm bg-[var(--sc-accent-2)] py-3 font-black text-white shadow-sm">
            הוסף לקוח
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black">
          <PlusCircle size={19} className="text-[var(--sc-accent)]" /> הוספת עמדה
        </h3>
        <form onSubmit={handleAddStation} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm font-bold text-sc-muted">
              שם עמדה
              <input
                value={stationForm.name}
                onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              />
            </label>
            <label className="col-span-2 text-sm font-bold text-sc-muted">
              כתובת
              <input
                value={stationForm.address}
                onChange={(e) => setStationForm({ ...stationForm, address: e.target.value })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              />
            </label>
            <label className="text-sm font-bold text-sc-muted">
              ספק
              <select
                value={stationForm.hostId}
                onChange={(e) => setStationForm({ ...stationForm, hostId: e.target.value })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              >
                {hosts.map((host) => (
                  <option key={host.id} value={host.id}>
                    {host.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-sc-muted">
              שקע
              <select
                value={stationForm.plug}
                onChange={(e) => setStationForm({ ...stationForm, plug: e.target.value })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              >
                <option>Type 2</option>
                <option>CCS</option>
                <option>CHAdeMO</option>
              </select>
            </label>
            <label className="text-sm font-bold text-sc-muted">
              kW
              <input
                type="number"
                value={stationForm.power}
                onChange={(e) => setStationForm({ ...stationForm, power: Number(e.target.value) })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              />
            </label>
            <label className="text-sm font-bold text-sc-muted">
              ₪/kWh
              <input
                type="number"
                step="0.05"
                value={stationForm.pricePerKwh}
                onChange={(e) => setStationForm({ ...stationForm, pricePerKwh: Number(e.target.value) })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              />
            </label>
            <label className="text-sm font-bold text-sc-muted">
              מרחק מדומה
              <input
                type="number"
                step="0.1"
                value={stationForm.distance}
                onChange={(e) => setStationForm({ ...stationForm, distance: Number(e.target.value) })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              />
            </label>
            <label className="text-sm font-bold text-sc-muted">
              lat
              <input
                type="number"
                step="0.0001"
                value={stationForm.lat}
                onChange={(e) => setStationForm({ ...stationForm, lat: Number(e.target.value) })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
                dir="ltr"
              />
            </label>
            <label className="text-sm font-bold text-sc-muted">
              lng
              <input
                type="number"
                step="0.0001"
                value={stationForm.lng}
                onChange={(e) => setStationForm({ ...stationForm, lng: Number(e.target.value) })}
                className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
                dir="ltr"
              />
            </label>
            <label className="col-span-2 text-sm font-bold text-sc-muted">
              תנאים (טקסט חופשי)
              <textarea
                value={stationForm.termsText}
                onChange={(e) => setStationForm({ ...stationForm, termsText: e.target.value })}
                rows={2}
                className="mt-2 w-full resize-none rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-bold outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
              />
            </label>
          </div>
          <button type="submit" className="w-full rounded-sc-md bg-gradient-to-br from-slate-800 to-slate-950 py-3.5 font-black text-white shadow-sc-card">
            הוסף עמדה
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black">
          <TrendingUp size={19} className="text-[var(--sc-accent)]" /> דוחות
        </h3>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-sc-sm border border-sc-border bg-sc-surface p-3">
            <p className="text-xl font-black">{currency(hostPayouts)}</p>
            <p className="text-xs text-sc-muted">לספקים</p>
          </div>
          <div className="rounded-sc-sm border border-sc-border bg-sc-surface p-3">
            <p className="text-xl font-black">{totalKwh.toFixed(1)}</p>
            <p className="text-xs text-sc-muted">kWh</p>
          </div>
          <div className="rounded-sc-sm border border-sc-border bg-sc-surface p-3">
            <p className="text-xl font-black">{completedBookings.length}</p>
            <p className="text-xs text-sc-muted">טעינות הושלמו</p>
          </div>
          <div className="rounded-sc-sm border border-sc-border bg-sc-surface p-3">
            <p className="text-xl font-black">{state.stations.length}</p>
            <p className="text-xs text-sc-muted">עמדות</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {revenueByStation.slice(0, 5).map(({ station, volume, platformFees: fees, count }) => (
            <div key={station.id} className="rounded-sc-sm border border-sc-border bg-sc-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-black">{station.name}</p>
                  <p className="text-xs text-sc-muted">
                    {count} עסקאות · עמלה {currency(fees)}
                  </p>
                </div>
                <strong>{currency(volume)}</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--sc-accent)]"
                  style={{ width: `${Math.min(100, totalVolume ? (volume / totalVolume) * 100 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <label className="text-sm font-bold text-sc-muted">
          עמלת מיזם
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={25}
              step={0.5}
              value={state.settings.commission}
              onChange={(e) => setCommission(e.target.value)}
              className="w-full"
            />
            <span className="w-14 rounded-sc-sm border border-sc-border bg-sc-surface py-2 text-center font-black">{state.settings.commission}%</span>
          </div>
        </label>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black">
          <FileText size={19} className="text-[var(--sc-accent)]" /> היסטוריית לקוחות
        </h3>
        <div className="space-y-2">
          {customerHistory.map((customer) => (
            <div key={customer.id} className="rounded-sc-sm border border-sc-border bg-sc-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">{customer.name}</p>
                  <p className="text-xs text-sc-muted">
                    {customer.bookingsCount} הזמנות · {customer.completedCount} הושלמו ·{' '}
                    {customer.lastActivity ? shortTime(customer.lastActivity) : 'ללא פעילות'}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-black">{currency(customer.totalSpend)}</p>
                  <p className="text-xs text-sc-muted">הוצאה</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black">
          <AlertTriangle size={19} className="text-amber-500" /> מחלוקות
        </h3>
        {openDisputes.length === 0 ? (
          <p className="rounded-sc-sm border border-sc-border bg-sc-surface p-4 text-sm text-sc-muted">אין מחלוקות פתוחות.</p>
        ) : (
          <div className="space-y-2">
            {openDisputes.map((dispute) => (
              <div key={dispute.id} className="rounded-sc-sm bg-amber-50 p-3">
                <p className="font-black">{dispute.reason}</p>
                <p className="text-xs text-sc-muted">מזהה: {dispute.bookingId.slice(0, 14)}…</p>
                <button
                  type="button"
                  onClick={() => resolveDispute(dispute.id)}
                  className="mt-2 w-full rounded-sc-md bg-gradient-to-br from-slate-800 to-slate-950 py-2.5 font-black text-white shadow-sm"
                >
                  סגור מחלוקת
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black">
          <UserCheck size={19} className="text-[var(--sc-accent)]" /> משתמשים
        </h3>
        <div className="space-y-2">
          {state.users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-sc-sm border border-sc-border bg-sc-surface p-3">
              <div>
                <p className="font-black">{user.name}</p>
                <p className="text-xs text-sc-muted">
                  {user.role} · {user.verified ? 'מאומת' : 'ממתין'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleBlockUser(user.id)}
                className={`rounded-sc-sm px-3 py-2 text-xs font-black ${
                  user.blocked ? 'bg-red-100 text-red-800' : 'bg-white text-sc-muted ring-1 ring-sc-border'
                }`}
              >
                {user.blocked ? <XCircle size={16} /> : <Ban size={16} />}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black">
          <SlidersHorizontal size={19} /> אירועים
        </h3>
        <div className="space-y-2">
          {state.events.map((event) => (
            <div key={event.id} className="rounded-sc-sm border border-sc-border bg-sc-surface p-3 text-sm">
              <p className="font-bold">{event.text}</p>
              <p className="mt-1 text-xs text-sc-muted">{shortTime(event.time)}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
