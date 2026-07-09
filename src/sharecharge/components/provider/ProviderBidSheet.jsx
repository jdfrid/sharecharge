import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { EMERGENCY_CATEGORIES } from '../../constants';

const DEFAULT_LINES = {
  flat_tire: [
    { label: 'נסיעה', amount: 60 },
    { label: "תיקון פנצ'ר", amount: 60 },
  ],
  fuel: [
    { label: 'נסיעה', amount: 50 },
    { label: '2 ליטר דלק', amount: 30 },
  ],
  tow: [{ label: 'גרירה', amount: 700 }],
  battery: [
    { label: 'התנעה', amount: 50 },
    { label: 'מצבר חדש', amount: 650 },
  ],
};

export function ProviderBidSheet({ requestId, category, onClose, onSubmit, error = '' }) {
  const [lines, setLines] = useState(() => DEFAULT_LINES[category] || DEFAULT_LINES.flat_tire);
  const [etaMinutes, setEtaMinutes] = useState(12);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0), [lines]);

  const submit = async () => {
    if (!Number.isFinite(total) || total <= 0) {
      alert('יש להזין מחיר גדול מאפס');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ lineItems: lines, total, etaMinutes });
    } finally {
      setBusy(false);
    }
  };

  const sheet = (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-bid-title"
    >
      <div
        dir="rtl"
        className="flex max-h-[min(78vh,calc(100dvh-6rem-env(safe-area-inset-bottom,0px)))] w-full max-w-md flex-col overflow-hidden rounded-sc-lg bg-white shadow-sc-card"
      >
        <div className="flex-1 overflow-y-auto p-5 pb-3">
          <h3 id="provider-bid-title" className="text-lg font-black">
            הצעת מחיר
          </h3>
          <p className="mt-1 text-sm font-bold text-sc-muted">
            {EMERGENCY_CATEGORIES[category]?.label || category} · #{requestId.slice(-6)}
          </p>

          <div className="mt-4 space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px] gap-2">
                <input
                  value={line.label}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...next[index], label: e.target.value };
                    setLines(next);
                  }}
                  className="sc-field mt-0 !py-2 text-sm"
                />
                <input
                  type="number"
                  value={line.amount}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...next[index], amount: Number(e.target.value) };
                    setLines(next);
                  }}
                  className="sc-field mt-0 !py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <label className="mt-3 block text-xs font-bold text-sc-muted">
            ETA (דקות)
            <input
              type="number"
              value={etaMinutes}
              onChange={(e) => setEtaMinutes(Number(e.target.value))}
              className="sc-field mt-1 !py-2 text-sm"
            />
          </label>

          <div className="mt-3 flex items-center justify-between font-black">
            <span>סה״כ</span>
            <span>₪{total}</span>
          </div>

          {error ? (
            <p className="mt-3 rounded-sc-sm border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-sc-border/70 bg-white p-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] touch-manipulation rounded-sc-md border border-sc-border py-3 text-sm font-black"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="sc-btn-primary min-h-[48px] touch-manipulation !py-3 !text-sm"
            >
              {busy ? 'שולח…' : 'שלח הצעה'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
