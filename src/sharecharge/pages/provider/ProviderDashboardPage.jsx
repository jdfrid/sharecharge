import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { findActiveBookingForStation } from '../../utils/stationAvailability';
import { isChargingStation, isEmergencyProviderStation, serviceCategoryLabel } from '../../utils/serviceCategories';
import { currency } from '../../utils';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';

export function ProviderDashboardPage() {
  const { state, updateStation } = useShareCharge();
  const { hosts, activeHostId, setActiveHostId, activeHost } = useSyncedProviderHost(state);
  const hostStations = state.stations.filter((station) => station.hostId === activeHost?.id);
  const chargingStations = hostStations.filter(isChargingStation);
  const serviceLocations = hostStations.filter(isEmergencyProviderStation);
  const revenue = state.transactions.filter((tx) => tx.hostId === activeHost?.id).reduce((sum, tx) => sum + tx.hostShare, 0);

  return (
    <>
      <Card>
        <label className="mb-3 block text-sm font-bold text-sc-muted">
          ספק פעיל
          {hosts.length > 1 ? (
            <select
              value={activeHost?.id || ''}
              onChange={(e) => setActiveHostId(e.target.value)}
              className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black text-sc-text outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
            >
              {hosts.map((host) => (
                <option key={host.id} value={host.id} className="text-sc-text">
                  {host.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-2 rounded-sc-sm border border-sc-border bg-sc-surface px-3 py-3 font-black text-sc-text">
              {activeHost?.name || '—'}
            </p>
          )}
        </label>
        <p className="text-sm text-sc-muted">יתרה לפי עסקאות במערכת</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-3xl font-black">{currency((activeHost?.revenue || 0) + revenue)}</p>
          <Wallet className="text-[var(--sc-accent-2)]" size={30} />
        </div>
        <p className="mt-3 text-sm text-sc-muted">
          מחובר כ־{activeHost?.email || '—'} · {chargingStations.length} עמדות טעינה
          {serviceLocations.length ? ` · ${serviceLocations.length} נקודות שירות חירום` : ''}
          · עדכנו מחיר, זמינות ותנאים למטה.
        </p>
      </Card>

      <Card>
        <p className="text-sm font-black text-[var(--sc-accent)]">זמינות עמדות</p>
        <ul className="mt-2 space-y-1 text-xs font-bold text-sc-muted">
          <li><span className="text-[var(--sc-success)]">זמינה</span> — ניתן להזמין</li>
          <li><span className="text-amber-800">תפוסה</span> — הזמנה פעילה; משתחררת אוטומטית בסיום או בדחייה</li>
          <li><span className="text-red-800">לא זמינה</span> — סימון ידני שלכם (תחזוקה, סגור); לחצו הכפתור לשחרור</li>
        </ul>
      </Card>

      <Card>
        <div className="mb-4">
          <p className="text-sm font-black text-[var(--sc-accent)]">עמדות טעינה</p>
          <h2 className="text-xl font-black">{activeHost?.name || 'ספק'}</h2>
        </div>
        {chargingStations.length === 0 ? (
          <p className="rounded-sc-sm border border-sc-border bg-sc-surface p-4 text-sm text-sc-muted">
            אין עמדות טעינה — הוסיפו במסך מנהל המערכת.
          </p>
        ) : (
          <div className="space-y-3">
            {chargingStations.map((station) => (
              <ChargingStationEditor
                key={station.id}
                station={station}
                state={state}
                updateStation={updateStation}
              />
            ))}
          </div>
        )}
      </Card>

      {serviceLocations.length > 0 ? (
        <Card>
          <div className="mb-4">
            <p className="text-sm font-black text-[var(--sc-accent)]">נקודות שירות חירום</p>
            <p className="mt-1 text-xs font-bold text-sc-muted">
              דלק, פנצ&apos;ר, גרר, מוסך — מופיעות ללקוחות בקריאות חירום בלבד, לא במפת טעינה
            </p>
          </div>
          <div className="space-y-3">
            {serviceLocations.map((station) => (
              <ServiceLocationEditor
                key={station.id}
                station={station}
                updateStation={updateStation}
              />
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}

function ChargingStationEditor({ station, state, updateStation }) {
  const activeBooking = findActiveBookingForStation(station.id, state.bookings);
  const occupied = !!activeBooking;
  const manualOff = !station.available;

  return (
    <div className="rounded-sc-md border border-sc-border bg-sc-surface p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black">{station.name}</p>
          <p className="text-xs text-sc-muted">{station.address}</p>
          {occupied ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={activeBooking.status} />
              <Link to="/provider/orders" className="text-xs font-black text-[var(--sc-accent)] underline">
                לטיפול בהזמנה
              </Link>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {occupied ? (
            <span className="rounded-sc-sm bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">תפוסה</span>
          ) : (
            <button
              type="button"
              onClick={() => updateStation(station.id, { available: !station.available })}
              className={`rounded-sc-sm px-3 py-2 text-xs font-black ${
                station.available
                  ? 'bg-[var(--sc-accent-2)]/12 text-[var(--sc-accent-2)]'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {station.available ? 'זמינה' : 'לא זמינה · שחרר'}
            </button>
          )}
        </div>
      </div>
      {manualOff && !occupied ? (
        <p className="mb-3 text-xs font-bold text-red-800">
          העמדה מוסתרת מהלקוחות — לחצו «לא זמינה · שחרר» כדי לאפשר הזמנות שוב.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-sc-muted">
          מחיר לקוט״ש
          <input
            type="number"
            step="0.05"
            value={station.pricePerKwh}
            onChange={(e) => updateStation(station.id, { pricePerKwh: Number(e.target.value) })}
            className="mt-1 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-2 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-1 focus:ring-[var(--sc-accent-2)]/25"
          />
        </label>
        <label className="text-xs font-bold text-sc-muted">
          הספק kW
          <input
            type="number"
            value={station.power}
            onChange={(e) => updateStation(station.id, { power: Number(e.target.value) })}
            className="mt-1 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-2 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-1 focus:ring-[var(--sc-accent-2)]/25"
          />
        </label>
      </div>
      <label className="mt-3 block text-xs font-bold text-sc-muted">
        תנאים להטענה (גלויים ללקוח)
        <textarea
          value={station.termsText || ''}
          onChange={(e) => updateStation(station.id, { termsText: e.target.value })}
          rows={3}
          className="mt-1 w-full resize-none rounded-sc-sm border border-sc-border bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[var(--sc-accent-2)] focus:ring-1 focus:ring-[var(--sc-accent-2)]/25"
        />
      </label>
    </div>
  );
}

function ServiceLocationEditor({ station, updateStation }) {
  return (
    <div className="rounded-sc-md border border-amber-200/80 bg-amber-50/40 p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
            {serviceCategoryLabel(station.serviceCategory)}
          </span>
          <p className="mt-2 font-black">{station.name}</p>
          <p className="text-xs text-sc-muted">{station.address}</p>
        </div>
        <button
          type="button"
          onClick={() => updateStation(station.id, { available: !station.available })}
          className={`rounded-sc-sm px-3 py-2 text-xs font-black ${
            station.available ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-800'
          }`}
        >
          {station.available ? 'פעיל' : 'לא פעיל · הפעל'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-sc-muted">
          מחיר בסיס (₪)
          <input
            type="number"
            step="1"
            value={station.pricePerKwh}
            onChange={(e) => updateStation(station.id, { pricePerKwh: Number(e.target.value) })}
            className="mt-1 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-2 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-1 focus:ring-[var(--sc-accent-2)]/25"
          />
        </label>
        <label className="text-xs font-bold text-sc-muted">
          סוג שירות
          <input
            value={station.plug || serviceCategoryLabel(station.serviceCategory)}
            readOnly
            className="mt-1 w-full rounded-sc-sm border border-sc-border bg-sc-surface px-3 py-2 text-sm font-bold text-sc-muted"
          />
        </label>
      </div>
      <label className="mt-3 block text-xs font-bold text-sc-muted">
        תנאי שירות (גלויים ללקוח בקריאת חירום)
        <textarea
          value={station.termsText || ''}
          onChange={(e) => updateStation(station.id, { termsText: e.target.value })}
          rows={2}
          className="mt-1 w-full resize-none rounded-sc-sm border border-sc-border bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[var(--sc-accent-2)] focus:ring-1 focus:ring-[var(--sc-accent-2)]/25"
        />
      </label>
    </div>
  );
}
