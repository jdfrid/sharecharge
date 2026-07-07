import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Navigation } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { resolveDriverIdForSession } from '../../auth/identity';
import { googleMapsUrl, openExternal, wazeUrl } from '../../utils/navigationLinks';
import { Card } from '../../components/ui/Card';

export function ClientNavigatePage() {
  const { bookingId } = useParams();
  const { state } = useShareCharge();
  const myDriverId = resolveDriverIdForSession(state);
  const booking =
    state.bookings.find((item) => item.id === bookingId) ||
    state.bookings.find((item) => item.driverId === myDriverId && !['completed', 'rejected', 'cancelled'].includes(item.status));
  const station = booking ? state.stations.find((item) => item.id === booking.stationId) : null;

  if (!booking || !station) {
    return <Navigate to="/client/charging/map" replace />;
  }

  return (
    <>
      <Link
        to="/client/activity"
        className="mb-2 inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)]"
      >
        <ChevronLeft size={18} />
        להזמנות
      </Link>

      <Card>
        <h1 className="text-xl font-black">בדרך לעמדה</h1>
        <p className="mt-2 font-black text-sc-text">{station.name}</p>
        <p className="mt-1 flex items-start gap-1 text-sm font-bold text-sc-muted">
          <MapPin size={16} className="mt-0.5" />
          {station.address}
        </p>
        <p className="mt-4 text-sm font-bold text-sc-muted">פתחו ניווט ליעד:</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openExternal(wazeUrl(station.lat, station.lng))}
            className="sc-btn-primary !py-3 !text-sm"
          >
            <Navigation size={18} />
            Waze
          </button>
          <button
            type="button"
            onClick={() => openExternal(googleMapsUrl(station.lat, station.lng))}
            className="rounded-sc-md border border-sc-border bg-white py-3 text-sm font-black text-sc-text shadow-sm"
          >
            Google Maps
          </button>
        </div>
        <Link to="/client/activity" className="mt-4 block text-center text-sm font-black text-[var(--sc-accent)]">
          המשך למעקב הזמנה →
        </Link>
      </Card>
    </>
  );
}
