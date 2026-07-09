import { useMemo, useState } from 'react';
import { useShareCharge } from '../../../context/ShareChargeContext';
import { shortTime } from '../../../utils';
import { serviceCategoryLabel } from '../../../utils/serviceCategories';
import { statusLabels, tenderStatusLabels } from '../../../constants';
import { AdminTable, AddButton, PageHeader, RowActions } from './OpsAdminUi';
import { OpsCrudModal } from './OpsCrudModal';
import {
  bidEditSchema,
  bookingEditSchema,
  buildStationOptions,
  buildUserOptions,
  serializeFormValues,
  stationCreateSchema,
  stationEditSchema,
  tenderEditSchema,
  userCreateSchema,
  userEditSchema,
} from './opsCrudSchemas';

const roleLabel = { driver: 'לקוח', host: 'ספק', admin: 'מנהל' };

function useCrudModal() {
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);
  const openEdit = (config) => setModal({ mode: 'edit', ...config });
  const openCreate = (config) => setModal({ mode: 'create', ...config });
  return { modal, close, openEdit, openCreate };
}

export function OpsDesktopUsersPage() {
  const { state, deleteAdminEntity, updateAdminEntity, createAdminEntity } = useShareCharge();
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [query, setQuery] = useState('');
  const { modal, close, openEdit, openCreate } = useCrudModal();

  const userCreateWithRole = () => [
    { key: 'role', label: 'תפקיד', type: 'select', options: [
      { value: 'driver', label: 'לקוח' },
      { value: 'host', label: 'ספק' },
    ], required: true },
    ...userCreateSchema(),
  ];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.users
      .filter((user) => roleFilter === 'all' || user.role === roleFilter)
      .filter((user) => !q || user.name?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q))
      .map((user) => ({ ...user, roleLabel: roleLabel[user.role] || user.role }));
  }, [state.users, roleFilter, query]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err?.message || 'הפעולה נכשלה');
      throw err;
    }
  };

  return (
    <>
      <PageHeader
        title="משתמשים"
        subtitle="יצירה, עריכה ומחיקה — לתיקון נתונים שחוסמים שירות."
      >
        <AddButton
          label="הוסף משתמש"
          onClick={() => {
            const schema = userCreateWithRole();
            openCreate({
              title: 'הוספת משתמש',
              schema,
              initialValues: serializeFormValues(schema, { role: 'driver' }),
              onSave: ({ role, ...payload }) => run(() => createAdminEntity(role, payload)),
            });
          }}
        />
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
                <RowActions
                  onEdit={() =>
                    openEdit({
                      title: `עריכת ${row.name}`,
                      schema: userEditSchema(),
                      initialValues: serializeFormValues(userEditSchema(), row),
                      onSave: (patch) => run(() => updateAdminEntity('user', row.id, patch)),
                    })
                  }
                  onDelete={() => run(() => deleteAdminEntity('user', row.id))}
                  deleteConfirm={`למחוק את ${row.name} (${row.email}) וכל הנתונים שלו?`}
                />
              ),
          },
        ]}
        rows={rows}
      />
      {modal ? (
        <OpsCrudModal
          open
          title={modal.title}
          schema={modal.schema}
          initialValues={modal.initialValues}
          onClose={close}
          onSave={modal.onSave}
          saveLabel={modal.mode === 'create' ? 'צור' : 'שמור'}
        />
      ) : null}
    </>
  );
}

export function OpsDesktopStationsPage() {
  const { state, deleteAdminEntity, updateAdminEntity, createAdminEntity } = useShareCharge();
  const [error, setError] = useState('');
  const { modal, close, openEdit, openCreate } = useCrudModal();
  const hostOptions = useMemo(() => buildUserOptions(state.users, 'host'), [state.users]);

  const hostName = (id) => state.users.find((u) => u.id === id)?.name || id;

  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err?.message || 'הפעולה נכשלה');
      throw err;
    }
  };

  return (
    <>
      <PageHeader title="עמדות ונקודות SOS" subtitle="יצירה, עריכה ומחיקה — כולל שינוי ספק וסטטוס זמינות.">
        <AddButton
          label="הוסף עמדה"
          onClick={() =>
            openCreate({
              title: 'הוספת עמדה / נקודת SOS',
              schema: stationCreateSchema(hostOptions),
              initialValues: serializeFormValues(stationCreateSchema(hostOptions), {
                serviceCategory: 'charging',
                hostId: hostOptions[0]?.value || '',
              }),
              onSave: (payload) => run(() => createAdminEntity('station', payload)),
            })
          }
        />
      </PageHeader>
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
            key: 'available',
            label: 'זמין',
            render: (row) => (row.available ? 'כן' : 'לא'),
          },
          {
            key: 'actions',
            label: 'פעולות',
            render: (row) => (
              <RowActions
                onEdit={() =>
                  openEdit({
                    title: `עריכת ${row.name}`,
                    schema: stationEditSchema(hostOptions),
                    initialValues: serializeFormValues(stationEditSchema(hostOptions), row),
                    onSave: (patch) => run(() => updateAdminEntity('station', row.id, patch)),
                  })
                }
                onDelete={() => run(() => deleteAdminEntity('station', row.id))}
                deleteConfirm={`למחוק את העמדה «${row.name}»?`}
              />
            ),
          },
        ]}
        rows={state.stations}
      />
      {modal ? (
        <OpsCrudModal open title={modal.title} schema={modal.schema} initialValues={modal.initialValues} onClose={close} onSave={modal.onSave} saveLabel={modal.mode === 'create' ? 'צור' : 'שמור'} />
      ) : null}
    </>
  );
}

export function OpsDesktopBookingsPage() {
  const { state, deleteAdminEntity, updateAdminEntity } = useShareCharge();
  const [error, setError] = useState('');
  const { modal, close, openEdit } = useCrudModal();
  const stationOptions = useMemo(() => buildStationOptions(state.stations), [state.stations]);
  const userOptions = useMemo(() => buildUserOptions(state.users), [state.users]);

  const stationName = (id) => state.stations.find((s) => s.id === id)?.name || id;

  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err?.message || 'הפעולה נכשלה');
      throw err;
    }
  };

  return (
    <>
      <PageHeader
        title="הזמנות טעינה"
        subtitle="עריכת סטטוס — לשחרור תקלות (למשל ביטול או סימון כהושלם)."
      />
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <AdminTable
        columns={[
          { key: 'id', label: 'מזהה', render: (row) => row.id.slice(0, 12) },
          { key: 'stationId', label: 'עמדה', render: (row) => stationName(row.stationId) },
          {
            key: 'status',
            label: 'סטטוס',
            render: (row) => statusLabels[row.status] || row.status,
          },
          { key: 'amount', label: 'סכום', render: (row) => `₪${row.amount}` },
          { key: 'createdAt', label: 'נוצר', render: (row) => shortTime(row.createdAt) },
          {
            key: 'actions',
            label: 'פעולות',
            render: (row) => (
              <RowActions
                onEdit={() =>
                  openEdit({
                    title: `עריכת הזמנה ${row.id.slice(0, 8)}`,
                    schema: bookingEditSchema(stationOptions, userOptions),
                    initialValues: serializeFormValues(bookingEditSchema(stationOptions, userOptions), row),
                    onSave: (patch) => run(() => updateAdminEntity('booking', row.id, patch)),
                  })
                }
                onDelete={() => run(() => deleteAdminEntity('booking', row.id))}
                deleteConfirm={`למחוק הזמנה ${row.id}?`}
              />
            ),
          },
        ]}
        rows={state.bookings}
      />
      {modal ? (
        <OpsCrudModal open title={modal.title} schema={modal.schema} initialValues={modal.initialValues} onClose={close} onSave={modal.onSave} />
      ) : null}
    </>
  );
}

export function OpsDesktopTendersPage() {
  const { state, deleteAdminEntity, updateAdminEntity } = useShareCharge();
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const { modal, close, openEdit } = useCrudModal();
  const userOptions = useMemo(() => buildUserOptions(state.users), [state.users]);

  const bidsFor = (requestId) => state.serviceBids.filter((b) => b.requestId === requestId);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err?.message || 'הפעולה נכשלה');
      throw err;
    }
  };

  const hostName = (id) => state.users.find((u) => u.id === id)?.name || id?.slice(0, 8);

  return (
    <>
      <PageHeader
        title="קריאות חירום (SOS)"
        subtitle="עריכת סטטוס וקריאות תקועות — כולל ניהול הצעות מחיר."
      />
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <AdminTable
        columns={[
          { key: 'id', label: 'מזהה', render: (row) => row.id.slice(0, 12) },
          {
            key: 'category',
            label: 'סוג',
            render: (row) => serviceCategoryLabel(row.category),
          },
          {
            key: 'status',
            label: 'סטטוס',
            render: (row) => tenderStatusLabels[row.status] || row.status,
          },
          { key: 'addressText', label: 'מיקום', render: (row) => row.addressText || 'GPS' },
          { key: 'bids', label: 'הצעות', render: (row) => bidsFor(row.id).length },
          { key: 'createdAt', label: 'נוצר', render: (row) => shortTime(row.createdAt) },
          {
            key: 'actions',
            label: 'פעולות',
            render: (row) => (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === row.id ? '' : row.id)}
                  className="rounded-lg border border-[var(--sc-border)] px-2 py-1 text-[11px] font-black"
                >
                  {expandedId === row.id ? 'הסתר הצעות' : 'הצעות'}
                </button>
                <RowActions
                  onEdit={() =>
                    openEdit({
                      title: `עריכת קריאה ${row.id.slice(0, 8)}`,
                      schema: tenderEditSchema(userOptions),
                      initialValues: serializeFormValues(tenderEditSchema(userOptions), row),
                      onSave: (patch) => run(() => updateAdminEntity('tender', row.id, patch)),
                    })
                  }
                  onDelete={() => run(() => deleteAdminEntity('tender', row.id))}
                  deleteConfirm={`למחוק קריאת SOS (${row.category})?`}
                />
              </div>
            ),
          },
        ]}
        rows={state.serviceRequests}
      />

      {expandedId ? (
        <div className="mt-4 rounded-2xl border border-[var(--sc-border)] bg-white p-4 shadow-sm">
          <h4 className="mb-3 font-black text-sc-text">הצעות לקריאה {expandedId.slice(0, 12)}</h4>
          <AdminTable
            emptyText="אין הצעות לקריאה זו"
            rows={bidsFor(expandedId)}
            columns={[
              { key: 'id', label: 'מזהה', render: (row) => row.id.slice(0, 10) },
              { key: 'hostId', label: 'ספק', render: (row) => hostName(row.hostId) },
              { key: 'total', label: 'סכום', render: (row) => `₪${row.total}` },
              { key: 'etaMinutes', label: 'ETA', render: (row) => `${row.etaMinutes || '—'} דק'` },
              { key: 'status', label: 'סטטוס' },
              {
                key: 'actions',
                label: 'פעולות',
                render: (row) => (
                  <RowActions
                    onEdit={() =>
                      openEdit({
                        title: `עריכת הצעה ${row.id.slice(0, 8)}`,
                        schema: bidEditSchema(userOptions),
                        initialValues: serializeFormValues(bidEditSchema(userOptions), row),
                        onSave: (patch) => run(() => updateAdminEntity('bid', row.id, patch, expandedId)),
                      })
                    }
                    onDelete={() => run(() => deleteAdminEntity('bid', row.id, expandedId))}
                    deleteConfirm="למחוק הצעת מחיר?"
                  />
                ),
              },
            ]}
          />
        </div>
      ) : null}

      {modal ? (
        <OpsCrudModal open title={modal.title} schema={modal.schema} initialValues={modal.initialValues} onClose={close} onSave={modal.onSave} />
      ) : null}
    </>
  );
}
