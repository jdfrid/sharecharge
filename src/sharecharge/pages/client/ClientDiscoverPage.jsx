import { useMemo, useState, lazy, Suspense } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BatteryCharging,
  ChevronLeft,
  List,
  Map as MapIcon,
  MapPin,
  Search,
  Zap,
} from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { SERVICE_NAV_LINKS, driverLocationProfiles } from '../../constants';
import { useClientLocation } from '../../hooks/useClientLocation';
import { resolveDriverIdForSession } from '../../auth/identity';
import { distanceToStation } from '../../utils/geo';
import { shortTime } from '../../utils';
import { Card } from '../../components/ui/Card';

const StationMap = lazy(() =>
  import('../../components/StationMap').then((m) => ({ default: m.StationMap })),
);

export function ClientDiscoverPage() {
  const { state } = useShareCharge();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [locationId, setLocationId] = useState('current');
  const [maxDistance, setMaxDistance] = useState(50);
  const [view, setView] = useState('list');
  const [mapSelectedId, setMapSelectedId] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const gps = useClientLocation(locationId === 'current');

  const myDriverId = useMemo(() => resolveDriverIdForSession(state), [state.users]);
  const me = state.users.find((u) => u.id === myDriverId);
  const driverBookings = state.bookings.filter((item) => item.driverId === myDriverId);
  const activeBooking = driverBookings.find((item) => !['completed', 'rejected', 'cancelled'].includes(item.status));
  const locationProfile = driverLocationProfiles.find((item) => item.id === locationId) || driverLocationProfiles[0];

  const origin = useMemo(() => {
    if (locationId === 'current' && gps.lat != null) return { lat: gps.lat, lng: gps.lng };
    if (locationProfile.lat != null) return { lat: locationProfile.lat, lng: locationProfile.lng };
    return null;
  }, [locationId, gps.lat, gps.lng, locationProfile.lat, locationProfile.lng]);

  const getDistance = (station) => {
    if (origin) return distanceToStation(station, origin);
    return Math.max(0.1, Number(station.distance || 1) + (locationProfile.distanceOffset || 0));
  };

  const filteredStations = useMemo(
    () =>
      state.stations
        .filter((station) => (station.serviceCategory || 'charging') === 'charging')
        .filter((station) => {
          const term = query.trim();
          const matchesSearch = !term || `${station.name} ${station.address} ${station.plug}`.includes(term);
          return station.available && matchesSearch && getDistance(station) <= maxDistance;
        })
        .sort((a, b) => getDistance(a) - getDistance(b)),
    [state.stations, query, maxDistance, origin],
  );

  const openStation = (id) => {
    navigate(`/client/station/${id}`);
  };

  return (
    <>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {SERVICE_NAV_LINKS.map((link) => (
          <NavLink
            key={link.id}
            to={link.path}
            className="rounded-sc-md border border-white/90 bg-white/80 py-3 text-center text-xs font-black text-[var(--sc-accent)] shadow-sm backdrop-blur-md"
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#007bff]/15 to-[#00d1c1]/20 text-[var(--sc-accent)]">
            <BatteryCharging size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-sc-muted">
              שלום <span className="font-black text-sc-text">{me?.name || 'לקוח'}</span>
            </p>
            {me?.email ? <p className="mt-0.5 truncate text-xs text-sc-muted" dir="ltr">{me.email}</p> : null}
            <h2 className="mt-1 text-xl font-black leading-tight text-sc-text">עמדות לידך</h2>
          </div>
        </div>
        {activeBooking && (
          <Link
            to="/client/activity"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-sc-md bg-gradient-to-l from-[#007bff] via-[#0095ff] to-[#00d1c1] py-3.5 text-sm font-black text-white shadow-sc-card"
          >
            הזמנה פעילה — המשך למעקב
            <ChevronLeft size={18} />
          </Link>
        )}
        <div className="mt-4 flex items-center gap-2 rounded-sc-md border border-white/80 bg-white/55 px-3 py-3 shadow-sm backdrop-blur-md">
          <Search size={19} className="shrink-0 text-sc-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש: עיר, רחוב, סוג שקע..."
            className="w-full border-0 bg-transparent text-sm font-bold text-sc-text outline-none placeholder:text-sc-muted"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[11px] font-bold text-sc-muted">
            נקודת ייחוס
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 w-full rounded-sc-md border border-sc-border/80 bg-white/90 px-2 py-2.5 text-sm font-black text-sc-text shadow-sm outline-none backdrop-blur-sm"
            >
              {driverLocationProfiles.map((profile) => (
                <option key={profile.id} value={profile.id} className="text-sc-text">
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-bold text-sc-muted">
            מרחק מקסימלי
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="mt-1 w-full rounded-sc-md border border-sc-border/80 bg-white/90 px-2 py-2.5 text-sm font-black text-sc-text shadow-sm outline-none backdrop-blur-sm"
            >
              <option value={5} className="text-sc-text">
                5 ק״מ
              </option>
              <option value={15} className="text-sc-text">
                15 ק״מ
              </option>
              <option value={50} className="text-sc-text">
                50 ק״מ
              </option>
            </select>
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-sc-muted">
          <span>
            {locationId === 'current' && gps.loading
              ? 'מאתר GPS…'
              : locationId === 'current' && gps.error
                ? gps.error
                : locationProfile.note}
          </span>
          <button
            type="button"
            onClick={() => {
              setRefreshedAt(Date.now());
              if (locationId === 'current') gps.refresh();
            }}
            className="rounded-full border border-sc-border bg-white px-3 py-1 font-black text-sc-text shadow-sm"
          >
            עדכן סביבה · {shortTime(refreshedAt)}
          </button>
        </div>
      </Card>

      {!activeBooking && (
        <div className="sticky top-0 z-20 -mx-1 flex gap-2 rounded-sc-lg border border-white/90 bg-white/72 p-2 shadow-sc-card backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-sc-md py-3.5 text-sm font-black transition ${
              view === 'list'
                ? 'bg-gradient-to-l from-[#007bff] to-[#00d1c1] text-white shadow-md'
                : 'bg-white/80 text-sc-muted shadow-sm'
            }`}
          >
            <List size={18} />
            רשימה
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-sc-md py-3.5 text-sm font-black transition ${
              view === 'map'
                ? 'bg-gradient-to-l from-[#007bff] to-[#00d1c1] text-white shadow-md'
                : 'bg-white/80 text-sc-muted shadow-sm'
            }`}
          >
            <MapIcon size={18} />
            מפה
          </button>
        </div>
      )}

      {filteredStations.length === 0 && (
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <MapPin className="mb-3 text-[var(--sc-accent)]" size={36} />
            <p className="font-black text-sc-text">לא נמצאו עמדות בטווח</p>
            <p className="mt-2 text-sm font-bold text-sc-muted">נסו להרחיק את טווח החיפוש או לנקות את שדה החיפוש.</p>
          </div>
        </Card>
      )}

      {!activeBooking && view === 'map' && filteredStations.length > 0 && (
        <Suspense fallback={<Card><p className="text-center text-sm font-bold text-sc-muted">טוען מפה…</p></Card>}>
          <StationMap
            stations={filteredStations}
            selectedId={mapSelectedId}
            onSelectStation={(s) => {
              setMapSelectedId(s.id);
              openStation(s.id);
            }}
          />
        </Suspense>
      )}

      {!activeBooking &&
        view === 'list' &&
        filteredStations.map((station) => (
          <Card key={station.id} className="active:opacity-95">
            <button type="button" onClick={() => openStation(station.id)} className="w-full text-right">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#007bff]/12 to-[#00d1c1]/18 text-[var(--sc-accent)]">
                  <Zap size={25} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-black text-sc-text">{station.name}</h3>
                    <span className="shrink-0 rounded-full bg-[var(--sc-accent-2)]/12 px-2 py-1 text-xs font-black text-[var(--sc-accent-2)]">
                      זמינה
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-sm text-sc-muted">
                    <MapPin size={15} className="shrink-0" /> {station.address}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-sc-muted">
                    <span className="rounded-md border border-sc-border bg-sc-surface px-2 py-1">{getDistance(station).toFixed(1)} km</span>
                    <span className="rounded-md border border-sc-border bg-sc-surface px-2 py-1">{station.power} kW</span>
                    <span className="rounded-md border border-sc-border bg-sc-surface px-2 py-1">{station.plug}</span>
                    <span className="rounded-md border border-sc-border bg-sc-surface px-2 py-1">₪{station.pricePerKwh}/kWh</span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-sc-muted" dir="ltr">
                    📍 {Number(station.lat).toFixed(5)}, {Number(station.lng).toFixed(5)}
                  </p>
                  {station.termsText ? (
                    <p className="mt-2 line-clamp-2 border-t border-sc-border pt-2 text-xs text-sc-muted">
                      <span className="font-black text-sc-text">תנאים: </span>
                      {station.termsText}
                    </p>
                  ) : null}
                </div>
                <ChevronLeft className="mt-2 shrink-0 text-[var(--sc-accent)]" size={22} />
              </div>
              <p className="mt-3 text-center text-sm font-black text-[var(--sc-accent)]">בחירה והמשך להזמנה</p>
            </button>
          </Card>
        ))}
    </>
  );
}
