import { createPortal } from 'react-dom';

export function ProviderReviseSheet({
  counterTotal,
  counterEta,
  yourTotal,
  yourEta,
  total,
  eta,
  onTotalChange,
  onEtaChange,
  onClose,
  onSubmit,
  busy = false,
}) {
  const sheet = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <div dir="rtl" className="w-full max-w-md overflow-hidden rounded-sc-lg bg-white shadow-sc-card">
        <div className="border-b border-violet-100 bg-violet-50 px-5 py-4">
          <h3 className="text-lg font-black text-violet-900">תגובה להצעה נגדית</h3>
          <p className="mt-1 text-sm font-bold text-sc-muted">
            לקוח מבקש {counterTotal != null ? `₪${counterTotal}` : '—'} · {counterEta ?? '—'} דק
          </p>
          <p className="mt-1 text-xs font-bold text-sc-muted">
            הצעתך הנוכחית: ₪{yourTotal} · {yourEta} דק
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-sc-muted">
              מחיר מעודכן (₪)
              <input
                type="number"
                value={total}
                onChange={(e) => onTotalChange(e.target.value)}
                className="mt-1 w-full rounded-sc-sm border border-sc-border px-2 py-2.5 font-black"
              />
            </label>
            <label className="text-xs font-bold text-sc-muted">
              זמן הגעה (דק)
              <input
                type="number"
                value={eta}
                onChange={(e) => onEtaChange(e.target.value)}
                className="mt-1 w-full rounded-sc-sm border border-sc-border px-2 py-2.5 font-black"
              />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] touch-manipulation rounded-sc-md border border-sc-border py-3 text-sm font-black"
            >
              ביטול
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSubmit}
              className="min-h-[48px] touch-manipulation rounded-sc-md bg-violet-600 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {busy ? 'שולח…' : 'שלח עדכון ללקוח'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
