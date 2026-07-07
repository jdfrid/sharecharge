import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';

export function TranzilaCheckoutForm({ onSubmit, busy, submitLabel = 'שלם עכשיו' }) {
  const [number, setNumber] = useState('4580 0000 0000 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [holder, setHolder] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.({ number: number.replace(/\s/g, ''), expiry, cvv, holder });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 rounded-[var(--sc-radius-md)] border border-sc-border bg-sc-surface px-3 py-2">
        <CreditCard size={18} className="text-[var(--sc-accent)]" />
        <div>
          <p className="text-xs font-black text-sc-text">Tranzila Secure Checkout</p>
          <p className="text-[10px] font-bold text-sc-muted">PCI · הצפנה end-to-end</p>
        </div>
        <Lock size={16} className="mr-auto text-[var(--sc-success)]" />
      </div>

      <label className="block text-[11px] font-bold text-sc-muted">
        מספר כרטיס
        <input
          className="sc-field mt-1"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="numeric"
          autoComplete="cc-number"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-bold text-sc-muted">
          תוקף
          <input className="sc-field mt-1" value={expiry} onChange={(e) => setExpiry(e.target.value)} autoComplete="cc-exp" />
        </label>
        <label className="block text-[11px] font-bold text-sc-muted">
          CVV
          <input className="sc-field mt-1" value={cvv} onChange={(e) => setCvv(e.target.value)} inputMode="numeric" autoComplete="cc-csc" />
        </label>
      </div>
      <label className="block text-[11px] font-bold text-sc-muted">
        שם בעל הכרטיס
        <input className="sc-field mt-1" value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="cc-name" />
      </label>

      <button type="submit" disabled={busy} className="sc-btn-primary mt-2 disabled:opacity-60">
        {busy ? 'מעבד תשלום…' : submitLabel}
      </button>
    </form>
  );
}
