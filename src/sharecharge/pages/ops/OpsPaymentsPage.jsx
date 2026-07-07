import { useEffect, useState } from 'react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { PaymentLedgerList, PaymentSummaryCards } from '../../components/payment/PaymentLedgerList';
import { Card } from '../../components/ui/Card';
import { currency } from '../../utils';

export function OpsPaymentsPage() {
  const { state, fetchPaymentSummary } = useShareCharge();
  const [summary, setSummary] = useState(null);
  const payments = state.payments || [];

  useEffect(() => {
    fetchPaymentSummary?.()
      .then(setSummary)
      .catch(() => {
        const paid = payments.filter((p) => p.status === 'paid');
        setSummary({
          count: paid.length,
          volume: paid.reduce((s, p) => s + p.amount, 0),
          platformFees: paid.reduce((s, p) => s + p.platformFee, 0),
          hostPayouts: paid.reduce((s, p) => s + p.hostShare, 0),
          pendingPayouts: 0,
        });
      });
  }, [fetchPaymentSummary, payments.length]);

  return (
    <>
      <div className="sc-section-head px-0.5">
        <h2 className="text-xl font-black">ריכוז תשלומים · מנהל</h2>
      </div>

      <PaymentSummaryCards summary={summary} portal="system" />

      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Tranzila" value={payments.filter((p) => p.gateway === 'tranzila').length} />
          <Stat label="ממתינים" value={payments.filter((p) => p.status === 'pending').length} />
          <Stat label="שולמו" value={payments.filter((p) => p.status === 'paid').length} />
          <Stat label="מחזור כולל" value={currency(summary?.volume || 0)} />
        </div>
      </Card>

      <PaymentLedgerList payments={payments} />
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[var(--sc-radius-sm)] bg-sc-surface p-3">
      <p className="text-[10px] font-bold text-sc-muted">{label}</p>
      <p className="mt-1 font-black text-sc-text">{value}</p>
    </div>
  );
}
