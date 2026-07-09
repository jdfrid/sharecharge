import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { parseFormPayload } from './opsCrudSchemas';

export function OpsCrudModal({ open, title, schema, initialValues, onClose, onSave, saveLabel = 'שמור' }) {
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValues(initialValues || {});
    setError('');
  }, [open, initialValues]);

  if (!open) return null;

  const setField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    for (const field of schema) {
      if (field.required && (values[field.key] === '' || values[field.key] == null)) {
        setError(`שדה חובה: ${field.label}`);
        return;
      }
    }
    setBusy(true);
    try {
      await onSave(parseFormPayload(schema, values));
      onClose();
    } catch (err) {
      setError(err?.message || 'שמירה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--sc-border)] bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--sc-border)] bg-white px-5 py-4">
          <h3 className="text-lg font-black text-[var(--sc-accent)]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-sc-surface">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>
          ) : null}
          {schema.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-xs font-black text-sc-muted">{field.label}</span>
              {field.type === 'select' ? (
                <select
                  value={values[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  className="w-full rounded-xl border border-[var(--sc-border)] px-3 py-2 text-sm font-bold"
                >
                  <option value="">— בחר —</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={values[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--sc-border)] px-3 py-2 text-sm font-bold"
                />
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={Boolean(values[field.key])}
                  onChange={(e) => setField(field.key, e.target.checked)}
                  className="h-4 w-4 rounded"
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  value={values[field.key] ?? ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  className="w-full rounded-xl border border-[var(--sc-border)] px-3 py-2 text-sm font-bold"
                />
              )}
            </label>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--sc-accent)] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {saveLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--sc-border)] px-4 py-2.5 text-sm font-black"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
