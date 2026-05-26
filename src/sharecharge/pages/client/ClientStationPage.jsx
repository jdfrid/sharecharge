import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Zap } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { formatShareChargeApiError } from '../../data/sharechargeApi';
import { Card } from '../../components/ui/Card';
import { getSessionClientEmail } from '../../auth/identity';

export function ClientStationPage() {
  const { stationId } = useParams();
  const navigate = useNavigate();
  const { state, createBooking } = useShareCharge();
  const station = state.stations.find((s) => s.id === stationId);
  const [selectedTime, setSelectedTime] = useState('19:30');
  const [durationHours, setDurationHours] = useState(2);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!station) {
    return <Navigate to="/client/discover" replace />;
  }

  const host = state.users.find((u) => u.id === station.hostId);

  const handleConfirm = async () => {
    setBusy(true);
    setSubmitError('');
    try {
      await createBooking({ stationId: station.id, startTime: selectedTime, durationHours });
      navigate('/client/activity', { replace: true });
    } catch (err) {
      const message = formatShareChargeApiError(err, 'booking');
      setSubmitError(message);
      if (err.status === 401) {
        setTimeout(() => navigate('/client/entry', { replace: true }), 2000);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <Link
          to="/client/discover"
          className="inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)] shadow-sm"
        >
          <ChevronLeft size={18} />
          חזרה לרשימה
        </Link>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--sc-surface)] text-[var(--sc-accent)]">
            <Zap size={25} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-sc-text">{station.name}</h1>
            <p className="mt-1 flex items-start gap-1 text-sm font-bold text-sc-muted">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              {station.address}
            </p>
            {host ? (
              <p className="mt-2 text-xs font-bold text-sc-muted">
                ספק: <span className="text-sc-text">{host.name}</span>
                {host.email ? <span dir="ltr" className="mr-1 text-[11px]"> · {host.email}</span> : null}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-sc-sm border border-sc-border bg-sc-surface py-2">
            <p className="font-black text-sc-text">{station.power} kW</p>
            <p className="text-sc-muted">הספק</p>
          </div>
          <div className="rounded-sc-sm border border-sc-border bg-sc-surface py-2">
            <p className="font-black text-sc-text">{station.plug}</p>
            <p className="text-sc-muted">שקע</p>
          </div>
          <div className="rounded-sc-sm border border-sc-border bg-sc-surface py-2">
            <p className="font-black text-sc-text">₪{station.pricePerKwh}</p>
            <p className="text-sc-muted">לקוט״ש</p>
          </div>
        </div>
        {station.termsText ? (
          <div className="mt-4 rounded-sc-sm border border-sc-border bg-sc-surface p-3">
            <p className="text-xs font-black text-sc-text">תנאי הספק</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-sc-muted">{station.termsText}</p>
          </div>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-black text-sc-text">פרטי ההזמנה</h2>
        <p className="mb-3 text-xs font-bold text-sc-muted">
          מזוהה כלקוח: <span dir="ltr" className="text-sc-text">{getSessionClientEmail() || '—'}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold text-sc-muted">
            שעת הגעה משוערת
            <input
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/25"
            />
          </label>
          <label className="text-sm font-bold text-sc-muted">
            משך שימוש משוער
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/25"
            >
              <option value={1}>שעה</option>
              <option value={2}>שעתיים</option>
              <option value={3}>שלוש שעות</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-sc-md bg-gradient-to-l from-[#007bff] via-[#0095ff] to-[#00d1c1] py-4 text-base font-black text-white shadow-sc-card disabled:opacity-60"
        >
          {busy ? 'שולח הזמנה…' : 'שלח בקשת הזמנה לספק'}
          <ChevronLeft size={20} />
        </button>
        {submitError ? (
          <p className="mt-3 text-center text-sm font-bold text-red-600">{submitError}</p>
        ) : null}
        <p className="mt-3 text-center text-[11px] font-bold text-sc-muted">
          לאחר האישור תועברו אוטומטית למסך המעקב מול הספק.
        </p>
      </Card>
    </>
  );
}
