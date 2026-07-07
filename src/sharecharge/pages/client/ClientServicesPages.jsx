import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Wrench } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { SERVICE_CATEGORIES } from '../../constants';
import { useClientLocation } from '../../hooks/useClientLocation';
import { useLocationAddress } from '../../hooks/useLocationAddress';
import { useAddressSearch } from '../../hooks/useAddressSearch';
import { fallbackAreaName } from '../../utils/reverseGeocode';
import { buildStationList } from '../../utils/stationSearch';
import { formatShareChargeApiError } from '../../data/sharechargeApi';
import { AddressSearchField } from '../../components/AddressSearchField';
import { Card } from '../../components/ui/Card';

export function ClientServiceBrowsePage() {
  const { category } = useParams();
  const meta = SERVICE_CATEGORIES[category];
  const { state } = useShareCharge();
  const navigate = useNavigate();
  const gps = useClientLocation(true);
  const { address: myAddress, loading: addressLoading } = useLocationAddress(
    gps.lat,
    gps.lng,
    !gps.loading && gps.lat != null,
  );
  const [maxDistance, setMaxDistance] = useState(50);

  if (!meta) return <Navigate to="/client/discover" replace />;

  const gpsLabel = gps.loading
    ? 'מאתר מיקום…'
    : myAddress || (gps.lat != null ? fallbackAreaName(gps.lat, gps.lng) : 'מיקום לא זמין');
  const gpsOrigin = gps.lat != null ? { lat: gps.lat, lng: gps.lng } : null;
  const addressSearch = useAddressSearch({ gpsOrigin, gpsLabel });

  const { items, expanded } = useMemo(
    () =>
      buildStationList({
        stations: state.stations.filter((s) => (s.serviceCategory || 'charging') === category),
        origin: addressSearch.origin,
        maxDistance,
        textQuery: '',
      }),
    [state.stations, category, addressSearch.origin, maxDistance],
  );

  return (
    <>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <Link to="/client/discover" className="shrink-0 rounded-full border border-sc-border bg-white px-4 py-2 text-xs font-black text-sc-muted">
          ← טעינה
        </Link>
        {Object.values(SERVICE_CATEGORIES)
          .filter((c) => c.id !== 'charging')
          .map((c) => (
            <Link
              key={c.id}
              to={c.path}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${
                c.id === category ? 'bg-[var(--sc-accent)] text-white' : 'border border-sc-border bg-white text-sc-muted'
              }`}
            >
              {c.label}
            </Link>
          ))}
      </div>

      <Card>
        <h2 className="text-xl font-black">{meta.discoverTitle}</h2>
        <p className="mt-1 text-sm font-bold text-sc-muted">חיפוש כתובת · הזמנת שירות כמו בטעינה</p>
        <div className="mt-4">
          <AddressSearchField
            query={addressSearch.query}
            onQueryChange={addressSearch.setQuery}
            onSearch={addressSearch.runSearch}
            onPickSuggestion={addressSearch.pickSuggestion}
            onResetGps={addressSearch.resetToGps}
            suggestions={addressSearch.suggestions}
            searching={addressSearch.searching}
            searchError={addressSearch.searchError}
            usingGps={addressSearch.usingGps}
            originLabel={addressSearch.originLabel}
          />
        </div>
        <label className="mt-3 block text-[11px] font-bold text-sc-muted">
          מרחק מקסימלי
          <select value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} className="mt-1 w-full rounded-sc-md border border-sc-border px-2 py-2 text-sm font-black">
            <option value={5}>5 ק״מ</option>
            <option value={15}>15 ק״מ</option>
            <option value={50}>50 ק״מ</option>
          </select>
        </label>
      </Card>

      {expanded ? (
        <Card>
          <p className="text-center text-sm font-bold text-amber-800">
            אין עסקים בטווח {maxDistance} ק״מ — מציגים את כל העסקים
          </p>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <p className="text-center text-sm font-bold text-sc-muted">לא נמצאו עסקים בטווח — הרחיבו מרחק או נקו חיפוש.</p>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <button type="button" onClick={() => navigate(`/client/services/${category}/${item.id}`)} className="w-full text-right">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--sc-accent)]/10 text-[var(--sc-accent)]">
                  <Wrench size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black">{item.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-sc-muted">
                    <MapPin size={14} /> {item.address}
                  </p>
                  <p className="mt-2 text-xs font-bold text-sc-muted">
                    {item.computedDistance.toFixed(1)} km · ₪{item.pricePerKwh} · {item.plug}
                  </p>
                  <p className="mt-1 text-[11px] text-sc-muted" dir="ltr">
                    📍 {item.lat?.toFixed(5)}, {item.lng?.toFixed(5)}
                  </p>
                </div>
                <ChevronLeft className="shrink-0 text-[var(--sc-accent)]" />
              </div>
            </button>
          </Card>
        ))
      )}
    </>
  );
}

export function ClientServiceBookPage() {
  const { category, stationId } = useParams();
  const meta = SERVICE_CATEGORIES[category];
  const navigate = useNavigate();
  const { state, createBooking } = useShareCharge();
  const station = state.stations.find((s) => s.id === stationId && (s.serviceCategory || 'charging') === category);
  const [selectedTime, setSelectedTime] = useState('19:30');
  const [durationHours, setDurationHours] = useState(1);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!meta) return <Navigate to="/client/discover" replace />;
  if (!station) return <Navigate to={meta.path} replace />;

  const handleConfirm = async () => {
    setBusy(true);
    setSubmitError('');
    try {
      await createBooking({ stationId: station.id, startTime: selectedTime, durationHours });
      navigate('/client/activity', { replace: true });
    } catch (err) {
      setSubmitError(formatShareChargeApiError(err, 'booking'));
      if (err.status === 401) setTimeout(() => navigate('/client/entry', { replace: true }), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to={meta.path} className="mb-2 inline-flex items-center gap-1 text-sm font-black text-[var(--sc-accent)]">
        <ChevronLeft size={18} /> חזרה לרשימה
      </Link>
      <Card>
        <h1 className="text-xl font-black">{station.name}</h1>
        <p className="mt-1 text-sm font-bold text-sc-muted">{station.address}</p>
        <p className="mt-2 text-xs font-bold text-sc-muted" dir="ltr">
          מיקום מדויק: {station.lat}, {station.lng}
        </p>
        <p className="mt-3 text-sm text-sc-muted">{station.termsText}</p>
      </Card>
      <Card>
        <h2 className="mb-3 font-black">הזמנת {meta.label}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold text-sc-muted">
            שעה משוערת
            <input value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="sc-field mt-2 text-sm" />
          </label>
          <label className="text-sm font-bold text-sc-muted">
            משך (שעות)
            <select value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} className="sc-field mt-2 text-sm">
              <option value={1}>שעה</option>
              <option value={2}>שעתיים</option>
              <option value={3}>3 שעות</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-sc-muted">מחיר משוער: ₪{station.pricePerKwh * durationHours}</p>
        <button type="button" onClick={handleConfirm} disabled={busy} className="sc-btn-primary mt-4 w-full disabled:opacity-60">
          {busy ? 'שולח…' : 'שלח בקשת שירות לספק'}
        </button>
        {submitError ? <p className="mt-3 text-sm font-bold text-red-600">{submitError}</p> : null}
      </Card>
    </>
  );
}
