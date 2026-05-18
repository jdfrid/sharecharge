import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BatteryCharging,
  ChevronLeft,
  MapPin,
  Search,
  Zap,
} from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { driverLocationProfiles } from '../../constants';
import { resolveDriverIdForSession } from '../../auth/identity';
import { currency, shortTime } from '../../utils';
import { Card } from '../../components/ui/Card';
import { StationMap } from '../../components/StationMap';

export function ClientDiscoverPage() {
  const { state, createBooking } = useShareCharge();
  const [query, setQuery] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [selectedTime, setSelectedTime] = useState('19:30');
  const [locationId, setLocationId] = useState('current');
  const [maxDistance, setMaxDistance] = useState(3);
  const [hasLocated, setHasLocated] = useState(false);
  const [lastLocatedAt, setLastLocatedAt] = useState(null);
  const [view, setView] = useState('list');
  const [mapSelectedId, setMapSelectedId] = useState(null);

  const myDriverId = useMemo(() => resolveDriverIdForSession(state), [state.users]);
  const me = state.users.find((u) => u.id === myDriverId);

  const driverBookings = state.bookings.filter((item) => item.driverId === myDriverId);
  const activeBooking = driverBookings.find((item) => !['completed', 'rejected', 'cancelled'].includes(item.status));
  const locationProfile = driverLocationProfiles.find((item) => item.id === locationId) || driverLocationProfiles[0];
  const getDistance = (station) => Math.max(0.1, Number(station.distance || 1) + locationProfile.distanceOffset);

  const filteredStations = useMemo(
    () =>
      state.stations
        .filter((station) => {
          const term = query.trim();
          const matchesSearch = !term || `${station.name} ${station.address} ${station.plug}`.includes(term);
          return station.available && matchesSearch && getDistance(station) <= maxDistance;
        })
        .sort((a, b) => getDistance(a) - getDistance(b)),
    [state.stations, query, maxDistance, locationId],
  );

  const locatedStations = hasLocated ? filteredStations : [];

  const locateStations = () => {
    setHasLocated(true);
    setLastLocatedAt(Date.now());
  };

  return (
    <>
      <Card className="bg-sc-text text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sc-accent)] text-white">
            <BatteryCharging size={24} />
          </div>
          <div>
            <p className="text-sm text-white/70">
              שלום {me?.name || 'לקוח'}
              {me?.email ? <span className="mr-1 block truncate text-[11px] text-white/50">{me.email}</span> : null}
            </p>
            <h2 className="text-2xl font-black">איפה נטענים היום?</h2>
          </div>
        </div>
        {activeBooking && (
          <Link
            to="/client/activity"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-sc-sm bg-white/15 py-3 text-sm font-black text-white ring-1 ring-white/20"
          >
            יש הזמנה פעילה — עבור למסך המעקב
            <ChevronLeft size={18} />
          </Link>
        )}
        <div className="mt-4 flex items-center gap-2 rounded-sc-sm bg-white/10 px-3 py-3">
          <Search size={19} className="text-white/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי עיר, שקע או שם עמדה"
            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-white/40"
          />
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setHasLocated(false);
            }}
            className="rounded-sc-sm bg-white/10 px-3 py-3 text-sm font-black outline-none"
          >
            {driverLocationProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={locateStations} className="rounded-sc-sm bg-[var(--sc-accent)] px-4 py-3 text-sm font-black text-white">
            איתור
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-sc-sm bg-white/10 px-3 py-2 text-xs text-white/75">
          <span>{locationProfile.note}</span>
          <label className="flex items-center gap-2 font-bold">
            רדיוס
            <select
              value={maxDistance}
              onChange={(e) => {
                setMaxDistance(Number(e.target.value));
                setHasLocated(false);
              }}
              className="rounded-xl bg-white/10 px-2 py-1 outline-none"
            >
              <option value={1}>1 ק״מ</option>
              <option value={3}>3 ק״מ</option>
              <option value={5}>5 ק״מ</option>
            </select>
          </label>
        </div>
        <p className="mt-3 rounded-sc-sm bg-white/10 px-3 py-2 text-xs font-bold text-white/80">
          {hasLocated
            ? `נמצאו ${locatedStations.length} עמדות ברדיוס ${maxDistance} ק״מ${lastLocatedAt ? ` · ${shortTime(lastLocatedAt)}` : ''}`
            : 'לחצו ״איתור״ כדי לטעון עמדות לפי המיקום המדומה'}
        </p>

        {hasLocated && locatedStations.length > 0 && (
          <div className="mt-4 flex rounded-sc-sm bg-white/10 p-1 ring-1 ring-white/10">
            {[
              { id: 'list', label: 'רשימה' },
              { id: 'map', label: 'מפה' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={`flex-1 rounded-md py-2 text-xs font-black ${
                  view === tab.id ? 'bg-white text-sc-text' : 'text-white/75'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {!activeBooking && (
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-sc-muted">
              שעת התחלה
              <input
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="mt-2 w-full rounded-sc-sm bg-slate-100 px-3 py-3 font-black outline-none"
              />
            </label>
            <label className="text-sm font-bold text-sc-muted">
              משך
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="mt-2 w-full rounded-sc-sm bg-slate-100 px-3 py-3 font-black outline-none"
              >
                <option value={1}>שעה</option>
                <option value={2}>שעתיים</option>
                <option value={3}>שלוש שעות</option>
              </select>
            </label>
          </div>
        </Card>
      )}

      {!hasLocated && (
        <Card>
          <div className="text-center">
            <MapPin className="mx-auto mb-3 text-[var(--sc-accent)]" size={28} />
            <p className="text-sm font-bold text-sc-muted">בחרו מיקום, רדיוס ולחצו ״איתור״.</p>
          </div>
        </Card>
      )}

      {hasLocated && locatedStations.length === 0 && (
        <Card>
          <p className="text-center text-sm font-bold text-sc-muted">
            לא נמצאו עמדות. נסו להרחיב רדיוס או להוסיף עמדה במסך מנהל המערכת.
          </p>
        </Card>
      )}

      {hasLocated && view === 'map' && locatedStations.length > 0 && (
        <StationMap stations={locatedStations} selectedId={mapSelectedId} onSelectStation={(s) => setMapSelectedId(s.id)} />
      )}

      {hasLocated && view === 'map' && mapSelectedId && !activeBooking && (
        (() => {
          const station = locatedStations.find((s) => s.id === mapSelectedId);
          if (!station) return null;
          return (
            <Card>
              <p className="text-sm font-black text-[var(--sc-accent)]">נבחר מהמפה</p>
              <h3 className="mt-1 text-lg font-black">{station.name}</h3>
              <p className="mt-1 text-sm text-sc-muted">{station.address}</p>
              <button
                type="button"
                onClick={() => createBooking({ stationId: station.id, startTime: selectedTime, durationHours })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-sc-sm bg-sc-text py-3 font-black text-white"
              >
                הזמנת עמדה זו
                <ChevronLeft size={18} />
              </button>
            </Card>
          );
        })()
      )}

      {!activeBooking &&
        hasLocated &&
        view === 'list' &&
        locatedStations.map((station) => (
          <Card key={station.id}>
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--sc-surface)] text-[var(--sc-accent)]">
                <Zap size={25} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black">{station.name}</h3>
                  <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">פנויה</span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-sc-muted">
                  <MapPin size={15} /> {station.address}
                </p>
                {station.termsText ? (
                  <p className="mt-2 border-t border-slate-100/80 pt-2 text-xs leading-relaxed text-sc-muted">
                    <span className="font-black text-sc-text">תנאי הספק: </span>
                    {station.termsText}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-sc-sm bg-slate-50 p-2">
                <p className="font-black">{getDistance(station).toFixed(1)} ק״מ</p>
                <p className="text-sc-muted">מרחק</p>
              </div>
              <div className="rounded-sc-sm bg-slate-50 p-2">
                <p className="font-black">{station.power}kW</p>
                <p className="text-sc-muted">הספק</p>
              </div>
              <div className="rounded-sc-sm bg-slate-50 p-2">
                <p className="font-black">{station.plug}</p>
                <p className="text-sc-muted">שקע</p>
              </div>
              <div className="rounded-sc-sm bg-slate-50 p-2">
                <p className="font-black">{station.pricePerKwh}</p>
                <p className="text-sc-muted">₪/kWh</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => createBooking({ stationId: station.id, startTime: selectedTime, durationHours })}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-sc-sm bg-sc-text py-3 font-black text-white"
            >
              הזמן עכשיו
              <ChevronLeft size={18} />
            </button>
          </Card>
        ))}
    </>
  );
}
