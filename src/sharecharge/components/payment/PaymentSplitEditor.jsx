import { Plus, Trash2 } from 'lucide-react';
import { currency } from '../../utils';
import { maskCard } from '../../utils/paymentUtils';

export function PaymentSplitEditor({ totalAmount, splits, methods, onChange }) {
  const updateAmount = (index, value) => {
    const next = splits.map((item, i) => (i === index ? { ...item, amount: Number(value) || 0 } : item));
    onChange(next);
  };

  const updateCard = (index, methodId) => {
    const method = methods.find((item) => item.id === methodId);
    if (!method) return;
    const next = splits.map((item, i) =>
      i === index
        ? { ...item, cardLast4: method.cardLast4, cardBrand: method.cardBrand, token: method.token }
        : item,
    );
    onChange(next);
  };

  const addSplit = () => {
    const method = methods[0];
    onChange([
      ...splits,
      {
        cardLast4: method?.cardLast4 || '4242',
        cardBrand: method?.cardBrand || 'visa',
        token: method?.token || 'default',
        amount: 0,
      },
    ]);
  };

  const removeSplit = (index) => {
    if (splits.length <= 1) return;
    onChange(splits.filter((_, i) => i !== index));
  };

  const sum = splits.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const balanced = Math.abs(sum - totalAmount) < 0.01;

  return (
    <section className="rounded-[var(--sc-radius-lg)] border border-sc-border bg-white p-4">
      <div className="sc-section-head">
        <h2>חלוקה בין כרטיסים</h2>
        <button type="button" onClick={addSplit} className="inline-flex items-center gap-1">
          <Plus size={14} />
          הוסף
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {splits.map((split, index) => (
          <div key={`${split.cardLast4}-${index}`} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
            {methods.length ? (
              <select
                className="sc-field !mt-0 !py-2 text-sm"
                value={methods.find((m) => m.cardLast4 === split.cardLast4)?.id || methods[0]?.id}
                onChange={(e) => updateCard(index, e.target.value)}
              >
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.cardBrand} {maskCard(method.cardLast4)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-[var(--sc-radius-sm)] border border-sc-border bg-sc-surface px-3 py-2 text-sm font-black">
                {maskCard(split.cardLast4)}
              </div>
            )}
            <input
              type="number"
              min="0"
              step="0.01"
              className="sc-field !mt-0 !py-2 text-sm"
              value={split.amount}
              onChange={(e) => updateAmount(index, e.target.value)}
            />
            <button type="button" onClick={() => removeSplit(index)} className="rounded-xl p-2 text-sc-muted hover:text-[var(--sc-danger)]">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-bold text-sc-muted">סה״כ חלוקה</span>
        <span className={`font-black ${balanced ? 'text-[var(--sc-success)]' : 'text-[var(--sc-danger)]'}`}>
          {currency(sum)} / {currency(totalAmount)}
        </span>
      </div>
    </section>
  );
}
