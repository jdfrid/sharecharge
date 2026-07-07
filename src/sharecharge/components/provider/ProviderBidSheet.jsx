import { useMemo, useState } from 'react';
import { EMERGENCY_CATEGORIES } from '../../constants';

const DEFAULT_LINES = {
  flat_tire: [
    { label: 'נסיעה', amount: 60 },
    { label: "סpray + פנצ'ר", amount: 60 },
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

export function ProviderBidSheet({ requestId, category, onClose, onSubmit }) {
  const [lines, setLines] = useState(() => DEFAULT_LINES[category] || DEFAULT_LINES.flat_tire);
  const [etaMinutes, setEtaMinutes] = useState(12);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0), [lines]);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({ lineItems: lines, total, etaMinutes });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div dir="rtl" className="w-full max-w-md rounded-sc-lg bg-white p-5 shadow-sc-card">
        <h3 className="text-lg font-black">הצעת מחיר</h3>
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

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-sc-md border border-sc-border py-3 text-sm font-black">
            ביטול
          </button>
          <button type="button" onClick={submit} disabled={busy} className="sc-btn-primary !py-3 !text-sm">
            {busy ? '…' : 'שלח הצעה'}
          </button>
        </div>
      </div>
    </div>
  );
}
