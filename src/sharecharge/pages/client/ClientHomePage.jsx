import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronLeft, CreditCard } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { resolveDriverIdForSession } from '../../auth/identity';
import { isChargingStation } from '../../utils/serviceCategories';
import {
  loadVehicleProfile,
  saveVehicleProfile,
  PLUG_OPTIONS,
  SPEED_OPTIONS,
} from '../../utils/vehicleProfile';
import { ClientHomeMenu, HOME_MENU_BUILD } from '../../components/client/ClientHomeMenu';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';

export function ClientHomePage() {
  const navigate = useNavigate();
  const { state } = useShareCharge();
  const [profile, setProfile] = useState(() => loadVehicleProfile());
  const [profileOpen, setProfileOpen] = useState(false);
  const batteryPct = 78;
  const rangeKm = 312;

  const myDriverId = useMemo(() => resolveDriverIdForSession(state), [state.users]);
  const activeBooking = useMemo(() => {
    const bookings = state.bookings.filter((item) => item.driverId === myDriverId);
    return bookings.find((item) => !['completed', 'rejected', 'cancelled'].includes(item.status));
  }, [state.bookings, myDriverId]);
  const activeStation = activeBooking
    ? state.stations.find((station) => station.id === activeBooking.stationId && isChargingStation(station))
    : null;
  const bookingTarget =
    activeBooking?.status === 'pending'
      ? '/client/activity'
      : activeBooking
        ? `/client/navigate/${activeBooking.id}`
        : '/client/activity';

  const updateProfile = (patch) => {
    setProfile(saveVehicleProfile(patch));
  };

  return (
    <div className="space-y-4">
      <p className="sc-vehicle-strip">
        <span className="text-[var(--sc-success)]">מוכן לנסיעה</span>
        <span className="text-sc-muted">·</span>
        <span>{batteryPct}% סוללה</span>
        <span className="text-sc-muted">·</span>
        <span>{rangeKm} ק״מ</span>
        <span className="text-sc-muted">·</span>
        <span className="text-[10px] text-sc-muted">v{HOME_MENU_BUILD}</span>
      </p>

      {activeBooking ? (
        <Card className="border-[var(--sc-accent)]/25 bg-[var(--sc-accent)]/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-[var(--sc-accent)]">ההזמנה שלי</p>
              <h3 className="mt-1 text-lg font-black text-sc-text">{activeStation?.name || 'עמדת טעינה'}</h3>
              <p className="mt-1 text-sm font-bold text-sc-muted">{activeStation?.address || activeBooking.startTime}</p>
            </div>
            <StatusPill status={activeBooking.status} />
          </div>
          <Link
            to={bookingTarget}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-sc-md bg-gradient-to-l from-[#007bff] via-[#0095ff] to-[#00d1c1] py-3.5 text-sm font-black text-white shadow-sc-card"
          >
            {activeBooking.status === 'pending'
              ? 'ממתין לאישור ספק — צפייה בהזמנה'
              : activeBooking.status === 'approved'
                ? 'אושר — המשך לניווט'
                : 'המשך למעקב הזמנה'}
            <ChevronLeft size={18} />
          </Link>
        </Card>
      ) : null}

      <ClientHomeMenu />

      <p className="text-center text-[11px] font-bold text-sc-muted">
        שני שירותים עיקריים: הטענה חשמלית או SOS חירום (פנצ&apos;ר, דלק, גרר, מוסך)
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => navigate('/client/activity')}
          className="sc-quick-tile min-h-[4.5rem] items-start !px-3 !py-3 text-right"
        >
          <span className="sc-quick-tile__icon bg-[#0ea5e9]/10 text-[#0284c7]">
            <CalendarClock size={20} strokeWidth={2.25} />
          </span>
          <span className="text-sm font-black text-sc-text">הזמנות</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/client/payments')}
          className="sc-quick-tile min-h-[4.5rem] items-start !px-3 !py-3 text-right"
        >
          <span className="sc-quick-tile__icon bg-[#6366f1]/10 text-[#4f46e5]">
            <CreditCard size={20} strokeWidth={2.25} />
          </span>
          <span className="text-sm font-black text-sc-text">תשלומים</span>
        </button>
      </div>

      <section className="rounded-[var(--sc-radius-lg)] border border-sc-border bg-white p-4">
        <button
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-2 text-right"
        >
          <div>
            <p className="text-xs font-black text-[var(--sc-accent)]">העדפות טעינה</p>
            <p className="mt-1 text-sm font-black text-sc-text">
              {profileOpen
                ? 'עריכת שקע ומהירות'
                : `${PLUG_OPTIONS.find((item) => item.id === profile.plugId)?.label} · ${SPEED_OPTIONS.find((item) => item.id === profile.speedId)?.label}`}
            </p>
          </div>
          <span className="text-xs font-black text-[var(--sc-accent)]">{profileOpen ? 'סגור' : 'עריכה'}</span>
        </button>

        {profileOpen ? (
          <div className="mt-4 border-t border-sc-border pt-4">
            <ChipRow
              label="איזה שקע?"
              options={PLUG_OPTIONS.map((item) => item.label)}
              value={PLUG_OPTIONS.find((item) => item.id === profile.plugId)?.label}
              onChange={(label) => {
                const plug = PLUG_OPTIONS.find((item) => item.label === label);
                if (plug) updateProfile({ plugId: plug.id });
              }}
            />
            <ChipRow
              label="מהירות טעינה?"
              options={SPEED_OPTIONS.map((item) => item.label)}
              value={SPEED_OPTIONS.find((item) => item.id === profile.speedId)?.label}
              onChange={(label) => {
                const speed = SPEED_OPTIONS.find((item) => item.label === label);
                if (speed) updateProfile({ speedId: speed.id });
              }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ChipRow({ label, options, value, onChange }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-[11px] font-bold text-sc-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`sc-chip ${active ? 'sc-chip--active' : 'sc-chip--idle'}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
