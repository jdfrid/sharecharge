import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, List, Map as MapIcon, Wrench } from 'lucide-react';
import { EMERGENCY_CATEGORIES, EMERGENCY_NAV_TILES } from '../../constants';
import { useClientLocation } from '../../hooks/useClientLocation';
import { useLocationAddress } from '../../hooks/useLocationAddress';
import { useAddressSearch } from '../../hooks/useAddressSearch';
import { requireClientAuth } from '../../utils/requireClientAuth';
import { fallbackAreaName } from '../../utils/reverseGeocode';
import { buildNearbyList } from '../../utils/stationSearch';
import { buildEmergencyProviders, emergencyCategoryLabel } from '../../utils/emergencyProviders';
import { filterEmergencyStations } from '../../utils/serviceCategories';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useResolvedStationCoords } from '../../hooks/useResolvedStationCoords';
import { applyStationCoords } from '../../utils/stationCoordinates';
import { formatShareChargeApiError } from '../../data/sharechargeApi';
import { AddressSearchField } from '../../components/AddressSearchField';
import { Card } from '../../components/ui/Card';

const StationMap = lazy(() =>
  import('../../components/StationMap').then((m) => ({ default: m.StationMap })),
);

const categories = Object.values(EMERGENCY_CATEGORIES);
const serviceIcon = (file) => `${import.meta.env.BASE_URL}images/service-icons/${file}`;

function ClientEmergencyCategoryPicker() {
  const navigate = useNavigate();

  return (
    <>
      <Link
        to="/client/home"
        className="mb-2 inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)]"
      >
        <ChevronLeft size={18} />
        חזרה לבית
      </Link>

      <Card>
        <h1 className="text-xl font-black">SOS חירום</h1>
        <p className="mt-1 text-sm font-bold text-sc-muted">בחרו את סוג השירות הנדרש</p>
        <div className="sc-emergency-picker mt-4">
          {EMERGENCY_NAV_TILES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="sc-emergency-picker__item"
              onClick={() => navigate(`/client/emergency?category=${item.id}`)}
            >
              <img src={serviceIcon(item.icon)} alt="" draggable={false} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

export function ClientEmergencyPage() {
  const [params] = useSearchParams();
  const categoryParam = params.get('category');

  if (!categoryParam) {
    return <ClientEmergencyCategoryPicker />;
  }

  return <ClientEmergencyRequestForm category={categoryParam} />;
}

function ClientEmergencyRequestForm({ category: categoryParam }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const category = categoryParam;
  const meta = EMERGENCY_CATEGORIES[category] || EMERGENCY_CATEGORIES.flat_tire;
  const { state, createTender } = useShareCharge();
  const gps = useClientLocation(true, { watch: true });
  const { address: myAddress, loading: addressLoading } = useLocationAddress(
    gps.lat,
    gps.lng,
    !gps.loading && gps.lat != null,
  );
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [maxDistance, setMaxDistance] = useState(50);
  const [problemDescription, setProblemDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const gpsLabel = gps.loading
    ? 'מאתר מיקום…'
    : gps.error
      ? 'מיקום לא זמין'
      : addressLoading
        ? 'מזהה כתובת…'
        : myAddress || (gps.lat != null ? fallbackAreaName(gps.lat, gps.lng) : 'מיקום לא זמין');

  const gpsOrigin = gps.lat != null ? { lat: gps.lat, lng: gps.lng } : null;
  const addressSearch = useAddressSearch({ gpsOrigin, gpsLabel });
  const searchOrigin = addressSearch.usingGps ? gpsOrigin : addressSearch.origin;

  const emergencyStationsForCategory = useMemo(
    () => filterEmergencyStations(state.stations, category),
    [state.stations, category],
  );
  const resolvedCoords = useResolvedStationCoords(emergencyStationsForCategory);
  const geocodedStations = useMemo(
    () => emergencyStationsForCategory.map((station) => applyStationCoords(station, resolvedCoords)),
    [emergencyStationsForCategory, resolvedCoords],
  );

  const providers = useMemo(() => {
    const origin = searchOrigin || gpsOrigin;
    return buildEmergencyProviders({
      stations: geocodedStations,
      users: state.users,
      category,
      origin,
      maxDistance,
    });
  }, [geocodedStations, state.users, category, searchOrigin, gpsOrigin, maxDistance]);

  const { items: nearbyProviders, expanded } = useMemo(
    () =>
      buildNearbyList({
        items: providers,
        origin: searchOrigin || gpsOrigin,
        maxDistance,
      }),
    [providers, searchOrigin, gpsOrigin, maxDistance],
  );

  const mapStations = useMemo(
    () =>
      nearbyProviders.map((provider) => ({
        id: provider.id,
        name: provider.name,
        address: provider.address,
        lat: provider.lat,
        lng: provider.lng,
        available: true,
      })),
    [nearbyProviders],
  );

  const setCategory = (next) => {
    setParams({ category: next });
    setSelectedId(null);
    setError('');
  };

  const submit = async () => {
    const origin = searchOrigin || gpsOrigin;
    if (!origin?.lat) {
      setError('לא ניתן לקבל מיקום — חפשו כתובת או אפשרו GPS');
      return;
    }

    const resolvedAddress = addressSearch.usingGps
      ? myAddress || fallbackAreaName(origin.lat, origin.lng)
      : addressSearch.originLabel;

    const returnTo = `/client/emergency?category=${category}`;
    const intent = {
      type: 'tender',
      category,
      lat: origin.lat,
      lng: origin.lng,
      addressText: resolvedAddress,
      problemDescription: problemDescription.trim(),
      phone: phone.trim(),
      notifyRadiusKm: maxDistance,
      returnTo,
    };

    if (!requireClientAuth(navigate, intent, returnTo)) return;

    setBusy(true);
    setError('');
    try {
      const request = await createTender(intent);
      navigate(`/client/tender/${request.id}/offers`, { replace: true });
    } catch (err) {
      setError(formatShareChargeApiError(err, 'booking') || 'שליחת הקריאה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link
        to="/client/emergency"
        className="mb-2 inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)]"
      >
        <ChevronLeft size={18} />
        שינוי סוג שירות
      </Link>

      <Card>
        <h1 className="text-xl font-black">{meta.label} · ספקים באזור</h1>
        <p className="mt-1 text-sm font-bold text-sc-muted">
          רשימת ספקים לפי סוג התקלה · שליחה שולחת התראת חירום לכל הספקים הרלוונטיים
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                category === item.id
                  ? 'bg-[var(--sc-accent)] text-white'
                  : 'border border-sc-border bg-white text-sc-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <AddressSearchField
            query={addressSearch.query}
            onQueryChange={addressSearch.setQuery}
            onSearch={addressSearch.runSearch}
            onPickSuggestion={addressSearch.pickSuggestion}
            onResetGps={() => {
              addressSearch.resetToGps();
              gps.refresh?.();
            }}
            suggestions={addressSearch.suggestions}
            searching={addressSearch.searching}
            searchError={addressSearch.searchError}
            usingGps={addressSearch.usingGps}
            originLabel={addressSearch.originLabel}
          />
          {!addressSearch.usingGps ? (
            <p className="mt-2 text-xs font-bold text-amber-800">לחצו «מיקום שלי» אם אתם ליד התקלה</p>
          ) : null}
        </div>
        <label className="mt-3 block text-[11px] font-bold text-sc-muted">
          תיאור התקלה
          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            rows={3}
            placeholder="למשל: פנצ'ר בגלגל שמאל קדמי, צריך החלפה"
            className="mt-1 w-full rounded-sc-md border border-sc-border px-3 py-2 text-sm font-bold"
          />
        </label>
        <label className="mt-3 block text-[11px] font-bold text-sc-muted">
          טלפון ליצירת קשר
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="050-0000000"
            className="mt-1 w-full rounded-sc-md border border-sc-border px-3 py-2 text-sm font-black"
            dir="ltr"
          />
        </label>
        <label className="mt-3 block text-[11px] font-bold text-sc-muted">
          רדיוס התראה לספקים (ק״מ)
          <select
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="mt-1 w-full rounded-sc-md border border-sc-border px-2 py-2 text-sm font-black"
          >
            <option value={5}>5 ק״מ</option>
            <option value={15}>15 ק״מ</option>
            <option value={50}>50 ק״מ</option>
            <option value={100}>100 ק״מ</option>
          </select>
        </label>
      </Card>

      <div className="sticky top-0 z-20 flex gap-2 rounded-sc-lg border border-white/90 bg-white/72 p-2 shadow-sc-card backdrop-blur-xl">
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

      {expanded ? (
        <Card>
          <p className="text-center text-sm font-bold text-amber-800">
            אין ספקי {emergencyCategoryLabel(category)} בטווח {maxDistance} ק״מ — מציגים את כל הרלוונטיים
          </p>
        </Card>
      ) : null}

      {nearbyProviders.length === 0 ? (
        <Card>
          <p className="text-center text-sm font-bold text-sc-muted">
            לא נמצאו ספקים ל{emergencyCategoryLabel(category)} בטווח — אפשר עדיין לשלוח קריאה; ספקים רלוונטיים יקבלו התראה
          </p>
        </Card>
      ) : null}

      {view === 'map' && nearbyProviders.length > 0 && (
        <Suspense fallback={<Card><p className="text-center text-sm font-bold text-sc-muted">טוען מפה…</p></Card>}>
          <StationMap
            stations={mapStations}
            selectedId={selectedId}
            onSelectStation={(station) => setSelectedId(station.id)}
          />
        </Suspense>
      )}

      {view === 'list' &&
        nearbyProviders.map((provider) => (
          <Card key={provider.id} className={selectedId === provider.id ? 'ring-2 ring-[var(--sc-accent)]' : ''}>
            <button type="button" onClick={() => setSelectedId(provider.id)} className="w-full text-right">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--sc-accent)]/10 text-[var(--sc-accent)]">
                  <Wrench size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black">{provider.name}</h3>
                  <p className="mt-0.5 text-xs font-black text-[var(--sc-accent)]">
                    {provider.serviceLabel} · {provider.hostName}
                  </p>
                  <p className="mt-1 text-sm text-sc-muted">{provider.address}</p>
                  <p className="mt-2 text-xs font-bold text-sc-muted">
                    {provider.computedDistance.toFixed(1)} ק״מ · דירוג {provider.rating}
                  </p>
                </div>
              </div>
            </button>
          </Card>
        ))}

      <Card>
        <p className="text-sm font-bold text-sc-muted">
          {selectedId
            ? `נבחר: ${nearbyProviders.find((item) => item.id === selectedId)?.name || 'ספק'}`
            : `שליחה תודיע לכל ספקי ${emergencyCategoryLabel(category)} באזור (${nearbyProviders.length})`}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={busy || (gps.loading && !searchOrigin)}
          className="sc-btn-primary mt-4 !text-sm disabled:opacity-60"
        >
          {busy ? 'שולח…' : 'שלח קריאת חירום'}
        </button>
        <p className="mt-2 text-[11px] font-bold text-sc-muted">
          הקריאה נשלחת עם מיקום GPS, סוג תקלה וטווח — ספקים רלוונטיים באזור יקבלו התראה
        </p>
        {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}
      </Card>
    </>
  );
}
