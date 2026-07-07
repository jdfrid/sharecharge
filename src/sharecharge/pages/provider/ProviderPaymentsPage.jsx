import { useEffect, useState } from 'react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { PaymentLedgerList, PaymentSummaryCards } from '../../components/payment/PaymentLedgerList';
import { Card } from '../../components/ui/Card';

export function ProviderPaymentsPage() {
  const { state, fetchPaymentSummary } = useShareCharge();
  const { hosts, activeHostId, setActiveHostId } = useSyncedProviderHost(state);
  const [summary, setSummary] = useState(null);
  const payments = (state.payments || []).filter((item) => item.hostId === activeHostId);

  useEffect(() => {
    fetchPaymentSummary?.()
      .then(setSummary)
      .catch(() =>
        setSummary({
          count: payments.length,
          earned: payments.reduce((s, p) => s + p.hostShare, 0),
          settled: payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.hostShare, 0),
          pendingPayouts: 0,
        }),
      );
  }, [fetchPaymentSummary, activeHostId, payments.length]);

  return (
    <>
      <Card>
        <label className="block text-sm font-bold text-sc-muted">
          ספק
          <select
            value={activeHostId}
            onChange={(e) => setActiveHostId(e.target.value)}
            className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent)] focus:ring-2 focus:ring-[var(--sc-accent)]/20"
          >
            {hosts.map((host) => (
              <option key={host.id} value={host.id}>
                {host.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <div className="sc-section-head px-0.5">
        <h2 className="text-xl font-black">ריכוז תשלומים · ספק</h2>
      </div>

      <PaymentSummaryCards summary={summary} portal="provider" />

      <Card>
        <p className="text-sm font-bold text-sc-muted">
          העברות לכרטיס/חשבון הספק לאחר חלוקת התשלום — עמלה לפלטפורמה ויתרה לספק.
        </p>
      </Card>

      <PaymentLedgerList payments={payments} />
    </>
  );
}
