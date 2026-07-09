import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useShareCharge } from '../../../context/ShareChargeContext';
import { PageHeader, StatCard } from './OpsAdminUi';

export function OpsDesktopOverviewPage() {
  const { state } = useShareCharge();
  const drivers = state.users.filter((u) => u.role === 'driver');
  const hosts = state.users.filter((u) => u.role === 'host');
  const openTenders = state.serviceRequests.filter((r) => !['completed', 'cancelled'].includes(r.status));
  const hasTestClutter =
    state.bookings.length > 0 ||
    state.serviceRequests.length > 0 ||
    (state.payments?.length || 0) > 0 ||
    state.disputes.length > 0;

  return (
    <>
      <PageHeader
        title="סקירת מערכת"
        subtitle="תמונת מצב ניהולית — מחיקה פריט-פריט או איפוס מהיר לפני בדיקות."
      />

      {hasTestClutter ? (
        <Link
          to="/ops/console/tools"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300 bg-gradient-to-l from-amber-50 to-orange-50 p-4 shadow-sm transition hover:border-amber-400"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white">
            <Trash2 size={20} />
          </span>
          <div>
            <p className="font-black text-amber-950">ניקוי מהיר לבדיקות</p>
            <p className="text-sm font-bold text-amber-900/80">
              {state.bookings.length} הזמנות · {state.serviceRequests.length} קריאות SOS ·{' '}
              {state.serviceBids.length} הצעות — לחצו לאיפוס (שומר לקוחות ועמדות)
            </p>
          </div>
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="לקוחות" value={drivers.length} hint={`${drivers.filter((u) => u.blocked).length} חסומים`} />
        <StatCard label="ספקים" value={hosts.length} hint={`${state.stations.length} עמדות / נקודות`} />
        <StatCard label="הזמנות" value={state.bookings.length} hint={`${state.disputes.length} מחלוקות`} />
        <StatCard label="קריאות SOS פעילות" value={openTenders.length} hint={`${state.serviceBids.length} הצעות`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--sc-border)] bg-white p-5 shadow-sm">
          <h3 className="font-black text-sc-text">קיצורי דרך</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ['/ops/console/users', 'ניהול משתמשים'],
              ['/ops/console/stations', 'עמדות ו-SOS'],
              ['/ops/console/bookings', 'הזמנות טעינה'],
              ['/ops/console/tenders', 'קריאות חירום'],
              ['/ops/console/tools', 'איפוס בדיקות'],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className="rounded-xl border border-[var(--sc-border)] bg-sc-surface/50 px-4 py-3 text-sm font-black text-[var(--sc-accent)] hover:bg-[var(--sc-accent)]/10"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--sc-border)] bg-white p-5 shadow-sm">
          <h3 className="font-black text-sc-text">פעילות אחרונה</h3>
          <ul className="mt-4 space-y-2">
            {(state.events || []).slice(0, 8).map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-3 text-xs">
                <span className="font-bold text-sc-text">{event.text}</span>
                <span className="shrink-0 font-bold text-sc-muted">
                  {new Date(event.time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
            {!state.events?.length ? (
              <li className="text-sm font-bold text-sc-muted">אין אירועים</li>
            ) : null}
          </ul>
        </section>
      </div>
    </>
  );
}
