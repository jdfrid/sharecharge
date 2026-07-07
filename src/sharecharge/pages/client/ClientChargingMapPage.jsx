import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, List, Map as MapIcon, RefreshCw, Star, Zap } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useClientLocation } from '../../hooks/useClientLocation';
import { useLocationAddress } from '../../hooks/useLocationAddress';
import { useAddressSearch } from '../../hooks/useAddressSearch';
import { fallbackAreaName } from '../../utils/reverseGeocode';
import { filterChargingStations, loadVehicleProfile } from '../../utils/vehicleProfile';
import { buildStationList } from '../../utils/stationSearch';
import { useResolvedStationCoords } from '../../hooks/useResolvedStationCoords';
import { applyStationCoords } from '../../utils/stationCoordinates';
import { enrichStationWithAvailability } from '../../utils/stationAvailability';
import { shortTime } from '../../utils';
import { AddressSearchField } from '../../components/AddressSearchField';
import { Card } from '../../components/ui/Card';

const StationMap = lazy(() =>
  import('../../components/StationMap').then((m) => ({ default: m.StationMap })),
);

function stationStatusClass(status) {
  if (status === 'available') return 'bg-[var(--sc-success)]/12 text-[var(--sc-success)]';
  if (status === 'occupied') return 'bg-amber-100 text-amber-900';
  return 'bg-red-100 text-red-800';
}

export function ClientChargingMapPage() {
  const { state, refreshFromApi, repositoryMode } = useShareCharge();
  const navigate = useNavigate();
  const gps = useClientLocation(true, { watch: true });
  const { address: myAddress, loading: addressLoading, error: addressError } = useLocationAddress(
    gps.lat,
    gps.lng,
    !gps.loading && gps.lat != null,
  );
  const [maxDistance, setMaxDistance] = useState(15);
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const [hideNonMatchingVehicle, setHideNonMatchingVehicle] = useState(false);
  const [bookableOnly, setBookableOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const profile = loadVehicleProfile();

  const gpsLabel = gps.loading
    ? 'מאתר מיקום…'
    : gps.error
      ? 'לא ניתן לקבל GPS'
      : addressLoading
        ? 'מזהה כתובת…'
        : myAddress || (gps.lat != null ? fallbackAreaName(gps.lat, gps.lng) : addressError || 'מיקום לא זמין');

  const gpsOrigin = gps.lat != null ? { lat: gps.lat, lng: gps.lng } : null;
  const addressSearch = useAddressSearch({ gpsOrigin, gpsLabel });
  const searchOrigin = addressSearch.usingGps ? gpsOrigin : addressSearch.origin;

  const resolvedCoords = useResolvedStationCoords(state.stations);

  const enrichedStations = useMemo(() => {
    const charging = filterChargingStations(state.stations, profile, { hideNonMatching: hideNonMatchingVehicle });
    return charging
      .map((station) => applyStationCoords(station, resolvedCoords))
      .map((station) => enrichStationWithAvailability(station, state.bookings));
  }, [state.stations, state.bookings, profile, hideNonMatchingVehicle, resolvedCoords]);

  const { items: stations, expanded } = useMemo(() => {
    return buildStationList({
      stations: enrichedStations,
      origin: searchOrigin,
      maxDistance,
      textQuery: '',
      bookableOnly,
    });
  }, [enrichedStations, searchOrigin, maxDistance, bookableOnly]);

  const openStation = (id) => navigate(`/client/charging/${id}`);

  const onRefresh = async () => {
    setRefreshedAt(Date.now());
    gps.refresh?.();
    if (repositoryMode !== 'api') return;
    setRefreshing(true);
    try {
      await refreshFromApi();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Link
        to="/client/home"
        className="mb-1 inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)] ring-1 ring-sc-border"
      >
        <ChevronLeft size={18} />
        חזרה לבית
      </Link>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-sc-border px-4 py-4">
          <h2 className="text-xl font-black text-sc-text">עמדות טעינה בסביבה</h2>
          <p className="mt-1 text-xs font-bold text-sc-muted">
            מיקום GPS חי · עמדה תפוסה משתחררת אוטומטית בסיום טעינה
          </p>
        </div>
        <div className="px-4 py-4">
          <AddressSearchField
            query={addressSearch.query}
            onQueryChange={addressSearch.setQuery}
            onSearch={addressSearch.runSearch}
            onPickSuggestion={addressSearch.pickSuggestion}
            onResetGps={() => {
              addressSearch.resetToGps();
              setRefreshedAt(Date.now());
              gps.refresh?.();
            }}
            suggestions={addressSearch.suggestions}
            searching={addressSearch.searching}
            searchError={addressSearch.searchError}
            usingGps={addressSearch.usingGps}
            originLabel={addressSearch.originLabel}
            placeholder="חפשו כתובת: ירושלים, תל אביב, רחוב…"
          />
          {!addressSearch.usingGps ? (
            <p className="mt-2 text-xs font-bold text-amber-800">
              חיפוש לפי כתובת — לחצו «מיקום שלי» אם אתם ליד העמדה
            </p>
          ) : null}
          {gps.accuracy != null && addressSearch.usingGps ? (
            <p className="mt-1 text-[11px] font-bold text-sc-muted">דיוק GPS: ~{Math.round(gps.accuracy)} מ׳</p>
          ) : null}
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
          {[5, 15, 50].map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => setMaxDistance(km)}
              className={`sc-filter-pill ${maxDistance === km ? 'sc-filter-pill--active' : ''}`}
            >
              עד {km} ק״מ
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHideNonMatchingVehicle((value) => !value)}
            className={`sc-filter-pill ${hideNonMatchingVehicle ? 'sc-filter-pill--active' : ''}`}
          >
            {hideNonMatchingVehicle ? 'רק מתאימות לרכב' : 'כל העמדות'}
          </button>
          <button
            type="button"
            onClick={() => setBookableOnly((value) => !value)}
            className={`sc-filter-pill ${bookableOnly ? 'sc-filter-pill--active' : ''}`}
          >
            {bookableOnly ? 'רק זמינות להזמנה' : 'כולל תפוסות'}
          </button>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full border border-sc-border bg-sc-surface px-3 py-2 text-[11px] font-black text-sc-text"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          רענון מיקום ורשימה · {shortTime(refreshedAt)}
        </button>
      </Card>

      <div className="sticky top-0 z-20 flex gap-2 rounded-[var(--sc-radius-lg)] bg-white p-1.5 ring-1 ring-sc-border">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--sc-radius-md)] py-3 text-sm font-black transition ${
            view === 'list' ? 'bg-[var(--sc-accent)] text-white' : 'text-sc-muted'
          }`}
        >
          <List size={18} />
          רשימה
        </button>
        <button
          type="button"
          onClick={() => setView('map')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--sc-radius-md)] py-3 text-sm font-black transition ${
            view === 'map' ? 'bg-[var(--sc-accent)] text-white' : 'text-sc-muted'
          }`}
        >
          <MapIcon size={18} />
          מפה
        </button>
      </div>

      {expanded ? (
        <Card>
          <p className="text-center text-sm font-bold text-amber-800">
            אין עמדות בטווח {maxDistance} ק״מ — מציגים את כל העמדות לפי מרחק (כולל לפי כתובת)
          </p>
        </Card>
      ) : null}

      {stations.length === 0 && (
        <Card>
          <div className="flex flex-col items-center py-6 text-center">
            <p className="font-black text-sc-text">לא נמצאו עמדות</p>
            <p className="mt-2 text-sm font-bold text-sc-muted">
              נסו «מיקום שלי», הרחיבו רדיוס, או בטלו «רק זמינות להזמנה».
            </p>
          </div>
        </Card>
      )}

      {view === 'map' && stations.length > 0 && (
        <Suspense fallback={<Card><p className="text-center text-sm font-bold text-sc-muted">טוען מפה…</p></Card>}>
          <StationMap
            stations={stations}
            selectedId={selectedId}
            onSelectStation={(station) => {
              setSelectedId(station.id);
              openStation(station.id);
            }}
          />
        </Suspense>
      )}

      {view === 'list' &&
        stations.map((station) => (
          <Card key={station.id} className="active:opacity-95">
            <button type="button" onClick={() => openStation(station.id)} className="w-full text-right">
              <div className="sc-station-row">
                <div className="sc-station-thumb">
                  <Zap size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-sc-text">{station.name}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${stationStatusClass(station.availability?.status)}`}>
                      {station.availability?.label || 'זמינה'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-sc-muted">{station.address}</p>
                  {!station.vehicleMatch ? (
                    <p className="mt-1 text-[11px] font-bold text-amber-800">{station.vehicleMatchReason}</p>
                  ) : null}
                  {station.availability?.reason ? (
                    <p className="mt-1 text-[11px] font-bold text-sc-muted">{station.availability.reason}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-sc-muted">
                    <span className="rounded-md bg-sc-surface px-2 py-1">
                      {station.computedDistance != null
                        ? `${Number(station.computedDistance).toFixed(1)} ק״מ`
                        : 'מחשב מרחק…'}
                    </span>
                    <span className="rounded-md bg-sc-surface px-2 py-1">{station.power} kW</span>
                    <span className="rounded-md bg-sc-surface px-2 py-1">{station.plug}</span>
                    <span className="rounded-md bg-sc-surface px-2 py-1">₪{station.pricePerKwh}/kWh</span>
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-sc-surface px-2 py-1">
                      <Star size={11} className="text-[var(--sc-warning)]" />
                      {station.rating}
                    </span>
                  </div>
                </div>
                <ChevronLeft className="mt-2 shrink-0 text-[var(--sc-accent)]" size={20} />
              </div>
              <p className="mt-3 text-center text-sm font-black text-[var(--sc-accent)]">
                {station.availability?.canBook ? 'בחירה והמשך להזמנה' : 'פרטי עמדה'}
              </p>
            </button>
          </Card>
        ))}
    </>
  );
}
