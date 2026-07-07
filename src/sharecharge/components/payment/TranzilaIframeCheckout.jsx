import { useEffect, useRef, useState } from 'react';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { currency } from '../../utils';

export function TranzilaIframeCheckout({ session, busy, onComplete, onError }) {
  const iframeRef = useRef(null);
  const formRef = useRef(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onMessage = (event) => {
      if (event?.data?.type !== 'tranzila-return') return;
      if (event.data.status === 'success') {
        onComplete?.(event.data);
      } else {
        onError?.(new Error('התשלום ב-Tranzila נכשל'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onComplete, onError]);

  useEffect(() => {
    if (!session || submitted) return;
    if (session.mock) return;
    const timer = setTimeout(() => {
      formRef.current?.submit();
      setSubmitted(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [session, submitted]);

  if (!session) {
    return <p className="text-center text-sm font-bold text-sc-muted">טוען Tranzila…</p>;
  }

  if (session.mock) {
    return (
      <div className="space-y-3">
        <div className="rounded-[var(--sc-radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          מצב בדיקות — הגדירו TRANZILA_TERMINAL ו-TRANZILA_PW בשרת לחיבור אמיתי.
        </div>
        <MockTranzilaPanel amount={session.splitAmount} busy={busy} onApprove={() => onComplete?.({ status: 'success', paymentId: session.paymentId, splitIndex: session.splitIndex })} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[var(--sc-radius-md)] border border-sc-border bg-sc-surface px-3 py-2">
        <CreditCard size={18} className="text-[var(--sc-accent)]" />
        <div>
          <p className="text-xs font-black text-sc-text">Tranzila Secure · {session.supplier}</p>
          <p className="text-[10px] font-bold text-sc-muted">
            כרטיס {Number(session.splitIndex) + 1} מתוך {session.totalSplits} · {currency(session.splitAmount)}
          </p>
        </div>
        <Lock size={16} className="mr-auto text-[var(--sc-success)]" />
      </div>

      <form ref={formRef} action={session.iframeUrl} target="tranzila_checkout" method="POST" className="hidden">
        {Object.entries(session.fields || {}).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>

      <div className="overflow-hidden rounded-[var(--sc-radius-lg)] border border-sc-border bg-white">
        <iframe
          ref={iframeRef}
          title="Tranzila Checkout"
          name="tranzila_checkout"
          className="h-[420px] w-full bg-white"
          sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
        />
      </div>

      <p className="text-center text-[10px] font-bold text-sc-muted">
        <ShieldCheck size={12} className="inline" /> PCI-DSS · הכרטיס נשמר אצל Tranzila בלבד
      </p>
    </div>
  );
}

function MockTranzilaPanel({ amount, busy, onApprove }) {
  return (
    <div className="rounded-[var(--sc-radius-lg)] border border-sc-border bg-[#0f172a] p-4 text-white">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-white/60">Tranzila Sandbox</p>
      <p className="mt-2 text-3xl font-black">{currency(amount)}</p>
      <p className="mt-2 text-sm text-white/75">מסך תשלום מדומה — לא יחויב כרטיס אמיתי</p>
      <button type="button" disabled={busy} onClick={onApprove} className="sc-btn-primary mt-4 !bg-[var(--sc-accent)]">
        {busy ? 'מאשר…' : 'אשר תשלום (mock)'}
      </button>
    </div>
  );
}
