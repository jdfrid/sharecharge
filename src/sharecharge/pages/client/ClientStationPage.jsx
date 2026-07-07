import { useMemo, useState } from 'react';

import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { ChevronLeft, MapPin, Star, Zap } from 'lucide-react';

import { useShareCharge } from '../../context/ShareChargeContext';

import { formatShareChargeApiError } from '../../data/sharechargeApi';

import { loadVehicleProfile } from '../../utils/vehicleProfile';

import { getStationAvailability } from '../../utils/stationAvailability';
import { isChargingStation } from '../../utils/serviceCategories';

import { requireClientAuth } from '../../utils/requireClientAuth';

import { Card } from '../../components/ui/Card';



export function ClientStationPage() {

  const { stationId } = useParams();

  const navigate = useNavigate();

  const { state, createBooking } = useShareCharge();

  const station = state.stations.find((s) => s.id === stationId);

  const profile = loadVehicleProfile();

  const [selectedTime, setSelectedTime] = useState('19:30');

  const [durationHours, setDurationHours] = useState(2);

  const [busy, setBusy] = useState(false);

  const [submitError, setSubmitError] = useState('');



  const availability = useMemo(() => {

    if (!station) return null;

    return getStationAvailability(station, state.bookings);

  }, [station, state.bookings]);



  if (!station || !isChargingStation(station)) {

    return <Navigate to="/client/charging/map" replace />;

  }



  const host = state.users.find((u) => u.id === station.hostId);

  const estimated = Number((durationHours * station.pricePerKwh * 12).toFixed(0));

  const canBook = availability?.canBook !== false;



  const submitBooking = async () => {

    setBusy(true);

    setSubmitError('');

    try {

      const bookingId = await createBooking({

        stationId: station.id,

        startTime: selectedTime,

        durationHours,

      });

      navigate(`/client/navigate/${bookingId || 'latest'}`, { replace: true });

    } catch (err) {

      const message = formatShareChargeApiError(err, 'booking');

      setSubmitError(message);

      if (err.status === 401) {

        setTimeout(() => navigate('/client/auth', { replace: true }), 1500);

      }

    } finally {

      setBusy(false);

    }

  };



  const handleConfirm = () => {

    if (!canBook) {

      setSubmitError(availability?.reason || 'לא ניתן להזמין עמדה זו כרגע');

      return;

    }

    const returnTo = `/client/charging/${station.id}`;

    const intent = {

      type: 'booking',

      stationId: station.id,

      startTime: selectedTime,

      durationHours,

      returnTo,

    };

    if (!requireClientAuth(navigate, intent, returnTo)) return;

    submitBooking();

  };



  return (

    <>

      <Link

        to="/client/charging/map"

        className="mb-2 inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)] shadow-sm"

      >

        <ChevronLeft size={18} />

        חזרה למפה

      </Link>



      <Card>

        <div className="flex flex-wrap items-center gap-2">

          <span className="rounded-full bg-[var(--sc-accent)]/10 px-3 py-1 text-xs font-black text-[var(--sc-accent)]">

            {station.plug} · {station.power}kW · ★ {station.rating}

          </span>

          <span

            className={`rounded-full px-3 py-1 text-xs font-black ${

              availability?.status === 'available'

                ? 'bg-[var(--sc-success)]/12 text-[var(--sc-success)]'

                : availability?.status === 'occupied'

                  ? 'bg-amber-100 text-amber-900'

                  : 'bg-red-100 text-red-800'

            }`}

          >

            {availability?.label}

          </span>

        </div>

        <h1 className="mt-3 text-xl font-black">{station.name}</h1>

        <p className="mt-1 flex items-start gap-1 text-sm font-bold text-sc-muted">

          <MapPin size={16} className="mt-0.5 shrink-0" />

          {station.address}

        </p>

        {availability?.reason ? (

          <p className="mt-3 rounded-sc-sm border border-sc-border bg-sc-surface p-3 text-sm font-bold text-sc-muted">

            {availability.reason}

          </p>

        ) : null}

        {host ? (

          <p className="mt-2 text-xs font-bold text-sc-muted">

            ספק: <span className="text-sc-text">{host.name}</span>

          </p>

        ) : null}

      </Card>



      <Card>

        <h2 className="mb-3 text-lg font-black">פרטי ההזמנה</h2>

        {[

          ['רכב', profile.vehicle],

          ['שקע', station.plug],

          ['זמן הגעה', selectedTime],

          ['משך', `${durationHours} שעות`],

          ['עלות משוערת', `₪${estimated}`],

        ].map(([label, value]) => (

          <div key={label} className="mb-2 flex items-center justify-between text-sm">

            <span className="font-bold text-sc-muted">{label}</span>

            {label === 'זמן הגעה' ? (

              <input

                value={selectedTime}

                onChange={(e) => setSelectedTime(e.target.value)}

                className="w-24 rounded-sc-sm border border-sc-border px-2 py-1 text-left font-black"

              />

            ) : label === 'משך' ? (

              <select

                value={durationHours}

                onChange={(e) => setDurationHours(Number(e.target.value))}

                className="rounded-sc-sm border border-sc-border px-2 py-1 font-black"

              >

                <option value={1}>שעה</option>

                <option value={2}>שעתיים</option>

                <option value={3}>3 שעות</option>

              </select>

            ) : (

              <span className="font-black text-sc-text">{value}</span>

            )}

          </div>

        ))}



        <button

          type="button"

          onClick={handleConfirm}

          disabled={busy || !canBook}

          className="mt-4 flex w-full items-center justify-center gap-2 rounded-sc-md bg-gradient-to-l from-[#007bff] via-[#0095ff] to-[#00d1c1] py-4 text-base font-black text-white shadow-sc-card disabled:opacity-60"

        >

          {busy ? 'שולח…' : canBook ? 'הזמן עמדה' : 'לא ניתן להזמין כרגע'}

          <Zap size={20} />

        </button>

        {submitError ? <p className="mt-3 text-center text-sm font-bold text-red-600">{submitError}</p> : null}

      </Card>

    </>

  );

}

