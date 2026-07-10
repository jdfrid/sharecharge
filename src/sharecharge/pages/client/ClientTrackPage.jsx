import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Navigation, RefreshCw } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useTenders } from '../../hooks/useTenders';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { fallbackAreaName } from '../../utils/reverseGeocode';
import { googleMapsUrl, openExternal, wazeUrl } from '../../utils/navigationLinks';
import { currency } from '../../utils';
import { Card } from '../../components/ui/Card';

const TrackMap = lazy(() => import('../../components/TrackMap').then((m) => ({ default: m.TrackMap })));

export function ClientTrackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, redistributeTender } = useShareCharge();
  const { refresh } = useTenders();
  usePushNotifications(true);
  const [busy, setBusy] = useState(false);

  const request = state.serviceRequests?.find((item) => item.id === id);
  const bid = state.serviceBids?.find((item) => item.id === request?.acceptedBidId);
  const host = state.users.find((user) => user.id === request?.hostId);

  useEffect(() => {
    const timer = setInterval(() => refresh?.('client'), 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const providerLat = request?.providerLat ?? bid?.providerLat;
  const providerLng = request?.providerLng ?? bid?.providerLng;
  const locationLabel = request?.addressText || fallbackAreaName(request?.lat, request?.lng);

  const mapPoints = useMemo(() => {
    const points = [];
    if (request?.lat != null && request?.lng != null) {
      points.push({ id: 'driver', lat: request.lat, lng: request.lng, label: 'אתה', color: '#007bff' });
    }
    if (providerLat != null && providerLng != null) {
      points.push({ id: 'provider', lat: providerLat, lng: providerLng, label: 'ספק', color: '#00d1c1' });
    }
    return points;
  }, [request?.lat, request?.lng, providerLat, providerLng]);

  if (!request) {
    return (
      <Card>
        <p className="text-sm font-bold text-sc-muted">טוען מעקב…</p>
      </Card>
    );
  }

  const canNavigate = providerLat != null && providerLng != null;
  const canRedistribute = ['assigned', 'in_progress', 'completed', 'pending_provider'].includes(request.status);

  const handleRedistribute = async () => {
    if (!window.confirm('הספק לא סיפק את השירות? הקריאה תופץ מחדש לכל הספקים מלבד הספק הנוכחי.')) return;
    setBusy(true);
    try {
      await redistributeTender(id);
      navigate(`/client/tender/${id}/offers`, { replace: true });
    } catch (err) {
      alert(err?.message || 'החזרה להפצה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link
        to="/client/activity"
        className="mb-2 inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)]"
      >
        <ChevronLeft size={18} />
        הזמנות
      </Link>

      <Card>
        <h1 className="text-xl font-black">מעקב עזרה</h1>
        <p className="mt-1 text-sm font-bold text-sc-muted">{locationLabel}</p>

        {mapPoints.length > 0 ? (
          <Suspense fallback={<p className="mt-3 text-center text-sm font-bold text-sc-muted">טוען מפה…</p>}>
            <TrackMap points={mapPoints} className="mt-3" />
          </Suspense>
        ) : null}

        <p className="mt-3 font-black">{host?.name || 'ספק'}</p>
        <div className="mt-2 flex justify-between text-sm">
          <span className="font-bold text-sc-muted">הגעה</span>
          <span className="font-black">{bid?.etaMinutes || '—'} דק</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="font-bold text-sc-muted">עלות</span>
          <span className="font-black">{currency(request.amount || bid?.total || 0)}</span>
        </div>

        {canNavigate ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openExternal(wazeUrl(providerLat, providerLng))}
              className="flex items-center justify-center gap-2 rounded-sc-md bg-[#33ccff] py-3 text-sm font-black text-white"
            >
              <Navigation size={16} />
              Waze
            </button>
            <button
              type="button"
              onClick={() => openExternal(googleMapsUrl(providerLat, providerLng))}
              className="flex items-center justify-center gap-2 rounded-sc-md border border-sc-border bg-white py-3 text-sm font-black text-sc-text"
            >
              Google Maps
            </button>
          </div>
        ) : null}

        {request.status === 'completed' ? (
          <button
            type="button"
            onClick={() => navigate(`/client/receipt/${id}`)}
            className="sc-btn-primary mt-4 !text-sm"
          >
            צפה בקבלה
          </button>
        ) : (
          <p className="mt-4 text-center text-xs font-bold text-[var(--sc-accent-2)]">הספק בדרך — עדכון אוטומטי</p>
        )}

        {canRedistribute ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleRedistribute}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-sc-md border border-amber-300 bg-amber-50 py-3 text-sm font-black text-amber-900 disabled:opacity-60"
          >
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
            {busy ? 'מפיץ מחדש…' : 'ספק לא סיפק — החזר להפצה'}
          </button>
        ) : null}
      </Card>
    </>
  );
}
