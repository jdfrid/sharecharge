import { useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

export function EditButton({ onClick, label = 'ערוך' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-[var(--sc-border)] bg-white px-2.5 py-1.5 text-[11px] font-black text-sc-text hover:bg-sc-surface"
    >
      <Pencil size={12} />
      {label}
    </button>
  );
}

export function AddButton({ onClick, label = 'הוסף' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--sc-accent)] px-3 py-2 text-xs font-black text-white hover:opacity-90"
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

export function RowActions({ onEdit, onDelete, deleteConfirm, canDelete = true, canEdit = true }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canEdit && onEdit ? <EditButton onClick={onEdit} /> : null}
      {canDelete && onDelete ? (
        <ConfirmDeleteButton confirmText={deleteConfirm} onConfirm={onDelete} />
      ) : null}
    </div>
  );
}

export function ConfirmDeleteButton({ label, confirmText, onConfirm, disabled }) {
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  const run = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    if (!window.confirm(confirmText || 'למחוק לצמיתות?')) {
      setArmed(false);
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={run}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition ${
        armed
          ? 'bg-[var(--sc-danger)] text-white'
          : 'border border-red-200 bg-red-50 text-[var(--sc-danger)] hover:bg-red-100'
      } disabled:opacity-50`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      {armed ? 'אשר מחיקה' : label || 'מחק'}
    </button>
  );
}

export function AdminTable({ columns, rows, emptyText = 'אין נתונים' }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--sc-border)] bg-white px-4 py-10 text-center text-sm font-bold text-sc-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--sc-border)] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-sc-surface/80 text-[11px] font-black uppercase tracking-wide text-sc-muted">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-4 py-3">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sc-border)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-sc-surface/40">
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3 font-bold text-sc-text">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-[var(--sc-accent)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-bold text-sc-muted">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function RefreshButton({ onRefresh, busy }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onRefresh}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--sc-border)] bg-white px-3 py-2 text-xs font-black text-sc-text hover:bg-sc-surface disabled:opacity-60"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
      רענון
    </button>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-[var(--sc-border)] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase text-sc-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-sc-text">{value}</p>
      {hint ? <p className="mt-1 text-xs font-bold text-sc-muted">{hint}</p> : null}
    </div>
  );
}
