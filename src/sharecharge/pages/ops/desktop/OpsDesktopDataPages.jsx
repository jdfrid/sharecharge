import { useMemo, useState } from 'react';
import { useShareCharge } from '../../../context/ShareChargeContext';
import { shortTime } from '../../../utils';
import { serviceCategoryLabel } from '../../../utils/serviceCategories';
import { AdminTable, ConfirmDeleteButton, PageHeader } from './OpsAdminUi';

const roleLabel = { driver: 'לקוח', host: 'ספק', admin: 'מנהל' };

export function OpsDesktopUsersPage() {
  const { state, deleteAdminEntity } = useShareCharge();
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.users
      .filter((user) => roleFilter === 'all' || user.role === roleFilter)
      .filter((user) => !q || user.name?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q))
      .map((user) => ({ ...user, roleLabel: roleLabel[user.role] || user.role }));
  }, [state.users, roleFilter, query]);

  const remove = async (user) => {
    setError('');
    try {
      await deleteAdminEntity('user', user.id);
    } catch (err) {
      setError(err?.message || 'מחיקה נכשלה');
    }
  };

  return (
    <>
      <PageHeader title="משתמשים" subtitle="מחיקת לקוח או ספק — מוחקת גם הזמנות, קריאות SOS ועמדות קשורות.">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם / אימייל"
          className="rounded-xl border border-[var(--sc-border)] px-3 py-2 text-xs font-bold"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-[var(--sc-border)] px-3 py-2 text-xs font-black"
        >
          <option value="all">כל התפקידים</option>
          <option value="driver">לקוחות</option>
          <option value="host">ספקים</option>
          <option value="admin">מנהלים</option>
        </select>
      </PageHeader>
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <AdminTable
        columns={[
          { key: 'name', label: 'שם' },
          { key: 'email', label: 'אימייל' },
          { key: 'roleLabel', label: 'תפקיד' },
          {
            key: 'blocked',
            label: 'סטטוס',
            render: (row) => (row.blocked ? 'חסום' : row.verified ? 'פעיל' : 'לא מאומת'),
          },
          {
            key: 'actions',
            label: 'פעולות',
            render: (row) =>
              row.role === 'admin' ? (
                <span className="text-xs text-sc-muted">—</span>
              ) : (
                <ConfirmDeleteButton
                  confirmText={`למחוק את ${row.name} (${row.email}) וכל הנתונים שלו?`}
                  onConfirm={() => remove(row)}
                />
              ),
          },
        ]}
        rows={rows}
      />
    </>
  );
}

export function OpsDesktopStationsPage() {
  const { state, deleteAdminEntity } = useShareCharge();
  const [error, setError] = useState('');

  const hostName = (id) => state.users.find((u) => u.id === id)?.name || id;

  const remove = async (station) => {
    setError('');
    try {
      await deleteAdminEntity('station', station.id);
    } catch (err) {
      setError(err?.message || 'מחיקה נכשלה');
    }
  };

  return (
    <>
      <PageHeader title="עמדות ונקודות SOS" subtitle="מחיקת עמדה מסירה גם הזמנות טעינה קשורות." />
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <AdminTable
        columns={[
          { key: 'name', label: 'שם' },
          { key: 'address', label: 'כתובת' },
          {
            key: 'serviceCategory',
            label: 'סוג',
            render: (row) => serviceCategoryLabel(row.serviceCategory),
          },
          { key: 'hostId', label: 'ספק', render: (row) => hostName(row.hostId) },
          {
            key: 'actions',
            label: 'פעולות',
            render: (row) => (
              <ConfirmDeleteButton
                confirmText={`למחוק את העמדה «${row.name}»?`}
                onConfirm={() => remove(row)}
              />
            ),
          },
        ]}
        rows={state.stations}
      />
    </>
  );
}

export function OpsDesktopBookingsPage() {
  const { state, deleteAdminEntity } = useShareCharge();
  const [error, setError] = useState('');

  const stationName = (id) => state.stations.find((s) => s.id === id)?.name || id;

  const remove = async (booking) => {
    setError('');
    try {
      await deleteAdminEntity('booking', booking.id);
    } catch (err) {
      setError(err?.message || 'מחיקה נכשלה');
    }
  };

  return (
    <>
      <PageHeader title="הזמנות טעינה" subtitle="מחיקת הזמנה מסירה גם עסקאות ומחלוקות קשורות." />
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <AdminTable
        columns={[
          { key: 'id', label: 'מזהה', render: (row) => row.id.slice(0, 12) },
          { key: 'stationId', label: 'עמדה', render: (row) => stationName(row.stationId) },
          { key: 'status', label: 'סטטוס' },
          { key: 'amount', label: 'סכום', render: (row) => `₪${row.amount}` },
          { key: 'createdAt', label: 'נוצר', render: (row) => shortTime(row.createdAt) },
          {
            key: 'actions',
            label: 'פעולות',
            render: (row) => (
              <ConfirmDeleteButton confirmText={`למחוק הזמנה ${row.id}?`} onConfirm={() => remove(row)} />
            ),
          },
        ]}
        rows={state.bookings}
      />
    </>
  );
}

export function OpsDesktopTendersPage() {
  const { state, deleteAdminEntity } = useShareCharge();
  const [error, setError] = useState('');

  const bidCount = (requestId) => state.serviceBids.filter((b) => b.requestId === requestId).length;

  const remove = async (tender) => {
    setError('');
    try {
      await deleteAdminEntity('tender', tender.id);
    } catch (err) {
      setError(err?.message || 'מחיקה נכשלה');
    }
  };

  return (
    <>
      <PageHeader title="קריאות חירום (SOS)" subtitle="מחיקת קריאה מסירה גם את כל הצעות המחיר שלה." />
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <AdminTable
        columns={[
          { key: 'id', label: 'מזהה', render: (row) => row.id.slice(0, 12) },
          {
            key: 'category',
            label: 'סוג',
            render: (row) => serviceCategoryLabel(row.category),
          },
          { key: 'status', label: 'סטטוס' },
          { key: 'addressText', label: 'מיקום', render: (row) => row.addressText || 'GPS' },
          { key: 'bids', label: 'הצעות', render: (row) => bidCount(row.id) },
          { key: 'createdAt', label: 'נוצר', render: (row) => shortTime(row.createdAt) },
          {
            key: 'actions',
            label: 'פעולות',
            render: (row) => (
              <ConfirmDeleteButton
                confirmText={`למחוק קריאת SOS (${row.category})?`}
                onConfirm={() => remove(row)}
              />
            ),
          },
        ]}
        rows={state.serviceRequests}
      />
    </>
  );
}
