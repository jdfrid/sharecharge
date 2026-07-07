import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { resolveDriverIdForSession } from '../../auth/identity';
import { PaymentLedgerList, PaymentSummaryCards } from '../../components/payment/PaymentLedgerList';
import { Card } from '../../components/ui/Card';

export function ClientPaymentsHubPage() {
  const { state, fetchPaymentSummary } = useShareCharge();
  const [summary, setSummary] = useState(null);
  const myDriverId = useMemo(() => resolveDriverIdForSession(state), [state.users]);
  const payments = (state.payments || []).filter((item) => item.payerId === myDriverId);

  useEffect(() => {
    fetchPaymentSummary?.().then(setSummary).catch(() => setSummary({ count: payments.length, spent: payments.reduce((s, p) => s + (p.status === 'paid' ? p.amount : 0), 0) }));
  }, [fetchPaymentSummary, payments.length]);

  return (
    <>
      <div className="sc-section-head px-0.5">
        <h2 className="text-xl font-black">ריכוז תשלומים</h2>
        <CreditCard size={20} className="text-[var(--sc-accent)]" />
      </div>

      <PaymentSummaryCards summary={summary} portal="client" />

      <Card>
        <p className="text-sm font-bold text-sc-muted">
          כאן מרוכזים כל התשלומים שלך — טעינה, חירום וחלוקה בין כרטיסים.
        </p>
      </Card>

      <PaymentLedgerList payments={payments} detailLinkPrefix="/client/payments" />

      <Link
        to="/client/activity"
        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)] ring-1 ring-sc-border"
      >
        <ChevronLeft size={18} />
        חזרה להזמנות
      </Link>
    </>
  );
}
