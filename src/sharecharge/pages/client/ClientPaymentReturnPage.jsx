import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useShareCharge } from '../../context/ShareChargeContext';
import { Card } from '../../components/ui/Card';

export function ClientPaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshFromApi, state } = useShareCharge();
  const status = params.get('status');
  const paymentId = params.get('paymentId');
  const splitIndex = Number(params.get('splitIndex') || 0);

  useEffect(() => {
    refreshFromApi?.();
  }, [refreshFromApi]);

  useEffect(() => {
    const payment = state.payments?.find((item) => item.id === paymentId);
    const refId = payment?.referenceId;
    if (status !== 'success' || !payment) return;

    const chargeSplits = payment.splits?.filter((s) => s.splitType === 'card_charge') || [];
    const nextPending = chargeSplits.findIndex((s, index) => index > splitIndex && s.status !== 'paid');

    if (payment.status === 'paid' && refId) {
      const timer = setTimeout(() => navigate(`/client/receipt/${refId}`, { replace: true }), 900);
      return () => clearTimeout(timer);
    }

    if (nextPending >= 0 && refId) {
      const timer = setTimeout(
        () => navigate(`/client/payment/${payment.referenceType}/${refId}?split=${nextPending}`, { replace: true }),
        900,
      );
      return () => clearTimeout(timer);
    }
  }, [status, paymentId, splitIndex, state.payments, navigate]);

  return (
    <Card>
      <p className="text-center text-lg font-black text-sc-text">
        {status === 'success' ? 'התשלום התקבל' : 'התשלום לא הושלם'}
      </p>
      <p className="mt-2 text-center text-sm font-bold text-sc-muted">מעבירים אותך הלאה…</p>
    </Card>
  );
}
