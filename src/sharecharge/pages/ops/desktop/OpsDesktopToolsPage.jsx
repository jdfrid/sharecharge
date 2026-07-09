import { useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { useShareCharge } from '../../../context/ShareChargeContext';
import { shortTime } from '../../../utils';
import { AdminTable, ConfirmDeleteButton, PageHeader } from './OpsAdminUi';

export function OpsDesktopToolsPage() {
  const { state, resetTestingData, clearEvents, reset, refreshFromApi, deleteAdminEntity } = useShareCharge();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const run = async (key, fn, successText) => {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(successText);
    } catch (err) {
      setError(err?.message || 'הפעולה נכשלה');
    } finally {
      setBusy('');
    }
  };

  const removeDispute = async (dispute) => {
    setError('');
    try {
      await deleteAdminEntity('dispute', dispute.id);
    } catch (err) {
      setError(err?.message || 'מחיקה נכשלה');
    }
  };

  const removePayment = async (payment) => {
    setError('');
    try {
      await deleteAdminEntity('payment', payment.id);
    } catch (err) {
      setError(err?.message || 'מחיקה נכשלה');
    }
  };

  return (
    <>
      <PageHeader
        title="כלים וניקוי בדיקות"
        subtitle="איפוס מהיר לפני בדיקות — שומר משתמשים ועמדות, מוחק הזמנות · SOS · תשלומים."
      />

      {message ? (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-800">{message}</p>
      ) : null}
      {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-700" size={20} />
            <div>
              <h3 className="font-black text-amber-900">איפוס נתוני בדיקות</h3>
              <p className="mt-2 text-sm font-bold text-amber-900/80">
                מוחק: הזמנות, קריאות SOS, הצעות, תשלומים, מחלוקות, יומן פעילות.
                <br />
                <strong>לא</strong> מוחק: לקוחות, ספקים, עמדות.
              </p>
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  run('testing', () => resetTestingData(), 'נתוני הבדיקות אופסו בהצלחה')
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                {busy === 'testing' ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                איפוס נתוני בדיקות
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--sc-border)] bg-white p-5 shadow-sm">
          <h3 className="font-black text-sc-text">פעולות נוספות</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => run('refresh', () => refreshFromApi('system'), 'הנתונים רועננו מהשרת')}
              className="rounded-xl border border-[var(--sc-border)] px-4 py-2 text-sm font-black hover:bg-sc-surface disabled:opacity-60"
            >
              רענון מהשרת
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() =>
                run('events', () => clearEvents(), 'יומן הפעילות נוקה')
              }
              className="rounded-xl border border-[var(--sc-border)] px-4 py-2 text-sm font-black hover:bg-sc-surface disabled:opacity-60"
            >
              ניקוי יומן פעילות
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => {
                if (!window.confirm('לאפס הזמנות טעינה בלבד (ללא SOS)?')) return;
                run('bookings', () => reset(), 'הזמנות הטעינה אופסו');
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-60"
            >
              איפוס הזמנות (legacy)
            </button>
          </div>
        </section>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 font-black text-sc-text">מחלוקות</h3>
        <AdminTable
          columns={[
            { key: 'id', label: 'מזהה', render: (row) => row.id.slice(0, 10) },
            { key: 'reason', label: 'סיבה' },
            { key: 'status', label: 'סטטוס' },
            {
              key: 'actions',
              label: 'פעולות',
              render: (row) => (
                <ConfirmDeleteButton confirmText="למחוק מחלוקת?" onConfirm={() => removeDispute(row)} />
              ),
            },
          ]}
          rows={state.disputes}
          emptyText="אין מחלוקות"
        />
      </div>

      <div className="mt-8">
        <h3 className="mb-3 font-black text-sc-text">תשלומים</h3>
        <AdminTable
          columns={[
            { key: 'id', label: 'מזהה', render: (row) => row.id.slice(0, 10) },
            { key: 'title', label: 'תיאור' },
            { key: 'amount', label: 'סכום', render: (row) => `₪${row.amount}` },
            { key: 'status', label: 'סטטוס' },
            { key: 'createdAt', label: 'נוצר', render: (row) => shortTime(row.createdAt) },
            {
              key: 'actions',
              label: 'פעולות',
              render: (row) => (
                <ConfirmDeleteButton confirmText="למחוק תשלום?" onConfirm={() => removePayment(row)} />
              ),
            },
          ]}
          rows={state.payments || []}
          emptyText="אין תשלומים"
        />
      </div>

      <div className="mt-8">
        <h3 className="mb-3 font-black text-sc-text">יומן פעילות (20 אחרונים)</h3>
        <AdminTable
          columns={[
            { key: 'text', label: 'אירוע' },
            { key: 'type', label: 'סוג' },
            { key: 'time', label: 'זמן', render: (row) => shortTime(row.time) },
          ]}
          rows={state.events || []}
          emptyText="אין אירועים"
        />
      </div>
    </>
  );
}
